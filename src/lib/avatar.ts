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
