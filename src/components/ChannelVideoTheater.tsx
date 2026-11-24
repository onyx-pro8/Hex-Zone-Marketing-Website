import { useEffect, useState } from "react";

const CHANNEL_URL = "https://www.youtube.com/@safezonepatrol";

type ChannelVideo = {
  id: string;
  title: string;
  description: string;
  duration: string;
};

type ChannelPayload = {
  channelUrl?: string;
  videos?: ChannelVideo[];
  available?: boolean;
};

function watchUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

function embedUrl(id: string, autoplay: boolean) {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export function ChannelVideoTheater() {
  const [videos, setVideos] = useState<ChannelVideo[] | null>(null);
  const [channelUrl, setChannelUrl] = useState(CHANNEL_URL);
  const [available, setAvailable] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [autoplay, setAutoplay] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/youtube-videos")
      .then((response) => {
        if (!response.ok) throw new Error("videos unavailable");
        return response.json() as Promise<ChannelPayload>;
      })
      .then((payload) => {
        if (cancelled) return;
        if (payload.channelUrl) setChannelUrl(payload.channelUrl);
        const next = Array.isArray(payload.videos) ? payload.videos : [];
        setAvailable(payload.available !== false);
        setVideos(next);
        setActiveId(next[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setAvailable(false);
          setVideos([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = videos?.find((video) => video.id === activeId) ?? null;

  if (!videos) {
    return (
      <div className="theater" aria-busy="true" aria-live="polite">
        <div className="theater__stage">
          <div className="theater__frame theater__frame--loading" />
        </div>
        <p className="theater__status">Loading channel videos…</p>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="theater theater--empty">
        <a className="theater__launch" href={channelUrl} target="_blank" rel="noreferrer">
          <span className="theater__play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M8.5 6.8v10.4a1 1 0 0 0 1.5.86l8.6-5.2a1 1 0 0 0 0-1.72l-8.6-5.2a1 1 0 0 0-1.5.86Z" />
            </svg>
          </span>
          <span>Watch on YouTube</span>
        </a>
        <p className="theater__status">
          {available
            ? "This channel does not have public videos yet. Open it on YouTube to check again."
            : "Videos from Safe Zone Patrol play in this player. Open the channel on YouTube if the feed is unavailable."}
        </p>
      </div>
    );
  }

  return (
    <div className="theater">
      <div className="theater__stage">
        <iframe
          className="theater__frame"
          src={embedUrl(active.id, autoplay)}
          title={active.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <div className="theater__meta">
          <h3 className="theater__title">{active.title}</h3>
          {active.description ? <p className="theater__text">{active.description}</p> : null}
          <a className="theater__outbound" href={watchUrl(active.id)} target="_blank" rel="noreferrer">
            Watch on YouTube
          </a>
        </div>
      </div>

      <ul className="theater__list list-reset" aria-label="Channel videos">
        {videos.map((video) => {
          const selected = video.id === active.id;
          return (
            <li key={video.id}>
              <button
                type="button"
                className={selected ? "theater__item is-active" : "theater__item"}
                aria-current={selected ? "true" : undefined}
                onClick={() => {
                  setActiveId(video.id);
                  setAutoplay(true);
                }}
              >
                <span className="theater__thumb">
                  <img
                    src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                    alt=""
                    width={120}
                    height={68}
                  />
                  {video.duration ? <span className="theater__duration">{video.duration}</span> : null}
                </span>
                <span className="theater__item-copy">
                  <span className="theater__item-title">{video.title}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
