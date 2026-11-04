export const metadata = {
  title: "Privacy Policy",
  description:
    "Read the Anarock Privacy Policy to understand how we collect, use, disclose and protect your personal data, and the rights you have in relation to it.",
  alternates: {
    canonical: "/privacy-policy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const CONTACT_EMAIL = "privacy@anarock.com";

/* ------------------------------------------------------------------ */
/* Hero banner (CSS-only, no image file required)                     */
/* ------------------------------------------------------------------ */

const HERO_TOWERS = [
  { left: "3%", width: "7%", top: "0%", color: "#ffffff", opacity: 0.9 },
  { left: "12%", width: "4%", top: "8%", color: "#e9eef6", opacity: 0.8 },
  { left: "26%", width: "8%", top: "0%", color: "#f4f6fa", opacity: 0.9 },
  { left: "36%", width: "6%", top: "12%", color: "#e3e9f3", opacity: 0.85 },
  { left: "44%", width: "9%", top: "0%", color: "#dfe6f1", opacity: 0.9 },
  { left: "54%", width: "3%", top: "28%", color: "#ffffff", opacity: 0.95 },
  { left: "58%", width: "6%", top: "4%", color: "#d7e1ef", opacity: 0.85 },
  { left: "62%", width: "4%", top: "30%", color: "#bcd0ea", opacity: 0.75 },
  { left: "68%", width: "5%", top: "0%", color: "#eef2f8", opacity: 0.9 },
  { left: "74%", width: "4%", top: "40%", color: "#c3d5ee", opacity: 0.7 },
  { left: "77%", width: "3%", top: "6%", color: "#c9daf1", opacity: 0.8 },
  { left: "82%", width: "6%", top: "0%", color: "#f6f8fb", opacity: 0.9 },
  { left: "90%", width: "5%", top: "10%", color: "#dce5f2", opacity: 0.85 },
];

function LegalHero({ title }) {
  return (
    <section className="relative isolate w-full overflow-hidden bg-[#f3f6fa]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,#fbf6ee_0%,#f4f6fa_30%,#eef3f9_60%,#f6f8fb_100%)]"
      />
      <div aria-hidden="true" className="absolute inset-0 blur-[6px]">
        {HERO_TOWERS.map((tower, index) => (
          <span
            key={index}
            className="absolute bottom-0"
            style={{
              left: tower.left,
              width: tower.width,
              top: tower.top,
              backgroundColor: tower.color,
              opacity: tower.opacity,
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.35) 0 2px, transparent 2px 14px)",
            }}
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-white/70 via-white/20 to-transparent"
      />

      <div className="relative mx-auto flex h-[220px] w-full max-w-[1376px] items-end px-4 pb-[28px] sm:h-[240px] sm:px-6 sm:pb-[36px] md:h-[260px] lg:h-[290px] lg:pb-[48px]">
        <h1 className="text-[34px] font-medium leading-none tracking-tight text-[#A054A0] sm:text-[42px] lg:text-[50px]">
          {title}
        </h1>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Reusable building blocks                                           */
/* ------------------------------------------------------------------ */

const BODY_TEXT =
  "text-[15px] leading-[1.55] text-black sm:text-[16px] lg:text-[17px]";

function SectionHeading({ children }) {
  return (
    <h2 className="text-[21px] font-semibold leading-[1.25] text-[#8B3D92] sm:text-[22px] lg:text-[24px]">
      {children}
    </h2>
  );
}

function Paragraph({ children }) {
  return <p className={BODY_TEXT}>{children}</p>;
}

function BulletList({ children }) {
  return <ul className="space-y-[10px]">{children}</ul>;
}

function Bullet() {
  return (
    <span aria-hidden="true" className="flex h-[1.55em] shrink-0 items-center">
      <span className="block h-[6px] w-[6px] bg-[#A054A0] sm:h-[7px] sm:w-[7px]" />
    </span>
  );
}

function BulletItem({ label, separator = " – ", children }) {
  return (
    <li className={`flex gap-3 sm:gap-4 ${BODY_TEXT}`}>
      <Bullet />
      <span className="min-w-0">
        {label ? (
          <>
            <strong className="font-semibold text-black">{label}</strong>
            {separator}
          </>
        ) : null}
        {children}
      </span>
    </li>
  );
}

function SubBulletList({ items }) {
  return (
    <ul className="mt-[8px] space-y-[8px]">
      {items.map((item) => (
        <li key={item} className={BODY_TEXT}>
          • {item}
        </li>
      ))}
    </ul>
  );
}

function ScopeItem({ title, text }) {
  return (
    <div className="space-y-[6px]">
      <div className={`flex gap-3 sm:gap-4 ${BODY_TEXT}`}>
        <Bullet />
        <h3 className="font-semibold text-black">{title}</h3>
      </div>
      <Paragraph>{text}</Paragraph>
    </div>
  );
}

function EmailLink() {
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className="break-all text-[#A054A0] underline-offset-4 hover:underline"
    >
      {CONTACT_EMAIL}
    </a>
  );
}

function Section({ id, title, children }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-28 space-y-[10px]"
    >
      <div id={`${id}-title`}>
        <SectionHeading>{title}</SectionHeading>
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Content                                                            */
/* ------------------------------------------------------------------ */

const SCOPE_ITEMS = [
  {
    title: "Visiting Our Websites and Online Platforms",
    text: "Accessing Anarock-branded websites, social media pages, and other public-facing digital services.",
  },
  {
    title: "Communicating With Us",
    text: "Engaging with us via emails, phone calls, text messages, or faxes.",
  },
  {
    title: "Using Our Products and Services",
    text: "Interacting with our offerings, including as an employee of a customer organization, where we act as the data controller. Please note that certain products or services may require the processing of personal data to function effectively.",
  },
  {
    title: "Accessing Mobile Applications",
    text: "Downloading and using our mobile apps, subject to their respective privacy notices.",
  },
  {
    title: "Participating in Events and Campaigns",
    text: "Showing interest in, registering for, attending, or participating in events, webinars, training sessions, marketing campaigns, or contests organized by Anarock.",
  },
  {
    title: "Visiting Our Offices",
    text: "Entering our physical premises for meetings, events, or other engagements.",
  },
  {
    title: "Accessing Our Content",
    text: "Downloading or subscribing to newsletters, whitepapers, reports, or other informational materials.",
  },
];

const DATA_TYPES = [
  {
    label: "Identification data",
    text: "such as your name, designation, and other identifiers relevant to your role or engagement.",
  },
  {
    label: "Contact data",
    text: "including your email address, phone number, and residential or business address.",
  },
  {
    label: "Geo-location data",
    text: "such as your IP address or device identifiers, where applicable.",
  },
  {
    label: "Communications data",
    text: "including information shared via calls, messages, emails, or other interactions with us.",
  },
];

const DATA_SOURCES = [
  "Publicly available databases and property registries",
  "Real estate agents, brokers, and channel partners",
  "Financial institutions and credit rating agencies",
  "Government authorities and regulatory bodies",
  "Third-party service providers who support our operations",
  "Online platforms and social media (where publicly accessible)",
];

const SERVICES = [
  "Real estate advisory and brokerage services",
  "Property management and leasing solutions",
  "Market research and analytics",
  "Investment and asset management services",
];

const PROCESSING_PURPOSES = [
  "Engaging with you as a representative of our corporate clients",
  "Creating, registering, and maintaining customer accounts",
  "Contacting you regarding services, updates, or inquiries",
  "Maintaining accurate records of authorized representatives",
  "Monitoring and recording communications (e.g., calls) for training and quality assurance",
  "Ensuring the security of our systems and networks",
  "Responding to queries or managing complaints, including monitoring public sentiment on social media",
  "Notifying you of changes to our terms, services, or policies",
  "Complying with applicable laws, regulations, directives, and legal obligations",
  "Exercising legal rights and managing legal proceedings",
  "Enhancing the accuracy of financial and operational reporting",
];

const LEGITIMATE_INTEREST_ITEMS = [
  "Sending service-related or promotional communications",
  "Conducting statistical analysis using anonymised or pseudonymised data",
  "Enhancing our systems and services through training and analytics",
  "Establishing, exercising, or defending legal claims",
];

const SHARING_PARTIES = [
  {
    label: "Group Companies:",
    text: "Within Anarock and its parent or affiliated entities for internal business purposes.",
  },
  {
    label: "Business Partners:",
    text: "To offer direct marketing opportunities (with opt-out options available).",
  },
  {
    label: "Service Providers:",
    text: "Including operational, administrative, data processing, and technology partners who support our service delivery and business operations.",
  },
  {
    label: "Professional Advisors:",
    text: "Such as market researchers, consultants, and legal advisors.",
  },
  {
    label: "Advertising & Social Media Platforms:",
    text: "For targeted marketing, where permitted by you and applicable platform policies.",
  },
  {
    label: "Authorised Third Parties:",
    text: "As explicitly consented by you.",
  },
  {
    label: "Government Authorities & Law Enforcement:",
    text: "As required by law or upon request from regulatory or enforcement bodies, courts, tribunals, or tax authorities in any jurisdiction.",
  },
];

const SECURITY_MEASURES = [
  "Encryption and secure data storage",
  "Access controls and authentication protocols",
  "Confidentiality agreements with employees and third parties",
  "Compliance with applicable data protection laws and internal policies",
];

const MARKETING_CONTENT = [
  "Invitations to seminars, webinars, and events",
  "Updates on new or existing products and services",
  "Promotional offers and opportunities",
];

const USER_RIGHTS = [
  {
    label: "Right to Be Informed",
    text: "You have the right to know how your Personal Data is being collected, used, and shared.",
  },
  {
    label: "Right to Access",
    text: "You may request access to the Personal Data we hold about you.",
  },
  {
    label: "Right to Object",
    text: "You can object to the processing of your Personal Data, in whole or in part, where permitted by law.",
  },
  {
    label: "Right to Rectification",
    text: "You may request correction of inaccurate or incomplete Personal Data.",
  },
  {
    label: "Right to Data Portability",
    text: "You may request that we transfer your Personal Data to another organisation, where technically feasible.",
  },
  {
    label: "Right to Erasure",
    text: "You may request deletion of your Personal Data, subject to legal and contractual obligations.",
  },
  {
    label: "Right to Withdraw Consent",
    text: "Where processing is based on your consent, you may withdraw it at any time. This will not affect the lawfulness of processing carried out before the withdrawal.",
  },
  {
    label: "Right to Opt-Out of Marketing",
    text: "You may opt out of receiving marketing communications from us at any time.",
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function PrivacyPolicyPage() {
  return (
    <>
      <LegalHero title="Privacy Policy" />

      <main className="w-full bg-white">
        <div className="mx-auto w-full max-w-[1376px] px-4 pb-[56px] pt-[36px] sm:px-6 sm:pb-[64px] sm:pt-[44px] lg:pb-[80px] lg:pt-[52px]">
          <div className="space-y-[28px] sm:space-y-[32px] lg:space-y-[36px]">
            <Section id="introduction" title="Introduction: Who We Are">
              <Paragraph>
                This Privacy Policy applies to Anarock Property Consultants
                Limited (Formerly known as Anarock Property Consultants Private
                Limited), including its subsidiaries and affiliated entities
                (collectively referred to as “Anarock Property Consultants
                Limited (Formerly known as Anarock Property Consultants Private
                Limited)”, “Anarock”, “We”, “Us”, or “Our”). As the Data
                Controller of your personal data, unless stated otherwise, we
                are committed to safeguarding your privacy and ensuring the
                protection of your personal information.
              </Paragraph>
              <Paragraph>
                This Policy outlines how we collect, use, disclose, and protect
                your personal data, and informs you of your rights in relation
                to the data we process.
              </Paragraph>
            </Section>

            <Section id="scope" title="Scope of This Privacy Policy">
              <Paragraph>
                This Privacy Policy governs the processing of personal data that
                we collect directly from you or receive from third parties when
                you interact with us through various channels, including but not
                limited to:
              </Paragraph>
              <div className="space-y-[16px] pt-[4px]">
                {SCOPE_ITEMS.map((item) => (
                  <ScopeItem key={item.title} title={item.title} text={item.text} />
                ))}
              </div>
            </Section>

            <Section id="personal-data-collected" title="What Personal Data Do We Collect?">
              <Paragraph>
                We may collect various types of personal data when you engage
                with us as a website visitor, for the purpose of providing
                services, managing relationships as permitted by applicable
                laws.
              </Paragraph>
              <Paragraph>
                In this Privacy Notice, “you” refers to you as an individual, or
                your employees and representatives if you are a company, body
                corporate, or other legal entity. If you provide us with someone
                else’s personal data, you must have their permission and inform
                them of how we will use it.
              </Paragraph>
              <Paragraph>The types of personal data we may collect include:</Paragraph>
              <BulletList>
                {DATA_TYPES.map((item) => (
                  <BulletItem key={item.label} label={item.label}>
                    {item.text}
                  </BulletItem>
                ))}
              </BulletList>
              <Paragraph>
                We may also process sensitive personal data, including financial
                information or biometric data (e.g., voice recordings),
                health-related data, or other special category data, only with
                your explicit consent or where required by law.
              </Paragraph>
            </Section>

            <Section id="how-we-collect" title="How Do We Collect Personal Data?">
              <Paragraph>
                We primarily collect your Personal Data directly from you during
                your interactions with us. However, we may also obtain Personal
                Data from other sources, including but not limited to:
              </Paragraph>
              <BulletList>
                {DATA_SOURCES.map((item) => (
                  <BulletItem key={item}>{item}</BulletItem>
                ))}
              </BulletList>
              <Paragraph>
                These sources help us ensure the accuracy and completeness of
                the data we hold.
              </Paragraph>
            </Section>

            <Section id="why-we-collect" title="Why Do We Collect Your Personal Data?">
              <Paragraph>
                We collect your Personal Data to manage our relationship with
                you or the entity you represent. This enables us to deliver our
                services effectively, which include:
              </Paragraph>
              <BulletList>
                {SERVICES.map((item) => (
                  <BulletItem key={item}>{item}</BulletItem>
                ))}
              </BulletList>
              <Paragraph>
                We process your Personal Data with your consent where required
                by law, or as permitted or mandated by applicable regulations.
              </Paragraph>
              <Paragraph>
                Please note that if you choose not to provide certain Personal
                Data, or object to its processing, we may be unable to offer or
                continue providing our services, especially where such data is
                essential for legal or regulatory compliance.
              </Paragraph>
            </Section>

            <Section id="purposes-of-processing" title="Purposes of Processing">
              <Paragraph>
                We process Personal Data for the following purposes, depending
                on the nature of our relationship with you:
              </Paragraph>
              <BulletList>
                {PROCESSING_PURPOSES.map((item) => (
                  <BulletItem key={item}>{item}</BulletItem>
                ))}
              </BulletList>
            </Section>

            <Section id="lawful-basis" title="Lawful Basis for Processing Your Personal Data">
              <Paragraph>
                At Anarock, we process your Personal Data based on one or more
                of the following lawful grounds:
              </Paragraph>
              <BulletList>
                <BulletItem label="Contractual Obligation:" separator=" ">
                  When processing is necessary to fulfil our contractual
                  commitments to you or the organisation you represent.
                </BulletItem>
                <BulletItem label="Legitimate Interest:" separator=" ">
                  When we have a legitimate business interest in processing your
                  Personal Data, such as:
                  <SubBulletList items={LEGITIMATE_INTEREST_ITEMS} />
                </BulletItem>
                <BulletItem label="Legal Obligation:" separator=" ">
                  When processing is required to comply with applicable laws,
                  regulations, or legal processes.
                </BulletItem>
                <BulletItem label="Consent:" separator=" ">
                  When you have provided explicit consent for specific
                  processing activities. You may withdraw your consent at any
                  time, subject to applicable laws and regulations.
                </BulletItem>
              </BulletList>
            </Section>

            <Section id="sharing" title="Sharing of Your Personal Data">
              <Paragraph>
                We do not sell your Personal Data. However, we may share it with
                trusted parties under strict confidentiality and data protection
                obligations, including:
              </Paragraph>
              <BulletList>
                {SHARING_PARTIES.map((item) => (
                  <BulletItem key={item.label} label={item.label} separator=" ">
                    {item.text}
                  </BulletItem>
                ))}
              </BulletList>
              <Paragraph>
                We take appropriate steps to ensure your Personal Data remains
                secure and confidential when shared.
              </Paragraph>
            </Section>

            <Section id="security" title="Security of Your Personal Data">
              <Paragraph>
                We implement robust technical and organisational measures to
                protect your Personal Data from loss, misuse, unauthorised
                access, disclosure, alteration, or destruction. These include:
              </Paragraph>
              <BulletList>
                {SECURITY_MEASURES.map((item) => (
                  <BulletItem key={item}>{item}</BulletItem>
                ))}
              </BulletList>
            </Section>

            <Section id="direct-marketing" title="Direct Marketing Communications">
              <Paragraph>
                We may use your contact details to send you relevant marketing
                communications via:
              </Paragraph>
              <BulletList>
                <BulletItem>
                  Email, SMS, phone calls, postal mail, mobile apps, or social
                  media
                </BulletItem>
              </BulletList>
              <Paragraph>These communications may include:</Paragraph>
              <BulletList>
                {MARKETING_CONTENT.map((item) => (
                  <BulletItem key={item}>{item}</BulletItem>
                ))}
              </BulletList>
              <Paragraph>
                We may also use aggregated demographic and behavioural data to
                tailor marketing messages to your interests.
              </Paragraph>
              <Paragraph>
                Where permitted, we may share limited data with social media
                platforms to deliver targeted ads (e.g., verifying if you have
                an account to show relevant content).
              </Paragraph>
              <Paragraph>
                You can withdraw your consent or opt out of marketing
                communications at any time by contacting us at: <EmailLink />
              </Paragraph>
            </Section>

            <Section id="changes" title="Changes to This Privacy Notice">
              <Paragraph>
                We may update this Privacy Notice periodically to reflect
                changes in our services, legal requirements, or industry
                practices. Any updates will be published on this page. We will
                not reduce your rights under this Notice without your explicit
                consent.
              </Paragraph>
              <Paragraph>
                This Privacy Statement was last updated on{" "}
                15/10/2025.
              </Paragraph>
            </Section>

            <Section id="your-rights" title="Your Rights Regarding Personal Data">
              <Paragraph>
                At Anarock, we are committed to ensuring transparency and
                protecting your privacy. You have the following rights under
                applicable data protection laws:
              </Paragraph>
              <BulletList>
                {USER_RIGHTS.map((item) => (
                  <BulletItem key={item.label} label={item.label}>
                    {item.text}
                  </BulletItem>
                ))}
              </BulletList>
              <Paragraph>
                If you wish to exercise any of these rights, have questions
                about how we process your Personal Data, or would like to raise
                a concern, please contact our Data Protection Office at:{" "}
                <EmailLink />
              </Paragraph>
            </Section>

            <Section id="data-retention" title="Data Retention">
              <Paragraph>
                We retain your Personal Data for as long as you maintain an
                active relationship with us. After that, we may retain it for a
                period necessary to comply with legal, regulatory, and
                operational requirements. Where retention is no longer
                necessary, we will securely delete, anonymise, or destroy the
                data, either upon your request or at our discretion.
              </Paragraph>
            </Section>

            <Section id="data-transfer" title="Data Transfer">
              <Paragraph>
                Your Personal Data may be stored or processed in India or other
                countries where we or our service providers operate. In such
                cases, we ensure that appropriate safeguards are in place to
                protect your data and that any transfers comply with applicable
                data protection laws.
              </Paragraph>
            </Section>

            <Section id="contact-us" title="Contact Us">
              <Paragraph>
                If you have any questions about this Privacy Notice or how your
                Personal Data is handled, please reach out to our Data
                Protection Office at:
              </Paragraph>
              <Paragraph>
                If you wish to exercise any of these rights, have questions
                about how we use your Personal Data, or would like to raise a
                concern or complaint, please contact us at: <EmailLink />
              </Paragraph>
            </Section>
          </div>
        </div>
      </main>
    </>
  );
}