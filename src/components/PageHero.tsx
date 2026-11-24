import type { ReactNode } from "react";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  lead: string;
  aside?: ReactNode;
};

export function PageHero({ eyebrow, title, lead, aside }: PageHeroProps) {
  return (
    <section className="page-hero" aria-labelledby="page-hero-title">
      <div
        className={`container page-hero__inner page-hero__inner--split`}
      >
        <div className="page-hero__copy">
          <p className="page-hero__eyebrow">{eyebrow}</p>
          <h1 className="page-hero__title" id="page-hero-title">
            {title}
          </h1>
          <p className="page-hero__lead">{lead}</p>
        </div>
        {aside}
      </div>
    </section>
  );
}
