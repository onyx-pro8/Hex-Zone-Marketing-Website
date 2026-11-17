type VideoTutorialCardProps = {
  title: string;
  description: string;
  duration?: string;
  category?: string;
};

/** Placeholder card for a future tutorial video — layout only, no media yet. */
export function VideoTutorialCard({
  title,
  description,
  duration = "—:—",
  category = "Tutorial",
}: VideoTutorialCardProps) {
  return (
    <article className="video-card">
      <div className="video-card__media">
        <div className="video-card__frame" role="img" aria-label={`${title} video placeholder`}>
          <span className="video-card__play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M8.5 6.8v10.4a1 1 0 0 0 1.5.86l8.6-5.2a1 1 0 0 0 0-1.72l-8.6-5.2a1 1 0 0 0-1.5.86Z" />
            </svg>
          </span>
          <span className="video-card__soon">Video coming soon</span>
          <span className="video-card__duration">{duration}</span>
        </div>
      </div>
      <div className="video-card__body">
        <p className="video-card__meta">
          {category}
          <span aria-hidden="true"> · </span>
          {duration}
        </p>
        <h3 className="video-card__title">{title}</h3>
        <p className="video-card__text">{description}</p>
      </div>
    </article>
  );
}
