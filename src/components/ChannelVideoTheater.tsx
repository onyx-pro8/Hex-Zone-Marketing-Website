import { useState } from "react";
import { CHANNEL_VIDEOS } from "../data/channelVideos";

function watchUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

function embedUrl(id: string) {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    autoplay: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

function posterUrl(id: string, fallback: boolean) {
  return `https://i.ytimg.com/vi/${id}/${fallback ? "hqdefault" : "maxresdefault"}.jpg`;
}

export function ChannelVideoTheater() {
  const [activeId, setActiveId] = useState(CHANNEL_VIDEOS[0].id);
  const [playing, setPlaying] = useState(false);
  const [fallbackPoster, setFallbackPoster] = useState(false);
  const active = CHANNEL_VIDEOS.find((video) => video.id === activeId) ?? CHANNEL_VIDEOS[0];

  function choose(id: string) {
    setActiveId(id);
    setPlaying(false);
    setFallbackPoster(false);
  }

  return (
    <div className="theater">
      <div className="theater__stage">
        {playing ? (
          <iframe
            className="theater__frame"
            src={embedUrl(active.id)}
            title={active.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button type="button" className="theater__poster" onClick={() => setPlaying(true)}>
            <img
              src={posterUrl(active.id, fallbackPoster)}
              alt=""
              width={1280}
              height={720}
              onError={() => setFallbackPoster(true)}
            />
            <span className="theater__poster-play" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M8.5 6.8v10.4a1 1 0 0 0 1.5.86l8.6-5.2a1 1 0 0 0 0-1.72l-8.6-5.2a1 1 0 0 0-1.5.86Z" />
              </svg>
            </span>
            <span className="visually-hidden">Play {active.title}</span>
          </button>
        )}
        <div className="theater__meta">
          <h3 className="theater__title">{active.title}</h3>
          {active.description ? <p className="theater__text">{active.description}</p> : null}
          <a className="theater__outbound" href={watchUrl(active.id)} target="_blank" rel="noreferrer">
            Watch on YouTube
          </a>
        </div>
      </div>

      <ul className="theater__list list-reset" aria-label="More Safe Zone Patrol videos">
        {CHANNEL_VIDEOS.filter((video) => video.id !== active.id).map((video) => (
            <li key={video.id}>
              <button
                type="button"
                className="theater__item"
                onClick={() => choose(video.id)}
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
        ))}
      </ul>
    </div>
  );
}
