const steps = [
  {
    step: "01",
    title: "Define your Neighbourhood",
    text: "Map it. Protect it. Patrol it. Easily create virtual safety zones for homes, campuses, routes, and patrol areas in just minutes.",
  },
  {
    step: "02",
    title: "Connect to your neighbourhood",
    text: "Get your team connected! Invite members, add their devices, and assign roles to keep everyone on the same page.",
  },
  {
    step: "03",
    title: "Hear what matters",
    text: "Know who's where, stay ahead of every movement, and keep your spaces secure with real-time tracking, instant alerts, and easy-to-access activity history.",
  },
  {
    step: "04",
    title: "Keeping Watch. Keeping You Safe",
    text: "Make community security easier. Welcome guests, manage access, and stay connected with your security team from anywhere.",
  },
];

export function HowItWorks() {
  return (
    <section className="how" id="how-it-works" aria-labelledby="how-title">
      <div className="container">
        <div className="section-head how__head">
          <p className="eyebrow">How it works</p>
          <h2 className="section-title" id="how-title">
            From Defining Communities to Providing a Change of Lifestyle
          </h2>
          <p className="section-sub">
            From your front door to your entire community, stay connected and protected.
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
