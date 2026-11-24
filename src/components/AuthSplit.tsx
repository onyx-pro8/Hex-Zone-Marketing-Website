import type { ReactNode } from "react";

type AuthSplitProps = {
  children: ReactNode;
  visualTitle: string;
  visualLead: string;
};

export function AuthSplit({ children, visualTitle, visualLead }: AuthSplitProps) {
  return (
    <main className="auth-split" id="main">
      <section className="auth-split__form" aria-label="Account form">
        <div className="auth-split__form-inner">{children}</div>
      </section>

      <aside className="auth-split__visual" aria-hidden="true">
        <img
          className="auth-split__image"
          src="/assets/auth-panel.jpg?v=4"
          alt=""
          width={1200}
          height={1600}
        />
        <div className="auth-split__veil" />
        <div className="auth-split__caption">
          <p className="auth-split__caption-eyebrow">Safe Zone Patrol</p>
          <p className="auth-split__caption-title">{visualTitle}</p>
          <p className="auth-split__caption-lead">{visualLead}</p>
        </div>
      </aside>
    </main>
  );
}
