const platforms = [
  {
    title: "Web dashboard",
    text: "Set up your neighbourhood, see alerts, and look after your people from your computer.",
  },
  {
    title: "Mobile apps",
    text: "Stay connected on iOS and Android with live status, guest tools, and push alerts.",
  },
  {
    title: "API & SDK",
    text: "Connect Safe Zone Patrol with the tools you already use.",
  },
];

export function Platforms() {
  return (
    <section className="platforms" id="platforms" aria-labelledby="platforms-title">
      <div className="container">
        <div className="section-head platforms__head">
          <p className="eyebrow">Wherever you are</p>
          <h2 className="section-title" id="platforms-title">
            On your computer, your phone, and the tools you already use
          </h2>
          <p className="section-sub">
            Start in one place, then stay connected from the phone and computer you already use.
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
