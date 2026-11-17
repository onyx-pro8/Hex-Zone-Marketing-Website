import { useMemo, useState } from "react";
import { PageCta } from "../components/PageCta";
import { PageHero } from "../components/PageHero";

type FaqItem = {
  q: string;
  a: string;
};

type FaqGroup = {
  id: string;
  label: string;
  items: FaqItem[];
};

const groups: FaqGroup[] = [
  {
    id: "product",
    label: "Product",
    items: [
      {
        q: "What is Safe Zone Patrol?",
        a: "Safe Zone Patrol is a geospatial zone-management platform. Create zones, connect members and devices, manage guest access, and respond to alerts from web and mobile.",
      },
      {
        q: "How do zones work?",
        a: "Define zones with geofences or H3 cells, then attach people, devices, and access rules. Monitoring stays tied to the places that matter instead of scattered across disconnected tools.",
      },
      {
        q: "Do you support smart-home hubs?",
        a: "Yes. Hub capacity depends on your plan. The Smart home page covers setup guidance and documentation placeholders for supported workflows.",
      },
      {
        q: "Is there an API or SDK?",
        a: "Paid plans include REST API and mobile SDK access. Monthly call limits scale by subscription tier so usage stays predictable as you grow.",
      },
    ],
  },
  {
    id: "plans",
    label: "Plans & billing",
    items: [
      {
        q: "What is the difference between Family and Organization plans?",
        a: "Family is designed for household sharing with a smaller member cap. Organization plans add admin tooling, higher limits, analytics, and tiered capacity for teams and businesses.",
      },
      {
        q: "Can I switch between monthly and annual billing?",
        a: "Yes. The pricing page compares both intervals. Annual billing typically reduces the effective monthly cost by about 16–17%.",
      },
      {
        q: "How do I get Enterprise pricing?",
        a: "Enterprise is custom. Contact sales with your scale, integration needs, and support requirements so we can propose the right package.",
      },
      {
        q: "What happens if I outgrow my plan?",
        a: "Upgrade to the next Organization tier or speak with sales about Enterprise. Limits for members, devices, hubs, API calls, and messaging all scale with the plan.",
      },
    ],
  },
  {
    id: "access",
    label: "Access & privacy",
    items: [
      {
        q: "Can guests get temporary access?",
        a: "Yes. Guest passes grant time-bound permissions without sharing permanent credentials. Administrators can review and revoke access when a visit ends.",
      },
      {
        q: "Who can see location and alert data?",
        a: "Visibility follows role-based access. Administrators configure what members and guests can view so sensitive information stays limited to people who need it.",
      },
      {
        q: "How are sessions managed?",
        a: "Account holders can manage active web and mobile sessions and revoke access when a device changes hands or is no longer trusted.",
      },
      {
        q: "Where can I learn more about security controls?",
        a: "See the Security & Privacy page for the control framework, platform commitments, and shared responsibilities between Safe Zone Patrol and account holders.",
      },
    ],
  },
];

export function FaqPage() {
  const [activeGroup, setActiveGroup] = useState(groups[0].id);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const current = useMemo(
    () => groups.find((group) => group.id === activeGroup) ?? groups[0],
    [activeGroup],
  );

  function selectGroup(id: string) {
    setActiveGroup(id);
    setOpenIndex(0);
  }

  return (
    <main id="main">
      <PageHero
        eyebrow="Company"
        title="Frequently asked questions"
        lead="Clear answers on product capabilities, plans, access controls, and how Safe Zone Patrol fits households, teams, and organizations."
      />

      <section className="page-section page-section--tint" aria-labelledby="faq-list-title">
        <div className="container faq">
          <div className="section-head">
            <p className="eyebrow">Help center</p>
            <h2 className="section-title" id="faq-list-title">
              Browse by topic
            </h2>
            <p className="section-sub">
              Select a category to find the details you need. If something is missing, contact us
              and we will follow up.
            </p>
          </div>

          <div className="faq-tabs" role="tablist" aria-label="FAQ categories">
            {groups.map((group) => {
              const selected = group.id === activeGroup;
              return (
                <button
                  key={group.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`faq-tabs__btn${selected ? " is-active" : ""}`}
                  onClick={() => selectGroup(group.id)}
                >
                  {group.label}
                </button>
              );
            })}
          </div>

          <ul className="faq__list list-reset" role="list">
            {current.items.map((item, index) => {
              const open = openIndex === index;
              const panelId = `faq-panel-${current.id}-${index}`;
              const buttonId = `faq-button-${current.id}-${index}`;
              return (
                <li className={`faq__item${open ? " is-open" : ""}`} key={item.q}>
                  <h3 className="faq__question">
                    <button
                      id={buttonId}
                      type="button"
                      className="faq__trigger"
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => setOpenIndex(open ? null : index)}
                    >
                      <span>{item.q}</span>
                      <span className="faq__icon" aria-hidden="true">
                        {open ? "−" : "+"}
                      </span>
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="faq__panel"
                    hidden={!open}
                  >
                    <p className="faq__answer">{item.a}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <PageCta
        title="Still looking for an answer?"
        text="Tell us what you need — product details, plan guidance, or an enterprise conversation."
        actions={[
          { to: "/contact", label: "Contact us", primary: true },
          { to: "/pricing", label: "View pricing" },
        ]}
      />
    </main>
  );
}
