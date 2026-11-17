import { useState, type FormEvent } from "react";
import { PageCta } from "../components/PageCta";
import { PageHero } from "../components/PageHero";

const topics = [
  "General question",
  "Sales / pricing",
  "Product support",
  "Partnership",
  "Custom plan inquiry",
];

const channels = [
  {
    label: "Sales",
    value: "sales@hexzone.app",
    href: "mailto:sales@hexzone.app",
    note: "Plans, demos, and enterprise scoping",
  },
  {
    label: "Support",
    value: "support@hexzone.app",
    href: "mailto:support@hexzone.app",
    note: "Account, access, and product assistance",
  },
  {
    label: "Response time",
    value: "Within 1–2 business days",
    note: "Priority routing for enterprise inquiries",
  },
];

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main id="main">
      <PageHero
        eyebrow="Company"
        title="Contact"
        lead="Reach the Safe Zone Patrol team for sales, support, partnership, or enterprise planning."
      />

      <section className="page-section page-section--tint" aria-labelledby="contact-form-title">
        <div className="container contact">
          <div className="contact__grid">
            <div className="contact__intro">
              <p className="eyebrow">Get in touch</p>
              <h2 className="section-title" id="contact-form-title">
                Tell us how we can help
              </h2>
              <p className="section-sub contact__lead">
                Share a short brief and the best way to reach you. We route messages to sales or
                support based on the topic you select.
              </p>

              <ul className="contact__channels list-reset" role="list">
                {channels.map((channel) => (
                  <li className="contact__channel" key={channel.label}>
                    <span className="contact__meta-label">{channel.label}</span>
                    {channel.href ? (
                      <a href={channel.href}>{channel.value}</a>
                    ) : (
                      <span className="contact__channel-value">{channel.value}</span>
                    )}
                    <p className="contact__channel-note">{channel.note}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="contact__card">
              {submitted ? (
                <div className="contact__success" role="status">
                  <p className="contact__success-kicker">Received</p>
                  <h3 className="contact__success-title">Thank you for reaching out</h3>
                  <p className="contact__success-text">
                    Your message has been captured. Our team will review the details and follow up
                    using the email you provided.
                  </p>
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={() => setSubmitted(false)}
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form className="contact__form" onSubmit={onSubmit}>
                  <div className="contact__row">
                    <label className="contact__field">
                      <span>First name</span>
                      <input
                        name="firstName"
                        type="text"
                        required
                        autoComplete="given-name"
                        placeholder="Alex"
                      />
                    </label>
                    <label className="contact__field">
                      <span>Last name</span>
                      <input
                        name="lastName"
                        type="text"
                        required
                        autoComplete="family-name"
                        placeholder="Morgan"
                      />
                    </label>
                  </div>
                  <label className="contact__field">
                    <span>Work email</span>
                    <input
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@company.com"
                    />
                  </label>
                  <label className="contact__field">
                    <span>Organization</span>
                    <input
                      name="organization"
                      type="text"
                      autoComplete="organization"
                      placeholder="Company or household name"
                    />
                  </label>
                  <label className="contact__field">
                    <span>Topic</span>
                    <select name="topic" defaultValue={topics[0]}>
                      {topics.map((topic) => (
                        <option key={topic} value={topic}>
                          {topic}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="contact__field">
                    <span>Message</span>
                    <textarea
                      name="message"
                      required
                      rows={5}
                      placeholder="Share goals, timeline, or the issue you need help with."
                    />
                  </label>
                  <p className="contact__fineprint">
                    By submitting, you agree to be contacted about your request. We do not share
                    your details for unrelated marketing.
                  </p>
                  <button className="btn btn--primary contact__submit" type="submit">
                    Send message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <PageCta
        title="Prefer to explore first?"
        text="Review how the platform works, or compare Family and Organization plans before you reach out."
        actions={[
          { to: "/how-it-works", label: "How it works", primary: true },
          { to: "/pricing", label: "View pricing" },
        ]}
      />
    </main>
  );
}
