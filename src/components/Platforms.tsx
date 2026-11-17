const platforms = [
  {
    title: "Web dashboard",
    text: "Configure zones, review alerts, and manage members from a full desktop console.",
  },
  {
    title: "Mobile apps",
    text: "Stay connected on iOS and Android with live status, guest tools, and push alerts.",
  },
  {
    title: "API & SDK",
    text: "Integrate Safe Zone Patrol into your own systems with REST endpoints and API docs.",
  },
];

export function Platforms() {
  return (
    <section className="platforms" id="platforms" aria-labelledby="platforms-title">
      <div className="container">
        <div className="section-head platforms__head">
          <p className="eyebrow">Everywhere you work</p>
          <h2 className="section-title" id="platforms-title">
            Available across web, mobile, and API
          </h2>
          <p className="section-sub">
            Deploy once, then operate from the surfaces your team already uses every day.
          </p>
        </div>

        <ul className="platforms__grid list-reset" role="list">
          {platforms.map((item) => (
            <li className="platforms__item" key={item.title}>
              <article className="platform-card">
                <h3 className="platform-card__title">{item.title}</h3>
                <p className="platform-card__text">{item.text}</p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
