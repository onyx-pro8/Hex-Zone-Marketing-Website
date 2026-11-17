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
        q: "Is there an API?",
        a: "Paid plans include REST API access with monthly call limits that scale by subscription tier. API documentation is available in the web and mobile apps.",
      },
    ],
  },
  {
    id: "plans",
    label: "Plans & billing",
    items: [
      {
        q: "What is the difference between Family and Organization plans?",
        a: "Family supports up to 10 users and 10 smart-home hubs. Organization tiers add the admin dashboard and step up members, hubs, messaging, Universal Access keys, guest-call minutes, and API limits.",
      },
      {
        q: "Can I switch between monthly and annual billing?",
        a: "Yes. The pricing page compares both intervals. Annual billing typically reduces the effective monthly cost by about 16–17%.",
      },
      {
        q: "Do you offer a Custom plan?",
        a: "Yes. Organization 5 is the largest fixed public tier (up to 2,500 users and 500 smart-home hubs). Custom covers larger capacity and commercial terms agreed with sales.",
      },
      {
        q: "What happens if I outgrow my plan?",
        a: "Upgrade to the next Organization tier, or move to Custom if you need more than Organization 5. Members, hubs, messages, history retention, Universal Access keys, access QR, guest-call minutes, and API calls all scale with the plan.",
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
