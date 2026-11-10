export const metadata = {
  title: "RERA",
  description:
    "View Anarock RERA registration numbers across Indian states and locations.",
  alternates: {
    canonical: "/rera",
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

const RERA_REGISTRATIONS = [
  { state: "Maharashtra", location: "Mumbai", number: "A51900000108" },
  { state: "Maharashtra", location: "Pune", number: "A51900000108" },
  { state: "Maharashtra", location: "Navi Mumbai", number: "A51900000108" },
  { state: "Haryana", location: "Gurgaon", number: "GGM/176/2017/1R/286/EXT1/2022/47" },
  { state: "West Bengal", location: "Kolkata", number: "HIRA/KOL/2018/000049" },
  { state: "Karnataka", location: "Bangalore", number: "PRM/KA/RERA/1251/446/AG/171110/000554" },
  { state: "Tamilnadu", location: "Chennai", number: "TNRERA/286/2017" },
  { state: "Telangana", location: "Hyderabad", number: "A02500000028" },
  { state: "Uttar Pradesh", location: "Noida", number: "UPRERAAGT10265" },
  { state: "Punjab", location: "Punjab", number: "PBRERA-OTHER-REA0005" },
  { state: "Gujarat", location: "Ahmedabad", number: "AA00650/270823R1" },
  { state: "Delhi", location: "Delhi", number: "DLRERA2018A00047" },
  { state: "Andra Pradesh", location: "Andra Pradesh", number: "A01042100138" },
  { state: "Chandigarh", location: "Chandigarh", number: "23/3/95-RERA-2020/378" },
  { state: "Goa", location: "Goa", number: "AGG003210812" },
  { state: "Jharkhand", location: "Jharkhand", number: "JHARERA/AGENT/REG/2935/2022" },
];

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReraPage() {
  return (
    <>
      <LegalHero title="RERA" />

      <main className="w-full bg-white">
        <div className="mx-auto w-full max-w-[1376px] px-4 pb-[56px] pt-[36px] sm:px-6 sm:pb-[64px] sm:pt-[44px] lg:pb-[4rem] lg:pt-[2.6rem]">
          {/* Tablet and desktop: table */}
          <div className="hidden overflow-hidden border border-black/10 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] md:block">
            <table className="w-full table-fixed border-collapse text-left">
              <caption className="sr-only">
                Anarock RERA registration numbers by state and location
              </caption>
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[22%]" />
                <col className="w-[56%]" />
              </colgroup>
              <thead className="bg-[#A054A0] text-white">
                <tr>
                  {["State", "Location", "RERA Registration No."].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-5 py-4 text-[13px] font-semibold uppercase tracking-[0.08em] lg:px-7 lg:py-[0.9rem] lg:text-[length:max(13px,0.75rem)]"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RERA_REGISTRATIONS.map((row, index) => (
                  <tr
                    key={`${row.state}-${row.location}`}
                    className={`border-b border-black/10 last:border-b-0 ${index % 2 === 1 ? "bg-[#fafafa]" : "bg-white"}`}
                  >
                    <td className="px-5 py-4 text-[15px] text-black lg:px-7 lg:py-[0.9rem] lg:text-[length:max(15px,0.85rem)]">
                      {row.state}
                    </td>
                    <td className="px-5 py-4 text-[15px] text-black lg:px-7 lg:py-[0.9rem] lg:text-[length:max(15px,0.85rem)]">
                      {row.location}
                    </td>
                    <td className="break-words px-5 py-4 text-[15px] font-semibold text-[#111111] lg:px-7 lg:py-[0.9rem] lg:text-[length:max(15px,0.85rem)]">
                      {row.number}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <ul className="space-y-[12px] md:hidden" aria-label="Anarock RERA registration numbers">
            {RERA_REGISTRATIONS.map((row) => (
              <li
                key={`${row.state}-${row.location}`}
                className="overflow-hidden border border-black/10 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.05)]"
              >
                <div className="flex items-center justify-between gap-3 bg-[#A054A0] px-4 py-2.5 text-white">
                  <span className="text-[13px] font-semibold uppercase tracking-[0.08em]">
                    {row.state}
                  </span>
                  <span className="text-right text-[12px] font-medium text-white/90">
                    {row.location}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A054A0]">
                    RERA Registration No.
                  </p>
                  <p className="mt-1 break-all text-[15px] font-semibold text-[#111111]">
                    {row.number}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}