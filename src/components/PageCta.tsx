import { Link } from "react-router-dom";
import { Icon } from "./Icon";

type CtaAction = {
  to: string;
  label: string;
  primary?: boolean;
};

type PageCtaProps = {
  title: string;
  text: string;
  actions: CtaAction[];
};

export function PageCta({ title, text, actions }: PageCtaProps) {
  return (
    <section className="page-section page-section--tint page-section--cta" aria-label="Next steps">
      <div className="container page-cta">
        <div className="page-cta__copy">
          <h2 className="page-cta__title">{title}</h2>
          <p className="page-cta__text">{text}</p>
        </div>
        <div className="page-cta__actions">
          {actions.map((action) => (
            <Link
              key={action.to + action.label}
              className={action.primary ? "btn btn--primary" : "btn btn--outline"}
              to={action.to}
            >
              {action.label}
              {action.primary ? <Icon id="i-arrow-right" /> : null}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
