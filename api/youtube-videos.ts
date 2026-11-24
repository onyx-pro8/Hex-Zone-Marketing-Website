import type { IncomingMessage, ServerResponse } from "node:http";
import { loadChannelVideos } from "./youtubeChannel.ts";

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  const payload = await loadChannelVideos();
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");
  res.end(JSON.stringify(payload));
}
