type DocGuideCardProps = {
  title: string;
  description: string;
  type?: "PDF" | "Guide" | "Checklist";
  pages?: string;
  /** Optional path once a real file exists, e.g. `/docs/smart-home-setup.pdf` */
  href?: string;
};

/** Placeholder card for a future PDF or written guide. */
export function DocGuideCard({
  title,
  description,
  type = "PDF",
  pages = "— pages",
  href,
}: DocGuideCardProps) {
  const body = (
    <>
      <div className="doc-card__mark" aria-hidden="true">
        <svg viewBox="0 0 48 56" width="40" height="48" fill="none">
          <path
            d="M8 2h22l12 12v38a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4Z"
            fill="currentColor"
            opacity="0.12"
          />
          <path
            d="M30 2v10a2 2 0 0 0 2 2h10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M8 2h22l12 12v38a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M14 28h20M14 36h16M14 44h12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="doc-card__body">
        <p className="doc-card__meta">
          {type}
          <span aria-hidden="true"> · </span>
          {pages}
        </p>
        <h3 className="doc-card__title">{title}</h3>
        <p className="doc-card__text">{description}</p>
        <span className="doc-card__action">
          {href ? "Download" : "Document coming soon"}
          {href ? (
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 4v10m0 0 4-4m-4 4-4-4M5 18h14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </span>
      </div>
    </>
  );

  if (href) {
    return (
      <a className="doc-card doc-card--link" href={href} download>
        {body}
      </a>
    );
  }

  return (
    <article className="doc-card" aria-label={`${title} (coming soon)`}>
      {body}
    </article>
  );
}
