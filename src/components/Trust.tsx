const points = [
  {
    title: "Role-based access",
    text: "Admins, members, and guests only see what they need — nothing more.",
  },
  {
    title: "Encrypted by design",
    text: "Messages and location stay private while they travel between you and your neighbourhood.",
  },
  {
    title: "Audit-ready activity",
    text: "Keep a clear trail of access events, alerts, and responses when you need to review.",
  },
  {
    title: "Privacy-first controls",
    text: "You decide who can see what, and for how long.",
  },
];

export function Trust() {
  return (
    <section className="trust" id="security" aria-labelledby="trust-title">
      <div className="container">
        <div className="section-head trust__head">
          <p className="eyebrow">Security & privacy</p>
          <h2 className="section-title" id="trust-title">
            Trust built into every neighbourhood
          </h2>
          <p className="section-sub">
            Clear protections so families and communities can look out for each other with confidence.
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
