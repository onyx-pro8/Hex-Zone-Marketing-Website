const audiences = [
  {
    title: "Families & caregivers",
    text: "Stay aware of arrivals, departures, and unexpected movement with calm, actionable alerts.",
  },
  {
    title: "Communities & HOAs",
    text: "Coordinate shared spaces, guest access, and neighborhood awareness without heavy hardware.",
  },
  {
    title: "Security & patrol teams",
    text: "Monitor coverage areas, dispatch faster, and keep a clear record of incidents and responses.",
  },
  {
    title: "Facilities & logistics",
    text: "Authorize site entry, track deliveries, and keep operations moving with zone-based rules.",
  },
];

export function Audiences() {
  return (
    <section className="audiences" id="audiences" aria-labelledby="audiences-title">
      <div className="container">
        <div className="section-head audiences__head">
          <p className="eyebrow">Built for every mission</p>
          <h2 className="section-title" id="audiences-title">
            One platform. Many ways to protect.
          </h2>
          <p className="section-sub">
            Safe Zone Patrol adapts to the people, places, and workflows you already run.
          </p>
        </div>

        <ul className="audiences__grid list-reset" role="list">
          {audiences.map((item) => (
            <li className="audiences__item" key={item.title}>
              <article className="audience-card">
                <h3 className="audience-card__title">{item.title}</h3>
                <p className="audience-card__text">{item.text}</p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
