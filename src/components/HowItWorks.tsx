const steps = [
  {
    step: "01",
    title: "Create your neighbourhood",
    text: "Set it up in 3 simple steps, for your home and the street around it.",
  },
  {
    step: "02",
    title: "Connect to your neighbourhood",
    text: "Link your family's devices and home alarm so the right people stay close.",
  },
  {
    step: "03",
    title: "Hear what matters",
    text: "Get a clear alert when something at home or nearby needs you.",
  },
  {
    step: "04",
    title: "Talk with your people",
    text: "Message the people who matter, welcome guests, and stay in touch from your phone.",
  },
];

export function HowItWorks() {
  return (
    <section className="how" id="how-it-works" aria-labelledby="how-title">
      <div className="container">
        <div className="section-head how__head">
          <p className="eyebrow">How it works</p>
          <h2 className="section-title" id="how-title">
            From your home to a connected neighbourhood
          </h2>
          <p className="section-sub">
            A simple path for a household, a street, or a whole community.
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
