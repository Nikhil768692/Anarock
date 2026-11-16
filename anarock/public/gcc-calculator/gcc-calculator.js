/* GCC Business Case Calculator (logic from gcc-calculator-embed.html).
   The page calls window.initGccCalculator() once the markup is on screen. */
window.initGccCalculator = function initGccCalculator() {
  var root = document.getElementById("gcc-calc");
  if (!root || root.dataset.gccReady === "1") return;
  root.dataset.gccReady = "1";

"use strict";


/* ============================ BENCHMARKS ============================ */

const ROLES = [
  {id:"aiml",  n:"AI/ML Engineer",       india:53000, hm:1.35, d:4},
  {id:"ds",    n:"Data Scientist",       india:50000, hm:1.25, d:0},
  {id:"data",  n:"Data Engineer",        india:43000, hm:1.10, d:3},
  {id:"be",    n:"Backend Engineer",     india:39500, hm:1.00, d:6},
  {id:"fs",    n:"Full-stack Engineer",  india:39500, hm:1.00, d:4},
  {id:"fe",    n:"Frontend Engineer",    india:35000, hm:0.92, d:3},
  {id:"dev",   n:"Cloud / DevOps / SRE", india:45000, hm:1.12, d:3},
  {id:"qa",    n:"QA / SDET",            india:29000, hm:0.75, d:3},
  {id:"pm",    n:"Product Manager",      india:55000, hm:1.15, d:1},
  {id:"em",    n:"Engineering Manager",  india:72000, hm:1.35, d:2}
];

const LOCS = {
  usw:{n:"US — West Coast",       base:186000, inf:.035, rent:72},
  use:{n:"US — East Coast",       base:167000, inf:.035, rent:76},
  usc:{n:"US — Central / Midwest",base:143000, inf:.033, rent:34},
  uk :{n:"UK — London",           base:128000, inf:.040, rent:112},
  ukr:{n:"UK — Regional",         base:101000, inf:.040, rent:46},
  eu :{n:"EU — Western Europe",   base:124000, inf:.035, rent:58},
  nor:{n:"Nordics",               base:130000, inf:.033, rent:52},
  ca :{n:"Canada",                base:117000, inf:.033, rent:38},
  anz:{n:"Australia / NZ",        base:126000, inf:.035, rent:55},
  sg :{n:"Singapore",             base:133000, inf:.040, rent:105}
};

const CITIES = {
  blr:{n:"Bengaluru",  m:1.00, rent:15.4},
  hyd:{n:"Hyderabad",  m:0.94, rent:10.9},
  ncr:{n:"NCR / Gurugram", m:0.97, rent:14.7},
  pun:{n:"Pune",       m:0.91, rent:11.4},
  che:{n:"Chennai",    m:0.89, rent:10.5},
  mum:{n:"Mumbai",     m:1.06, rent:22.3},
  t2 :{n:"Tier-2 (Coimbatore, Indore, Jaipur)", m:0.74, rent:7.3}
};

const SEN = {
  del:{n:"Delivery-weighted — junior heavy", m:0.82},
  bal:{n:"Balanced — mostly mid-level",      m:1.00},
  sr :{n:"Senior-weighted — owns outcomes",  m:1.32},
  coe:{n:"Centre of excellence — staff/lead",m:1.60}
};

const OPS = {
  direct:{n:"Own entity (direct)",  fixed:185000, it:2400, fitShare:1.0, margin:0,    xfer:0,
          h:"Full control and IP. Slowest to stand up — 4–7 months for entity, banking and statutory registration."},
  bot:   {n:"Build–Operate–Transfer",fixed:60000,  it:1200, fitShare:0.35, margin:.14, xfer:24,
          h:"Live in ~10 weeks. Partner margin until transfer, then a buyout fee at month 24."},
  eor:   {n:"EOR / managed staffing",fixed:15000,  it:900,  fitShare:0,   margin:.19,  xfer:0,
          h:"Fastest and lowest risk. Margin never goes away, so it loses to entity past ~year 3."}
};


/* Desk ratio by workplace model — the single biggest driver of occupancy cost,
   and the reason a remote home team has almost no real estate to save. */
const WS = {
  o5 :{n:"In office, five days", r:1.00},
  h3 :{n:"Hybrid — three days in", r:0.75},
  h2 :{n:"Hybrid — two days in",  r:0.60},
  rem:{n:"Remote-first",          r:0.15}
};

/* How much home occupancy you can actually shed. Signing a GCC lease does not
   cancel the one you already have. */
const LEASE = {
  no  :{n:"No — locked in, no sublet",              r:0},
  part:{n:"Partly — sublet or consolidate floors",  r:0.5},
  yes :{n:"Yes — flexible space or lease expiring", r:1.0}
};

/* editable assumptions */
const ASM = [
  {id:"inrDep",  n:"INR depreciation vs USD",   v:2.5, suf:"%/yr", step:.5, min:-3, max:8},
  {id:"attrCost",n:"Cost to replace one leaver",v:32,  suf:"% of annual cost", step:1, min:0, max:80},
  {id:"prodLag", n:"Months to full productivity",v:4,  suf:"months", step:1, min:0, max:12},
  {id:"kt",      n:"Knowledge transfer per head",v:3500,suf:"USD", step:500, min:0, max:20000},
  {id:"sev",     n:"Severance per released head",v:25, suf:"% of annual cost", step:5, min:0, max:100},
  {id:"advisory",n:"Advisory / setup consulting", v:75000, suf:"USD", step:5000, min:0, max:500000},
  {id:"reEsc",   n:"India rent escalation",       v:5,   suf:"%/yr", step:.5, min:0, max:15}
];

/* ============================ STATE ============================ */

const S = {
  counts:ROLES.reduce(function(a,r){a[r.id]=r.d;return a;},{}),
  loc:"usw", city:"blr", sen:"bal", op:"direct", mode:"replace",
  sub:1.15, ramp:12, overlap:3, attr:17, winf:9.5, gov:8, hz:60,
  indiaOv:{}, hmOv:{},
  wsIn:"o5", wsHome:"h3", lease:"part", leaseLag:12,
  re:{rentIn:null, rentHome:null, sqftIn:95, sqftHome:165, opexIn:1600, opexHome:2000, fitIn:2900},
  asm:ASM.reduce(function(a,x){a[x.id]=x.v;return a;},{})
};

/* ============================ MODEL ============================ */

/* per-role benchmark lookups, honouring user overrides */
const rIndia = (s,r)=> (s.indiaOv && s.indiaOv[r.id]!=null) ? s.indiaOv[r.id] : r.india;
const rHm    = (s,r)=> (s.hmOv    && s.hmOv[r.id]!=null)    ? s.hmOv[r.id]    : r.hm;

/* Occupancy cost per seat per year, both sides.
   rent x space x desk ratio, plus the running costs a lease does not cover. */
function occupancy(s){
  const R=s.re;
  const rentIn  = (R.rentIn   != null) ? R.rentIn   : CITIES[s.city].rent;
  const rentHm  = (R.rentHome != null) ? R.rentHome : LOCS[s.loc].rent;
  const ratioIn = WS[s.wsIn].r, ratioHm = WS[s.wsHome].r;
  const sqIn = R.sqftIn*ratioIn, sqHm = R.sqftHome*ratioHm;
  return {
    india:{rent:rentIn, sqft:R.sqftIn, ratio:ratioIn, eff:sqIn,
           lease:rentIn*sqIn, opex:R.opexIn,  total:rentIn*sqIn + R.opexIn, fitout:R.fitIn},
    home :{rent:rentHm, sqft:R.sqftHome, ratio:ratioHm, eff:sqHm,
           lease:rentHm*sqHm, opex:R.opexHome, total:rentHm*sqHm + R.opexHome, fitout:null}
  };
}

/* Employment cost and occupancy cost are modelled separately. Role benchmarks are
   employment only — salary, statutory, benefits, IT and G&A. Real estate is its own
   line, because the desk ratio on each side changes it by an order of magnitude. */
function model(s){
  const hc = ROLES.reduce((a,r)=>a+s.counts[r.id],0);
  const empty = hc===0;

  const senM = SEN[s.sen].m, op = OPS[s.op], L = LOCS[s.loc];
  const cityM = CITIES[s.city].m;

  const attrRate = s.attr;
  const wageInf  = s.winf;
  const fxDrift  = s.asm.inrDep;
  const setupFix = op.fixed;
  
  const seatIt   = op.it;
  const margin   = op.margin;
  const xferMo   = op.xfer;

  // full-strength annual run rates
  let indiaAnnual=0, homeAnnualAvoided=0;
  ROLES.forEach(r=>{
    const c = s.counts[r.id];
    indiaAnnual += c * rIndia(s,r) * cityM * senM;
    homeAnnualAvoided += (c/s.sub) * L.base * rHm(s,r) * senM;
  });

  // --- occupancy, per seat per year ---
  const RE = occupancy(s);
  const occInSeat   = RE.india.total;
  const occHomeSeat = RE.home.total;

  const N = s.hz;
  const indiaG = (1+wageInf/100)/(1+fxDrift/100) - 1;   // net USD growth
  const homeG  = L.inf;
  const lag = s.asm.prodLag;

  const rows=[]; let cum=0, peak=0, be=null, totalOneTime=0;
  let prevHC=0, prevRel=0;

  for(let m=1;m<=N;m++){
    const t=(m-1)/12;
    const fI=Math.pow(1+indiaG,t), fH=Math.pow(1+homeG,t);

    const headcount = hc * Math.min(1, m/s.ramp);
    const effective = hc * Math.min(1, Math.max(0,(m-lag)/s.ramp));
    // home cost avoided only after productivity AND overlap
    const relLag = lag + (s.mode==="replace" ? s.overlap : 0);
    const released = hc * Math.min(1, Math.max(0,(m-relLag)/s.ramp)) / s.sub;

    const scale = hc ? headcount/hc : 0;
    const runIndia = indiaAnnual/12 * scale * fI * (1 + (xferMo && m>xferMo ? 0 : margin));
    const fRe = Math.pow(1+s.asm.reEsc/100, t);
    const occIndia = headcount * occInSeat/12 * fRe;
    // you only stop paying for a desk once the lease lets you
    const seatsShed = hc * Math.min(1, Math.max(0,(m - relLag - s.leaseLag)/s.ramp)) / s.sub;
    const occHomeAvoided = seatsShed * occHomeSeat/12 * fH * LEASE[s.lease].r;

    const attrition = headcount * (attrRate/100/12) * (indiaAnnual/Math.max(hc,1)) * (s.asm.attrCost/100) * fI;
    const governance = runIndia * (s.gov/100);
    const avoidedHome = (hc ? (released*s.sub)/hc : 0) * homeAnnualAvoided/12 * fH;

    let oneTime=0;
    if(m===1) oneTime += setupFix + s.asm.advisory;
    const newSeats = Math.max(0, headcount - prevHC);
    oneTime += newSeats * (RE.india.fitout * op.fitShare + seatIt);
    oneTime += newSeats * s.asm.kt;
    if(s.mode==="replace"){
      const newRel = Math.max(0, released - prevRel);
      oneTime += newRel * (homeAnnualAvoided/Math.max(hc/s.sub,1)) * (s.asm.sev/100) * fH;
    }
    if(xferMo && m===xferMo) oneTime += runIndia*12*0.12;

    prevHC=headcount; prevRel=released;

    const cost = runIndia + attrition + governance + occIndia + oneTime;
    const net = avoidedHome + occHomeAvoided - cost;
    cum += net; totalOneTime += oneTime;
    if(cum < peak) peak = cum;
    if(be===null && cum>=0) be=m;

    rows.push({m,headcount,effective,avoidedHome,runIndia,attrition,governance,occIndia,occHomeAvoided,oneTime,cost,net,cum});
  }

  // steady-state (final year)
  const last12 = rows.slice(-12);
  const ssIndia = last12.reduce((a,r)=>a+r.runIndia+r.attrition+r.governance+r.occIndia,0);
  const ssHome  = last12.reduce((a,r)=>a+r.avoidedHome+r.occHomeAvoided,0);
  const ssOccIn = last12.reduce((a,r)=>a+r.occIndia,0);
  const ssOccHm = last12.reduce((a,r)=>a+r.occHomeAvoided,0);
  const ssHeads = rows[rows.length-1].headcount || 1;
  const homeHeads = ssHeads/s.sub || 1;

  const years=[];
  for(let y=0;y<N/12;y++){
    const sl=rows.slice(y*12,y*12+12);
    years.push({
      y:y+1,
      avoided:sl.reduce((a,r)=>a+r.avoidedHome,0),
      india:sl.reduce((a,r)=>a+r.runIndia+r.attrition+r.governance,0),
      occ:sl.reduce((a,r)=>a+r.occIndia-r.occHomeAvoided,0),
      one:sl.reduce((a,r)=>a+r.oneTime,0),
      net:sl.reduce((a,r)=>a+r.net,0),
      cum:sl[sl.length-1].cum,
      hc:sl[sl.length-1].headcount
    });
  }

  return {
    empty, hc, rows, years, be, peak, cum, totalOneTime, RE, ssOccIn, ssOccHm,
    ssPerHeadIndia: ssIndia/ssHeads, ssPerHeadHome: ssHome/homeHeads,
    ssAnnualSaving: ssHome-ssIndia,
    payback: peak<0 ? cum/Math.abs(peak) : null
  };
}

/* ============================ FORMAT ============================ */

/* All benchmarks and the model stay in USD and sq ft. Only what is shown and
   typed follows the site's currency and area unit (navbar). PREF.rate is how
   many units of the chosen currency one USD is worth. */
const SQM_PER_SQFT = 0.092903;
let PREF = { code:"USD", symbol:"$", rate:1, unit:"sqft" };
const toCur   = v=>v*PREF.rate;
const fromCur = v=>v/PREF.rate;
const isSqm   = ()=>PREF.unit==="sqm";
const areaU   = ()=>isSqm()?"sq m":"sqft";
const toArea  = sqft=>isSqm()?sqft*SQM_PER_SQFT:sqft;          // an area
const fromArea= a=>isSqm()?a/SQM_PER_SQFT:a;
const toPerArea  = perSqft=>isSqm()?perSqft/SQM_PER_SQFT:perSqft; // a price per area
const fromPerArea= perA=>isSqm()?perA*SQM_PER_SQFT:perA;
const round2 = v=>Math.round(v*100)/100;
const curStep = usd=>{ const v=usd*PREF.rate; const p=Math.pow(10,Math.floor(Math.log10(Math.max(v,1)))); return Math.max(1,Math.round(v/p)*p); };

const fUSD = n=>{
  const a=Math.abs(toCur(n)), s=n<0?"-":"", c=PREF.symbol;
  if(PREF.code==="INR"){
    if(a>=1e7) return s+c+(a/1e7).toFixed(a/1e7>=100?0:2)+" Cr";
    if(a>=1e5) return s+c+(a/1e5).toFixed(a/1e5>=10?1:2)+" L";
    if(a>=1e3) return s+c+Math.round(a/1e3)+"K";
    return s+c+Math.round(a);
  }
  if(a>=1e9) return s+c+(a/1e9).toFixed(2)+"B";
  if(a>=1e6) return s+c+(a/1e6).toFixed(a/1e6>=10?1:2)+"M";
  if(a>=1e3) return s+c+Math.round(a/1e3)+"K";
  return s+c+Math.round(a);
};
const fFull = n=>(n<0?"-":"")+PREF.symbol+Math.round(Math.abs(toCur(n))).toLocaleString(PREF.code==="INR"?"en-IN":"en-US");
const fPct = n=>(n>=0?"":"-")+Math.abs(n).toFixed(0)+"%";
const mLabel = m=>m===null?"Not reached":(m<=12?"Month "+m:"Month "+m+" · yr "+Math.ceil(m/12));

/* ============================ RENDER: inputs ============================ */

const $=id=>document.getElementById(id);

function buildRoleTable(){
  $("roleTable").innerHTML = ROLES.map(r=>`
    <tr data-r="${r.id}" class="${S.counts[r.id]?"on":""}">
      <td class="r-n">${r.n}</td>
      <td class="r-c"><span class="stepper">
        <button type="button" data-a="-" aria-label="Fewer ${r.n}">−</button>
        <input type="number" min="0" max="400" value="${S.counts[r.id]}" aria-label="${r.n} headcount">
        <button type="button" data-a="+" aria-label="More ${r.n}">+</button>
      </span></td>
    </tr>`).join("");
}

function fillSelect(el,obj,val){
  el.innerHTML = Object.entries(obj).map(([k,v])=>
    `<option value="${k}"${k===val?" selected":""}>${v.n}</option>`).join("");
}

function buildAsm(){
  $("asmBody").innerHTML = ASM.map(a=>`
    <div class="field">
      <label for="a_${a.id}">${a.n}</label>
      <input type="number" id="a_${a.id}" value="${a.suf==="USD"?Math.round(toCur(S.asm[a.id])):S.asm[a.id]}" step="${a.suf==="USD"?curStep(a.step):a.step}" min="${a.min}" max="${a.suf==="USD"?Math.round(toCur(a.max)):a.max}">
      <p class="hint">${a.suf==="USD"?PREF.code:a.suf}</p>
    </div>`).join("");
  ASM.forEach(a=>{
    $("a_"+a.id).addEventListener("input",e=>{
      const v=parseFloat(e.target.value);
      S.asm[a.id]=isNaN(v)?a.v:(a.suf==="USD"?fromCur(v):v); render();
    });
  });
}

/* ============================ RENDER: outputs ============================ */

let prevPts=null, raf=null;

function render(){
  const R = model(S);
  document.querySelectorAll("#gcc-calc [data-gcc-cur]").forEach(el=>{ el.textContent=PREF.code; });

  // --- readouts on sliders
  $("subOut").textContent = S.sub.toFixed(2)+" : 1";
  $("rampOut").textContent = S.ramp+" mo";
  $("ovOut").textContent = S.overlap+" mo";
  $("attrOut").textContent = S.attr+"%";
  $("winfOut").textContent = S.winf.toFixed(1)+"%";
  $("govOut").textContent = S.gov+"%";
  $("totHC").textContent = R.hc + (R.hc===1?" person":" people");
  $("opHint").textContent = OPS[S.op].h;
  $("modeHint").textContent = S.mode==="replace"
    ? "Home roles wind down as India ramps. Severance and overlap apply."
    : "Nothing winds down. Savings are the home hiring you never do.";
  $("ssYr").textContent = Math.round(S.hz/12);

  if(R.empty){
    $("kpis").innerHTML = `<div class="kpi" style="grid-column:1/-1"><div class="k-l">No team configured</div>
      <div class="k-v" style="font-size:20px">Add roles to model</div>
      <div class="k-s">Set headcount in section 01 to generate a business case.</div></div>`;
    $("curve").innerHTML=""; $("yrTable").innerHTML=""; $("sens").innerHTML=""; $("unit").innerHTML="";
    drawBench(R); $("reBody").innerHTML="";
    $("curveSub").textContent=""; $("curveDesc").textContent=""; prevPts=null;
    return;
  }

  drawKpiTiles(R);

  drawCurve(R);
  drawYears(R);
  drawSens(R);
  drawBench(R);
  drawRE(R);
  drawUnit(R);
}

/* ---- J-curve ---- */
function drawCurve(R){
  const W=800,H=300,PL=68,PR=16,PT=16,PB=30;
  const iw=W-PL-PR, ih=H-PT-PB;
  const vals=R.rows.map(r=>r.cum);
  let lo=Math.min(0,...vals), hi=Math.max(0,...vals);
  const pad=(hi-lo)*0.10||1; lo-=pad; hi+=pad;
  const X=m=>PL+(m-1)/(R.rows.length-1||1)*iw;
  const Y=v=>PT+(hi-v)/(hi-lo)*ih;
  const zero=Y(0);

  const pts=R.rows.map(r=>[X(r.m),Y(r.cum)]);

  const paint=(P)=>{
    const line="M"+P.map(p=>p[0].toFixed(1)+","+p[1].toFixed(1)).join("L");
    const area=line+`L${P[P.length-1][0].toFixed(1)},${zero.toFixed(1)}L${P[0][0].toFixed(1)},${zero.toFixed(1)}Z`;

    // y gridlines
    let grid="";
    for(let i=0;i<=4;i++){
      const v=lo+(hi-lo)*i/4, y=Y(v);
      grid+=`<line x1="${PL}" y1="${y.toFixed(1)}" x2="${W-PR}" y2="${y.toFixed(1)}" stroke="var(--rule-soft)" stroke-width="1"/>
             <text x="${PL-8}" y="${(y+3.5).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--ink-3)">${fUSD(v)}</text>`;
    }
    // x ticks per year
    let xt="";
    for(let y=1;y<=Math.round(S.hz/12);y++){
      const x=X(y*12);
      xt+=`<line x1="${x.toFixed(1)}" y1="${PT+ih}" x2="${x.toFixed(1)}" y2="${PT+ih+4}" stroke="var(--rule)" stroke-width="1"/>
           <text x="${x.toFixed(1)}" y="${PT+ih+17}" text-anchor="middle" font-size="11" fill="var(--ink-3)">Y${y}</text>`;
    }
    let be="";
    if(R.be!==null){
      const bx=X(R.be);
      be=`<line x1="${bx.toFixed(1)}" y1="${PT}" x2="${bx.toFixed(1)}" y2="${(PT+ih).toFixed(1)}" stroke="var(--mark)" stroke-width="1" stroke-dasharray="3 3"/>
          <circle cx="${bx.toFixed(1)}" cy="${zero.toFixed(1)}" r="4.5" fill="var(--panel)" stroke="var(--mark)" stroke-width="2"/>
          <text x="${(bx+8).toFixed(1)}" y="${(zero-10).toFixed(1)}" font-size="10.5" fill="var(--mark)" letter-spacing=".05em">M${R.be}</text>`;
    }
    $("curve").innerHTML=`
      <defs>
        <pattern id="hx" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--cost)" stroke-width="1.1" opacity=".3"/>
        </pattern>
        <clipPath id="below"><rect x="${PL}" y="${zero}" width="${iw}" height="${Math.max(0,PT+ih-zero)}"/></clipPath>
        <clipPath id="above"><rect x="${PL}" y="${PT}" width="${iw}" height="${Math.max(0,zero-PT)}"/></clipPath>
      </defs>
      ${grid}${xt}
      <path d="${area}" fill="url(#hx)" clip-path="url(#below)"/>
      <path d="${area}" fill="var(--gain-soft)" clip-path="url(#above)"/>
      <line x1="${PL}" y1="${zero.toFixed(1)}" x2="${W-PR}" y2="${zero.toFixed(1)}" stroke="var(--ink)" stroke-width="1.25"/>
      <path d="${line}" fill="none" stroke="var(--cost)" stroke-width="2" clip-path="url(#below)" stroke-linejoin="round"/>
      <path d="${line}" fill="none" stroke="var(--gain)" stroke-width="2" clip-path="url(#above)" stroke-linejoin="round"/>
      ${be}`;
  };

  const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(prevPts && prevPts.length===pts.length && !reduce){
    const from=prevPts, t0=performance.now(), D=260;
    if(raf) cancelAnimationFrame(raf);
    const step=now=>{
      const k=Math.min(1,(now-t0)/D), e=1-Math.pow(1-k,3);
      paint(pts.map((p,i)=>[p[0], from[i][1]+(p[1]-from[i][1])*e]));
      if(k<1) raf=requestAnimationFrame(step);
    };
    raf=requestAnimationFrame(step);
  } else paint(pts);
  prevPts=pts;

  $("curveSub").textContent = R.be!==null
    ? `Crosses zero in month ${R.be}. Peak funding need ${fUSD(R.peak)}.`
    : `Does not cross zero within ${Math.round(S.hz/12)} years.`;
  $("curveDesc").textContent = R.be!==null
    ? `Hatched area is money out — setup, ramp, parallel running. Solid area is money back. The curve is the number your CFO will ask for: ${fUSD(Math.abs(R.peak))} funded before month ${R.be}.`
    : `The curve never returns above zero. Under these assumptions the case does not pay back inside the horizon — the usual culprits are a slow ramp, a coverage ratio above 1.3, or too small a team to absorb fixed setup cost.`;
}

/* ---- year table ---- */
function drawYears(R){
  $("yrTable").innerHTML = `
    <thead><tr>
      <th>Year</th><th>Headcount</th><th>Home cost avoided</th><th>India employment</th><th>Occupancy, net</th>
      <th>One-time</th><th>Net</th><th>Cumulative</th>
    </tr></thead>
    <tbody>${R.years.map(y=>`
      <tr>
        <td>Year ${y.y}</td>
        <td>${Math.round(y.hc)}</td>
        <td>${fUSD(y.avoided)}</td>
        <td>${fUSD(-y.india)}</td>
        <td class="${y.occ<=0?"v-pos":"v-neg"}">${fUSD(-y.occ)}</td>
        <td>${y.one>0?fUSD(-y.one):"—"}</td>
        <td class="${y.net>=0?"v-pos":"v-neg"}">${fUSD(y.net)}</td>
        <td class="${y.cum>=0?"v-pos":"v-neg"}">${fUSD(y.cum)}</td>
      </tr>`).join("")}
    </tbody>`;
}

/* ---- sensitivity ---- */
function drawSens(R){
  const cases=[
    {t:"Hiring runs 50% slower", d:`${S.ramp} → ${Math.round(S.ramp*1.5)} months to full strength`, f:s=>({...s,ramp:Math.round(s.ramp*1.5)})},
    {t:"Wage inflation +4 pts",  d:`${S.winf}% → ${(S.winf+4).toFixed(1)}% a year in India`, f:s=>({...s,winf:s.winf+4})},
    {t:"Attrition +10 pts",      d:`${S.attr}% → ${S.attr+10}% annual`, f:s=>({...s,attr:s.attr+10})},
    {t:"Coverage ratio 1.35",    d:`${S.sub.toFixed(2)} → 1.35 India heads per home head`, f:s=>({...s,sub:1.35})}
  ];
  $("sens").innerHTML = cases.map(c=>{
    const r=model(c.f({...S,counts:{...S.counts},asm:{...S.asm}}));
    let dl="";
    if(R.be!==null && r.be!==null){
      const d=r.be-R.be;
      dl = d===0?'<span class="delta">no change</span>'
         : `<span class="delta ${d>0?"up":"dn"}">${d>0?"+":""}${d} mo</span>`;
    } else if(R.be!==null && r.be===null){
      dl='<span class="delta up">case fails</span>';
    }
    return `<div class="sens-i">
      <div class="s-t">${c.t}</div>
      <div class="s-d">${c.d}</div>
      <div class="s-v">${r.be===null?"No break-even":"Month "+r.be}${dl}</div>
    </div>`;
  }).join("");
}



/* ---- KPI tiles ---- */
function drawKpiTiles(R){
  const beText = R.be===null ? "Never" : "M"+R.be;
  $("kpis").innerHTML = `
    <div class="kpi ${R.be===null?"neg":""}">
      <div class="k-l">Break-even</div>
      <div class="k-v num">${beText}</div>
      <div class="k-s">${R.be===null?"Case does not clear within horizon":mLabel(R.be)}</div>
    </div>
    <div class="kpi neg">
      <div class="k-l">Peak cash exposure</div>
      <div class="k-v num">${fUSD(R.peak)}</div>
      <div class="k-s">Deepest point of the curve — the money you must fund</div>
    </div>
    <div class="kpi ${R.ssAnnualSaving>=0?"pos":"neg"}">
      <div class="k-l">Steady-state saving</div>
      <div class="k-v num">${fUSD(R.ssAnnualSaving)}<span style="font-size:15px;font-family:inherit">/yr</span></div>
      <div class="k-s">${fPct(100*(1-R.ssPerHeadIndia/(R.ssPerHeadHome||1)))} lower per home head replaced</div>
    </div>
    <div class="kpi ${R.cum>=0?"pos":"neg"}">
      <div class="k-l">Net over ${Math.round(S.hz/12)} years</div>
      <div class="k-v num">${fUSD(R.cum)}</div>
      <div class="k-s">${R.payback!==null?R.payback.toFixed(1)+"\u00D7 the peak cash you fund":"No capital at risk"}</div>
    </div>`;
}

function drawREFigures(){
  const tb=$("reBody").querySelectorAll("table.re");
  if(tb.length<2) return;                       // empty state: nothing rendered yet
  const O=occupancy(S), R=model(S);
  [["india",0],["home",1]].forEach(([k,i])=>{
    const rows=tb[i].rows, o=O[k];
    rows[2].cells[1].innerHTML=`${o.ratio.toFixed(2)}\u00D7 \u2192 ${toArea(o.eff).toFixed(isSqm()?1:0)}<span class="u">${areaU()} / head</span>`;
    rows[3].cells[1].innerHTML=`${fFull(o.lease)}<span class="u">/ yr</span>`;
    rows[5].cells[1].innerHTML=`${fFull(o.total)}<span class="u" style="font-size:11px">/ yr</span>`;
  });
  const gap=O.home.total-O.india.total, annualGap=R.ssOccHm-R.ssOccIn;
  const share=R.ssAnnualSaving>0?annualGap/R.ssAnnualSaving*100:0;
  const sh=$("reBody").querySelectorAll(".re-share b");
  sh[0].textContent=fFull(gap); sh[1].textContent=fUSD(annualGap);
  sh[2].textContent=share.toFixed(1)+"%";
  sh[3].textContent=(R.ssPerHeadIndia>0?O.india.total/R.ssPerHeadIndia*100:0).toFixed(1)+"%";
  $("reBody").querySelector(".re-verdict").innerHTML=reVerdict(O,gap,annualGap,share,LEASE[S.lease].r,R);
}

function drawKpisAndCharts(R){
  drawKpiTiles(R); drawCurve(R); drawYears(R); drawSens(R); drawUnit(R); drawREFigures();
  const n=Object.keys(S.indiaOv).length+Object.keys(S.hmOv).length;
  ROLES.forEach(r=>{
    const tr=$("benchTable").querySelector(`tr[data-r="${r.id}"]`); if(!tr) return;
    const cityM=CITIES[S.city].m, senM=SEN[S.sen].m, L=LOCS[S.loc];
    const iEff=rIndia(S,r)*cityM*senM, hEff=L.base*rHm(S,r)*senM;
    const tds=tr.querySelectorAll("td");
    tds[4].textContent=fFull(iEff); tds[5].textContent=fFull(hEff);
    tds[6].textContent=(hEff>0?(1-iEff/hEff)*100:0).toFixed(0)+"%";
  });
}

/* ---- editable role benchmarks ---- */
function drawBench(R){
  const cityM=CITIES[S.city].m, senM=SEN[S.sen].m, L=LOCS[S.loc];
  const rows = ROLES.map(r=>{
    const c=S.counts[r.id];
    const iBase=rIndia(S,r), hAbs=Math.round(L.base*rHm(S,r));
    const iEff=iBase*cityM*senM, hEff=hAbs*senM;
    const gap=hEff>0?(1-iEff/hEff)*100:0;
    return `<tr class="${c?"":"off"}" data-r="${r.id}">
      <td>${r.n}</td>
      <td class="calc">${c||"—"}</td>
      <td><input type="number" data-f="india" step="${curStep(1000)}" min="0" value="${Math.round(toCur(iBase))}"
           class="${S.indiaOv[r.id]!=null?"edited":""}" aria-label="${r.n} India base cost"></td>
      <td><input type="number" data-f="home" step="${curStep(1000)}" min="0" value="${Math.round(toCur(hAbs))}"
           class="${S.hmOv[r.id]!=null?"edited":""}" aria-label="${r.n} home cost"></td>
      <td class="calc">${fFull(iEff)}</td>
      <td class="calc">${fFull(hEff)}</td>
      <td class="gap">${gap.toFixed(0)}%</td>
    </tr>`;
  }).join("");
  $("benchTable").innerHTML=`
    <thead><tr>
      <th>Role</th><th>Heads</th>
      <th>India base<br><span style="text-transform:none;letter-spacing:0;font-size:9px">Bengaluru, mid</span></th>
      <th>${LOCS[S.loc].n.replace(/ — /,"<br>")}<br><span style="text-transform:none;letter-spacing:0;font-size:9px">mid-level</span></th>
      <th>Effective India<br><span style="text-transform:none;letter-spacing:0;font-size:9px">after city &amp; seniority</span></th>
      <th>Effective home<br><span style="text-transform:none;letter-spacing:0;font-size:9px">after seniority</span></th>
      <th>Gap</th>
    </tr></thead><tbody>${rows}</tbody>`;
  const n=Object.keys(S.indiaOv).length+Object.keys(S.hmOv).length;
  $("benchNote").textContent = n
    ? `${n} benchmark${n>1?"s":""} overridden. India base is Bengaluru mid-level; ${CITIES[S.city].m.toFixed(2)}\u00D7 city and ${SEN[S.sen].m.toFixed(2)}\u00D7 seniority are applied on top.`
    : `Employment cost only, excluding real estate. Home costs scale with the location you pick; the India base does not.`;
  $("benchReset").disabled = n===0;
}

/* ---- real estate & occupancy ---- */
function drawRE(R){
  const O=occupancy(S), lr=LEASE[S.lease].r;
  const side=(k,o,title,sub,wsKey)=>`
    <div class="re-col">
      <h4>${title}</h4><span class="re-sub">${sub}</span>
      <div class="re-ctl">
        <label for="ws_${k}">Workplace model</label>
        <select id="ws_${k}">${Object.entries(WS).map(([w,v])=>
          `<option value="${w}"${w===wsKey?" selected":""}>${v.n}</option>`).join("")}</select>
      </div>
      <table class="re">
        <tr><td>Grade-A rent</td><td><input data-re="${k==="in"?"rentIn":"rentHome"}" type="number" step="0.5" min="0" value="${round2(toCur(toPerArea(o.rent)))}" aria-label="${title} rent"><span class="u">/ ${areaU()} / yr</span></td></tr>
        <tr><td>Space per desk</td><td><input data-re="${k==="in"?"sqftIn":"sqftHome"}" type="number" step="${isSqm()?0.5:5}" min="${isSqm()?1:10}" value="${round2(toArea(o.sqft))}" aria-label="${title} area per desk"><span class="u">${areaU()}</span></td></tr>
        <tr><td>Desk ratio</td><td>${o.ratio.toFixed(2)}\u00D7 \u2192 ${toArea(o.eff).toFixed(isSqm()?1:0)}<span class="u">${areaU()} / head</span></td></tr>
        <tr><td>Lease cost per head</td><td>${fFull(o.lease)}<span class="u">/ yr</span></td></tr>
        <tr><td>${k==="in"?"Facilities, transport, canteen":"Facilities, utilities, security"}</td><td><input data-re="${k==="in"?"opexIn":"opexHome"}" type="number" step="${curStep(100)}" min="0" value="${Math.round(toCur(o.opex))}" aria-label="${title} other occupancy"><span class="u">/ yr</span></td></tr>
        <tr class="sum"><td>Occupancy per head</td><td>${fFull(o.total)}<span class="u" style="font-size:11px">/ yr</span></td></tr>
        <tr class="capex"><td>${k==="in"?"Fit-out capex, one-off":"Fit-out already sunk"}</td><td>${k==="in"
          ? `<input data-re="fitIn" type="number" step="${curStep(100)}" min="0" value="${Math.round(toCur(o.fitout))}" aria-label="India fit-out capex"><span class="u">/ desk</span>`
          : `<span style="color:var(--ink-3)">not recoverable</span>`}</td></tr>
      </table>
    </div>`;

  const gap=O.home.total-O.india.total;
  const annualGap=R.ssOccHm-R.ssOccIn;         // net occupancy effect at steady state
  const shareOfSaving = R.ssAnnualSaving>0 ? annualGap/R.ssAnnualSaving*100 : 0;
  const shareOfIndia  = R.ssPerHeadIndia>0 ? O.india.total/R.ssPerHeadIndia*100 : 0;

  $("reBody").innerHTML=`
    <div class="re-grid">
      ${side("in",   O.india, CITIES[S.city].n, "New build \u2014 you are paying for every desk", S.wsIn)}
      ${side("home", O.home,  LOCS[S.loc].n,    "Existing space \u2014 only saved if you can release it", S.wsHome)}
    </div>

    <div class="re-grid" style="margin-top:18px;padding-top:16px;border-top:1px solid var(--rule)">
      <div class="re-ctl" style="margin:0">
        <label for="leaseSel">Can you actually release the home space?</label>
        <select id="leaseSel">${Object.entries(LEASE).map(([k,v])=>
          `<option value="${k}"${k===S.lease?" selected":""}>${v.n}</option>`).join("")}</select>
      </div>
      <div class="re-ctl" style="margin:0">
        <label for="leaseLag">Months before you can hand it back \u2014 <b class="num" style="font-weight:500">${S.leaseLag}</b></label>
        <input type="range" id="leaseLag" min="0" max="36" step="1" value="${S.leaseLag}" style="margin-top:6px">
      </div>
    </div>

    <div class="re-share">
      <div><span>Gap per head</span><b style="color:var(--gain)">${fFull(gap)}</b></div>
      <div><span>Net effect, yr ${Math.round(S.hz/12)}</span><b style="color:${annualGap>=0?"var(--gain)":"var(--cost)"}">${fUSD(annualGap)}</b></div>
      <div><span>Share of total saving</span><b>${shareOfSaving.toFixed(1)}%</b></div>
      <div><span>Share of India run cost</span><b>${shareOfIndia.toFixed(1)}%</b></div>
    </div>

    <p class="re-verdict">${reVerdict(O,gap,annualGap,shareOfSaving,lr,R)}</p>`;
}

function reVerdict(O,gap,annualGap,share,lr,R){
  const mult = O.india.total>0 ? (O.home.total/O.india.total) : 0;
  let t = `A desk in ${LOCS[S.loc].n} costs <b>${mult.toFixed(1)}\u00D7</b> a desk in ${CITIES[S.city].n} \u2014 ${fFull(O.home.total)} against ${fFull(O.india.total)} a year. `;

  if(S.wsHome==="rem"){
    t += `But your home team is remote-first, so there is almost no occupancy to hand back. Real estate is a <b>cost you are adding</b>, not one you are avoiding: the India site needs desks whether or not the team it replaces ever had any. `;
  } else if(lr===0){
    t += `You have said the home lease is locked, so none of that ${fFull(O.home.total)} comes back. Every India desk is net new cost until the lease ends. `;
  } else if(lr<1){
    t += `At partial release you recover about half of it, and only from month ${S.leaseLag + S.asm.prodLag + S.overlap} once the space is actually free. `;
  } else {
    t += `You have said the space is releasable, so the full amount comes back \u2014 from month ${S.leaseLag + S.asm.prodLag + S.overlap}, not from day one. `;
  }

  t += `<br><br>Net effect on the year ${Math.round(S.hz/12)} run rate is <b>${fUSD(annualGap)}</b>, or <b>${share.toFixed(1)}%</b> of total savings. `;
  t += share < 10
    ? `Real estate is real money but it is not what makes this case work \u2014 employment cost is doing the heavy lifting. Where it does change the answer is upfront: <b>${fFull(O.india.fitout*OPS[S.op].fitShare)}</b> per desk in fit-out capex lands before anyone is productive, and that deepens the trough.`
    : `That is a large enough share to be worth negotiating hard on \u2014 a lower-rent city or a higher desk-sharing ratio moves the case materially.`;
  return t;
}

/* ---- unit economics ---- */
function drawUnit(R){
  const a=R.ssPerHeadHome, b=R.ssPerHeadIndia;
  const max=Math.max(a,b)||1;
  const bar=(v,c)=>`<div style="height:26px;width:${(v/max*100).toFixed(1)}%;background:${c};border-radius:2px;min-width:2px"></div>`;
  $("unit").innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:26px">
      <div>
        <div class="eyebrow">${LOCS[S.loc].n}</div>
        <div style="font-size:27px;font-weight:600;margin:6px 0 9px;letter-spacing:-.02em" class="num">${fFull(a)}</div>
        ${bar(a,"var(--cost)")}
        <p class="hint" style="margin-top:7px">Per home head, employment plus occupancy, year ${Math.round(S.hz/12)}</p>
      </div>
      <div>
        <div class="eyebrow">${CITIES[S.city].n} — ${OPS[S.op].n}</div>
        <div style="font-size:27px;font-weight:600;margin:6px 0 9px;letter-spacing:-.02em;color:var(--gain)" class="num">${fFull(b)}</div>
        ${bar(b,"var(--gain)")}
        <p class="hint" style="margin-top:7px">Per India head, incl. attrition, governance and occupancy, ${S.sub.toFixed(2)} heads per home head</p>
      </div>
    </div>
    <p class="hint" style="margin-top:16px;padding-top:13px;border-top:1px solid var(--rule-soft)">
      Effective saving per home head replaced is ${fFull(a-b*S.sub)} a year once ${S.sub.toFixed(2)} India heads are counted against each one — not the ${fFull(a-b)} a headline salary comparison would suggest.
    </p>`;
}

/* ============================ WIRING ============================ */

buildRoleTable();
fillSelect($("loc"),LOCS,S.loc);
fillSelect($("city"),CITIES,S.city);
fillSelect($("sen"),SEN,S.sen);
fillSelect($("op"),OPS,S.op);
buildAsm();

$("roleTable").addEventListener("click",e=>{
  const b=e.target.closest("button[data-a]"); if(!b) return;
  const tr=b.closest("tr"), id=tr.dataset.r, inp=tr.querySelector("input");
  const next=Math.max(0,Math.min(400,(S.counts[id]||0)+(b.dataset.a==="+"?1:-1)));
  S.counts[id]=next; inp.value=next; tr.classList.toggle("on",next>0); render();
});
$("roleTable").addEventListener("input",e=>{
  if(e.target.tagName!=="INPUT") return;
  const tr=e.target.closest("tr"), id=tr.dataset.r;
  const v=Math.max(0,Math.min(400,parseInt(e.target.value,10)||0));
  S.counts[id]=v; tr.classList.toggle("on",v>0); render();
});

[["loc","loc"],["city","city"],["sen","sen"],["op","op"],["mode","mode"]].forEach(([el,key])=>{
  $(el).addEventListener("change",e=>{S[key]=e.target.value;render();});
});
[["sub","sub",parseFloat],["ramp","ramp",parseInt],["overlap","overlap",parseInt],
 ["attr","attr",parseInt],["winf","winf",parseFloat],["gov","gov",parseInt]].forEach(([el,key,p])=>{
  $(el).addEventListener("input",e=>{S[key]=p(e.target.value);render();});
});

$("hz").addEventListener("click",e=>{
  const b=e.target.closest("button[data-v]"); if(!b) return;
  [...$("hz").children].forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
  S.hz=parseInt(b.dataset.v,10); prevPts=null; render();
});


$("benchTable").addEventListener("input",e=>{
  const el=e.target; if(el.tagName!=="INPUT") return;
  const id=el.closest("tr").dataset.r, typed=parseFloat(el.value);
  if(isNaN(typed)||typed<0) return;
  const v=fromCur(typed);
  if(el.dataset.f==="india") S.indiaOv[id]=v;
  else S.hmOv[id]= v / LOCS[S.loc].base;      // stored as a multiplier so it survives a location change
  el.classList.add("edited");
  const R=model(S); drawKpisAndCharts(R); $("benchReset").disabled=false;
});
$("benchReset").addEventListener("click",()=>{S.indiaOv={};S.hmOv={};render();});


$("reBody").addEventListener("input",e=>{
  const el=e.target;
  if(el.dataset.re){
    const typed=parseFloat(el.value); if(isNaN(typed)||typed<0) return;
    const key=el.dataset.re;
    // back to the model's USD and sq ft
    const v = key.indexOf("rent")===0 ? fromPerArea(fromCur(typed))
            : key.indexOf("sqft")===0 ? fromArea(typed)
            : fromCur(typed);
    S.re[key]=v; drawKpisAndCharts(model(S)); return;
  }
  if(el.id==="leaseLag"){ S.leaseLag=parseInt(el.value,10); render(); }
});
$("reBody").addEventListener("change",e=>{
  const el=e.target;
  if(el.id==="ws_in")   { S.wsIn=el.value;   render(); }
  if(el.id==="ws_home") { S.wsHome=el.value; render(); }
  if(el.id==="leaseSel"){ S.lease=el.value;  render(); }
});


render();


/* The page passes the navbar currency and unit here, now and on every change. */
window.setGccCalculatorPreferences = function(next){
  if(!next) return;
  PREF = {
    code: next.code || "USD",
    symbol: next.symbol || "$",
    rate: (Number.isFinite(next.rate) && next.rate>0) ? next.rate : 1,
    unit: next.unit==="sqm" ? "sqm" : "sqft"
  };
  buildAsm(); render();
};
if (window.__gccPendingPreferences) {
  window.setGccCalculatorPreferences(window.__gccPendingPreferences);
}
};