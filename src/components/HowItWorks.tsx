const steps = [
  {
    step: "01",
    title: "Define your zones",
    text: "Draw geofences or assign H3 cells for homes, campuses, routes, and patrol areas in minutes.",
  },
  {
    step: "02",
    title: "Connect people & devices",
    text: "Invite members, register devices, and set roles so everyone sees the right zone context.",
  },
  {
    step: "03",
    title: "Monitor in real time",
    text: "Track presence, receive alerts, and review activity as people and assets move through zones.",
  },
  {
    step: "04",
    title: "Control access & respond",
    text: "Issue guest passes, manage permissions, and coordinate responses from web or mobile.",
  },
];

export function HowItWorks() {
  return (
    <section className="how" id="how-it-works" aria-labelledby="how-title">
      <div className="container">
        <div className="section-head how__head">
          <p className="eyebrow">How it works</p>
          <h2 className="section-title" id="how-title">
            From zone setup to live protection
          </h2>
          <p className="section-sub">
            A clear workflow that scales from a single household to multi-site operations.
          </p>
        </div>

        <ol className="how__grid list-reset" role="list">
          {steps.map((item) => (
            <li className="how__item" key={item.step}>
              <article className="how-card">
                <span className="how-card__step" aria-hidden="true">
                  {item.step}
                </span>
                <h3 className="how-card__title">{item.title}</h3>
                <p className="how-card__text">{item.text}</p>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
