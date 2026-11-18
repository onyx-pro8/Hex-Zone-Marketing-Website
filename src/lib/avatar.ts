import { useEffect, useState } from "react";
import { API_BASE_URL, getStoredToken } from "./api/client";

export function absolutizeAvatarUrl(url: string): string {
  const trimmed = url.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  const base = API_BASE_URL.replace(/\/+$/, "");
  return `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

export function initialsFor(
  name?: string | null,
  email?: string | null,
): string {
  const fromName = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  if (fromName) return fromName;
  const fromEmail = String(email ?? "").trim()[0];
  return fromEmail ? fromEmail.toUpperCase() : "U";
}

/** Resolve a profile avatar URL that may require a bearer token. */
export function useAuthenticatedAvatarSrc(avatarUrl?: string | null) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const raw = avatarUrl?.trim() || "";
    if (!raw) {
      setSrc(null);
      return;
    }
    if (raw.startsWith("data:")) {
      setSrc(raw);
      return;
    }

    const absolute = absolutizeAvatarUrl(raw);
    const token = getStoredToken();
    let objectUrl: string | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(absolute, {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) {
          if (!cancelled) setSrc(null);
          return;
        }
        const blob = await response.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setSrc(null);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [avatarUrl]);

  return src;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        reject(new Error("Could not read image."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

const BLACK_BG_HARD = 36;
const BLACK_BG_SOFT = 58;

/** Key solid near-black logo plates to transparency for avatar previews. */
export async function clearBlackAvatarBackground(
  dataUrl: string,
): Promise<string> {
  if (typeof document === "undefined") return dataUrl;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not decode image."));
    el.src = dataUrl;
  });

  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (width < 2 || height < 2) return dataUrl;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(image, 0, 0);
  const frame = ctx.getImageData(0, 0, width, height);
  const { data } = frame;

  const cornerIndexes = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + (width - 1)) * 4,
  ];
  const nearBlackCorners = cornerIndexes.filter((index) => {
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;
    const a = data[index + 3] ?? 255;
    return a < 8 || (r <= BLACK_BG_HARD && g <= BLACK_BG_HARD && b <= BLACK_BG_HARD);
  }).length;
  if (nearBlackCorners < 3) return dataUrl;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const a = data[i + 3] ?? 255;
    if (a === 0) continue;
    const brightest = Math.max(r, g, b);
    if (brightest <= BLACK_BG_HARD) {
      data[i + 3] = 0;
    } else if (brightest < BLACK_BG_SOFT) {
      data[i + 3] = Math.round(
        (a * (brightest - BLACK_BG_HARD)) / (BLACK_BG_SOFT - BLACK_BG_HARD),
      );
    }
  }
  ctx.putImageData(frame, 0, 0);
  return canvas.toDataURL("image/png");
}
