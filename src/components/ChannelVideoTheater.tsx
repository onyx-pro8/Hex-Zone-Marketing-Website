import { useState } from "react";
import { CHANNEL_VIDEOS } from "../data/channelVideos";

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
  const [activeId, setActiveId] = useState(CHANNEL_VIDEOS[0].id);
  const [autoplay, setAutoplay] = useState(false);
  const active = CHANNEL_VIDEOS.find((video) => video.id === activeId) ?? CHANNEL_VIDEOS[0];

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

      <ul className="theater__list list-reset" aria-label="Safe Zone Patrol videos">
        {CHANNEL_VIDEOS.map((video) => {
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
