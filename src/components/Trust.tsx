const points = [
  {
    title: "Role-based access",
    text: "Admins, members, and guests only see what they need — nothing more.",
  },
  {
    title: "Encrypted by design",
    text: "Traffic is protected in transit so location and account data stay confidential.",
  },
  {
    title: "Audit-ready activity",
    text: "Keep a clear trail of access events, alerts, and responses when you need to review.",
  },
  {
    title: "Privacy-first controls",
    text: "Tune visibility, retention, and guest permissions to match your policy — not the other way around.",
  },
];

export function Trust() {
  return (
    <section className="trust" id="security" aria-labelledby="trust-title">
      <div className="container">
        <div className="section-head trust__head">
          <p className="eyebrow">Security & privacy</p>
          <h2 className="section-title" id="trust-title">
            Trust built into every zone
          </h2>
          <p className="section-sub">
            Professional-grade controls so families, teams, and organizations can operate with confidence.
          </p>
        </div>

        <ul className="trust__grid list-reset" role="list">
          {points.map((item) => (
            <li className="trust__item" key={item.title}>
              <article className="trust-card">
                <h3 className="trust-card__title">{item.title}</h3>
                <p className="trust-card__text">{item.text}</p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
