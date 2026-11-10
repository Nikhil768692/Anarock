import Link from "next/link";

export const metadata = {
  title: "Terms of Use",
  description:
    "Read the terms of use and disclaimers that govern your access to and use of the Anarock website.",
  alternates: {
    canonical: "/terms-of-use",
  },
  robots: {
    index: true,
    follow: true,
  },
};

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

      <div className="relative mx-auto flex h-[220px] w-full max-w-[1376px] items-end px-4 pb-[28px] sm:h-[240px] sm:px-6 sm:pb-[36px] md:h-[260px] lg:h-[14.5rem] lg:pb-[2.4rem]">
        <h1 className="text-[34px] font-medium leading-none tracking-tight text-[#A054A0] sm:text-[42px] lg:text-[2.5rem]">
          {title}
        </h1>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Content                                                            */
/* ------------------------------------------------------------------ */

const INTRO_TEXT = "Please read the following terms of use and disclaimers carefully before using this web site.";

const PRIVACY_POLICY_PHRASE = "Privacy Policy.";

const TERMS_SECTIONS = [
  {
    id: "acceptance-of-terms",
    title: "Acceptance of Terms",
    paragraphs: [
      "Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) maintains this Website (the \"Site\") for your personal use. Your access to and use of this Site is subject to the following Terms of Use. Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) reserves the right to update these Terms of Use at any time without notice to you. The most current version of the Terms of Use may be accessed by clicking on the \"Terms of Use\" hypertext link located at the bottom of the Site. By choosing to use this Site, you accept and acknowledge, without limitation or qualification, these Terms of Use. However, if you do NOT agree to these Terms of Use, please DO NOT use this Site.",
    ],
  },
  {
    id: "accuracy-and-completeness-of-information",
    title: "Accuracy and Completeness of Information",
    paragraphs: [
      "While Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) endeavors to provide the updated and reliable information in this Site, Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) makes no warranties or representations as to the accuracy, correctness, reliability or otherwise with respect to such information, and assumes no liability or responsibility for any omissions or errors in the content of the information provided on this Site.",
    ],
  },
  {
    id: "modification-of-site",
    title: "Modification of Site",
    paragraphs: [
      "Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) retains the right at all times at its sole discretion to periodically revise the information, services and resources provided on this Site and reserves the right to make such further changes, as it deems fit and proper, without any obligation to notify past, current or prospective visitors.",
    ],
  },
  {
    id: "your-use-of-the-site",
    title: "Your Use of the Site",
    paragraphs: [
      "You may download the contents from this Site exclusively for purpose of non-commercial and personal use only, provided the copyright, trademark or other proprietary notices remain unchanged, un-altered and are visible at all times to the readers. Using our services does not give you ownership of any intellectual property rights in our services or the content you access on the Site. You further agree that no right, title or interest in the content of any downloaded materials is transferred to you as a result of any such act of downloading and/or copying. You also agree that you will not otherwise copy, modify, alter, display, distribute, sell, broadcast or transmit any materials provided on the Site in any manner without the prior written permission of Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited).",
    ],
  },
  {
    id: "no-unlawful-or-prohibited-use",
    title: "No Unlawful or Prohibited Use",
    paragraphs: [
      "As a condition of your use of the Site, you will not use the Site for any purpose that is unlawful and/or prohibited by these Terms of Use or any applicable laws including but not limited to the Information Technology Act & Rules, 2002 as may be amended from time to time.",
    ],
  },
  {
    id: "unsolicited-submissions",
    title: "Unsolicited Submissions",
    paragraphs: [
      "Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) does not accept or consider any creative ideas, suggestions or materials from the public (\"Submissions\"), therefore, you are encouraged not make any Submissions to Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited). However, if you should choose to send us a Submission, then you shall waive and grant to us all such rights and title in the said Submission and such Submission will be considered a non-confidential and non-proprietary information and shall immediately become the property of Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited). Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) shall exclusively thereafter own all rights, title and interest in the said Submissions. Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) at its discretion will be free to use, host, store, reproduce, modify, create derivative works (such as those resulting from adaptations or other changes we make so that your Submissions works better with our services), communicate, publish, publicly perform, publicly display and distribute such Submissions.",
    ],
  },
  {
    id: "privacy-policy",
    title: "Privacy Policy",
    paragraphs: [
      "Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) use of any personal data you submit to the Site is governed by the Site's Privacy Policy.",
    ],
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    paragraphs: [
      "Other than as expressly set out in these terms, the website and its contents are provided on an \"as is\" basis. Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) expressly disclaims all warranties, including the warranties of merchantability, fitness for a particular purpose and non-infringement. Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) disclaims all responsibility for any loss, injury, claim, liability or damage of any kind resulting from, arising out of or any way related to (a) any errors in or omissions from this website and the content, including but not limited to technical inaccuracies and typographical errors, (b) any third party web sites or content therein directly or indirectly accessed through links in this website, including but not limited to any errors in or omissions therefrom, (c) the unavailability of the website or any portion thereof, (d) your use of this website or (e) your use of any equipment or software in connection with the website.",
    ],
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    paragraphs: [
      "In no event and under no legal or equitable theory, whether in tort, contract, strict liability or otherwise, shall Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) be liable for any direct, indirect, special, exemplary, or punitive, incidental or consequential damages arising out of any use of the information contained herein, including, without limitation, damages for lost profits, revenues, financial losses, loss of goodwill or reputation, loss of data, work stoppage, accuracy of results, or computer failure or malfunction.",
    ],
  },
  {
    id: "indemnification",
    title: "Indemnification",
    paragraphs: [
      "You agree and acknowledge to defend, indemnify and hold Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) and its affiliates, officers, agents, and employees harmless from and against any and all claims, losses, suits, damages, litigation costs and expenses or actions, and attorney's fees, arising from a third party(s) claim, and/or related to your use of the Site or violation of these terms.",
    ],
  },
  {
    id: "copyright-notice",
    title: "Copyright Notice",
    paragraphs: [
      "Unless otherwise noted, the graphic images, buttons and text contained in this Site are the exclusive property of Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) and its subsidiaries. Except for personal use, these items may not be copied, distributed, displayed, reproduced, or transmitted, in any form or by any means, electronic, mechanical, photocopying, recording, or otherwise without prior written permission of Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited). The copyright in the materials provided in the Site is vested with Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited).",
    ],
  },
  {
    id: "trademarks",
    title: "Trademarks",
    paragraphs: [
      "This Site features logos, brand identities and other trademarks and service marks (collectively, the \"Marks\") are the property of, or are licensed to Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) and its subsidiaries. Nothing contained on this Site should be construed as granting, by implication, estoppel, or otherwise, any license or right to use any Mark displayed on this Site without prior written permission of Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) and/or any such third party(s) that may own a Mark displayed on the Site.",
    ],
  },
  {
    id: "links-to-third-party-sites",
    title: "Links to Third Party Sites",
    paragraphs: [
      "As a convenience to users, this Site may link to other sites owned and operated by third parties and not maintained by Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited). However, even if such third parties are affiliated with Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited), Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) has no control over these linked sites. The content of the site is the sole responsibility of such third parties that makes it available. Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) is not responsible for the contents of the materials of any linked sites and does not make any representations or warranties regarding the content or accuracy of material on such sites. Viewing such third-party sites is entirely at your own consent and risk.",
    ],
  },
  {
    id: "cautionary-language-regarding-forward-looking-statements",
    title: "Cautionary Language Regarding Forward-Looking Statements",
    paragraphs: [
      "This Site may contain statements, estimates or projections that constitute \"forward-looking statements\" as defined under U.S. federal securities laws. Any such forward looking statements are inherently speculative and are based on currently available information, operating plans and projections about future events and trends. As such, they are subject to numerous risks and uncertainties. Actual results and performance may be significantly different from Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) historical experience and our present expectations or projections. Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) undertakes no obligation to publicly update or revise any forward-looking statements.",
    ],
  },
  {
    id: "jurisdiction",
    title: "Jurisdiction",
    paragraphs: [
      "Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) maintains and operates this Site from its offices in Mumbai, India. These Terms of Use are governed and interpreted under the local laws of Mumbai, India. By using this Site you consent to the jurisdiction of the courts located in Mumbai for any action and/or claims arising from these Terms of Use. If any portion of these Terms of Use is deemed unlawful, void or unenforceable, then that part shall be deemed severable and shall be construed in accordance with applicable law. Such a term will not affect the validity and enforceability of any remaining provisions. Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) failure to act with respect to a breach of these Terms of Use by you or others does not constitute a waiver and shall not limit Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) rights with respect to such breach or any subsequent breaches.",
    ],
  },
  {
    id: "data-records",
    title: "Data Records",
    paragraphs: [
      "Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) maintains and operates project websites and landing pages of partner developers. By exercising the option to access such websites and providing your personal information on it, which are collected for the purpose of providing residential real estate services by us, you waive off your right to Do Not Disturb as may be registered with your individual telecom service providers and grant Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) the right to access, store and use these personal details and further, consent Anarock Property Consultants to reach out to you directly. All the voice conversation carried out between you and the employees of Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited) and/or such other third party(s) as may be engaged by Anarock Property Consultants Limited (Formerly known as Anarock Property Consultants Private Limited), may also be monitored and recorded for record-keeping, training and quality-assurance purposes.",
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Reusable building blocks                                           */
/* ------------------------------------------------------------------ */

const BODY_TEXT =
  "text-[15px] leading-[1.55] text-black sm:text-[16px] lg:text-[length:max(15px,0.85rem)]";

function renderParagraph(text) {
  // Link the closing "Privacy Policy." reference to the Privacy Policy page.
  if (!text.endsWith(PRIVACY_POLICY_PHRASE)) {
    return text;
  }

  const before = text.slice(0, -PRIVACY_POLICY_PHRASE.length);

  return (
    <>
      {before}
      <Link
        href="/privacy-policy"
        className="text-[#A054A0] underline-offset-4 hover:underline"
      >
        Privacy Policy
      </Link>
      .
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function TermsOfUsePage() {
  return (
    <>
      <LegalHero title="Terms of Use" />

      <main className="w-full bg-white">
        <div className="mx-auto w-full max-w-[1376px] px-4 pb-[56px] pt-[36px] sm:px-6 sm:pb-[64px] sm:pt-[44px] lg:pb-[4rem] lg:pt-[2.6rem]">
          <p className="mb-[24px] text-[16px] font-medium leading-[1.5] text-black sm:mb-[28px] sm:text-[17px] lg:text-[length:max(17px,0.95rem)]">
            {INTRO_TEXT}
          </p>

          <div className="space-y-[28px] sm:space-y-[32px] lg:space-y-[1.8rem]">
            {TERMS_SECTIONS.map((section) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-title`}
                className="scroll-mt-28 space-y-[10px]"
              >
                <h2
                  id={`${section.id}-title`}
                  className="text-[21px] font-semibold leading-[1.25] text-[#8B3D92] sm:text-[22px] lg:text-[length:max(22px,1.2rem)]"
                >
                  {section.title}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className={BODY_TEXT}>
                    {renderParagraph(paragraph)}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}