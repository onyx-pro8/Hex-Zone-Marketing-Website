export const CHANNEL_URL = "https://www.youtube.com/@safezonepatrol";
const CHANNEL_VIDEOS_URL = "https://www.youtube.com/@safezonepatrol/videos";

export type ChannelVideo = {
  id: string;
  title: string;
  description: string;
  duration: string;
};

export type ChannelPayload = {
  channelUrl: string;
  videos: ChannelVideo[];
  available: boolean;
};

const CACHE_MS = 30 * 60 * 1000;
let cache: { at: number; payload: ChannelPayload } | null = null;

function textOf(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return "";
  const record = value as { simpleText?: unknown; runs?: { text?: unknown }[] };
  if (typeof record.simpleText === "string") return record.simpleText;
  if (Array.isArray(record.runs)) {
    return record.runs.map((run) => (typeof run?.text === "string" ? run.text : "")).join("");
  }
  return "";
}

function extractInitialData(html: string): unknown | null {
  const at = html.indexOf("ytInitialData");
  if (at < 0) return null;
  const start = html.indexOf("{", at);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i += 1) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function collectVideos(node: unknown, videos: ChannelVideo[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectVideos(item, videos);
    return;
  }
  const record = node as Record<string, unknown>;
  const id = typeof record.videoId === "string" ? record.videoId : "";
  const title = textOf(record.title).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(id) && title.length > 1) {
    if (!videos.some((video) => video.id === id)) {
      videos.push({
        id,
        title,
        description: textOf(record.descriptionSnippet).trim() || textOf(record.description).trim(),
        duration: textOf(record.lengthText).trim(),
      });
    }
  }
  for (const value of Object.values(record)) collectVideos(value, videos);
}

export async function loadChannelVideos(): Promise<ChannelPayload> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.payload;

  const unavailable: ChannelPayload = { channelUrl: CHANNEL_URL, videos: [], available: false };
  try {
    const response = await fetch(CHANNEL_VIDEOS_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: "CONSENT=YES+cb; SOCS=CAI",
      },
    });
    if (!response.ok) return unavailable;
    const html = await response.text();
    const data = extractInitialData(html);
    if (!data) return unavailable;
    const videos: ChannelVideo[] = [];
    collectVideos(data, videos);
    const payload: ChannelPayload = {
      channelUrl: CHANNEL_URL,
      videos: videos.slice(0, 12),
      available: true,
    };
    cache = { at: Date.now(), payload };
    return payload;
  } catch {
    return unavailable;
  }
}
