// Programmatic SEO page generator. Produces self-contained landing pages in
// public/tenders/, one per curated category × region combination, that target
// high-intent search queries ("NHS pharmaceutical tenders", "medical device
// contracts in Kenya"), carry unique crawlable content, and hydrate a live
// tenders widget from /api/v1/public-tenders. Also (re)writes the /tenders hub
// index and prints the sitemap <url> lines to add.
//
//   node scripts/generate-seo-pages.mjs
//
// Idempotent: re-running overwrites the generated files with the same content.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "tenders");
mkdirSync(outDir, { recursive: true });

const SITE = "https://healthprocureintel.com";
const YEAR = 2026;

// ---------------------------------------------------------------------------
// Category metadata, the "what/who/codes/how" that makes each page unique.
// ---------------------------------------------------------------------------
const CATEGORIES = {
  medical_devices: {
    noun: "Medical Device", plural: "medical device", cat: "medical_devices",
    covers: ["diagnostic and monitoring equipment", "implants and consumables", "hospital and theatre equipment", "single-use and reusable devices"],
    cpv: "33100000 (medical equipment)", naics: "339112 (surgical &amp; medical instruments)",
    howToWin: ["Lead with clinical evidence, MHRA/CE/FDA status and total cost of ownership", "Map your device to the buyer's framework or Dynamic Purchasing System early", "Evidence supply resilience and post-market support, not just unit price"],
    relatedBlogs: [["/blog/diagnostics-procurement-guide", "Diagnostics procurement guide"], ["/blog/framework-agreements-healthcare-procurement", "Framework agreements explained"]],
  },
  pharmaceuticals: {
    noun: "Pharmaceutical", plural: "pharmaceutical", cat: "pharmaceuticals",
    covers: ["branded and generic medicines", "vaccines and biologicals", "wholesale and distribution contracts", "specials and unlicensed medicines"],
    cpv: "33600000 (pharmaceutical products)", naics: "325412 (pharmaceutical preparations)",
    howToWin: ["Prove regulatory compliance, cold-chain and continuity of supply up front", "Understand national/regional formularies and framework award structures", "Price against real award data, not list price"],
    relatedBlogs: [["/blog/framework-agreements-healthcare-procurement", "Framework agreements explained"], ["/blog/how-to-price-a-healthcare-tender-bid", "Pricing a tender bid"]],
  },
  personal_protective_equipment: {
    noun: "PPE", plural: "personal protective equipment (PPE)", cat: "personal_protective_equipment",
    covers: ["gloves, gowns and aprons", "surgical and respirator masks", "eye protection and face shields", "clinical waste and decontamination supplies"],
    cpv: "33140000 (medical consumables) / 18140000 (protective clothing)", naics: "339113 (surgical appliances &amp; supplies)",
    howToWin: ["Evidence standards compliance (EN/ASTM) and independent test certificates", "Demonstrate stock holding and lead-time resilience post-pandemic", "Offer transparent, benchmarkable pricing"],
    relatedBlogs: [["/blog/common-mistakes-losing-healthcare-tenders", "Common tender mistakes"]],
  },
  diagnostics: {
    noun: "Diagnostics", plural: "diagnostics and pathology", cat: "diagnostics",
    covers: ["in-vitro diagnostics (IVD) and assays", "pathology and laboratory services", "imaging and radiology equipment", "point-of-care testing"],
    cpv: "33124100 (diagnostic devices) / 85145000 (medical laboratory services)", naics: "621511 (medical laboratories)",
    howToWin: ["Evidence analytical performance, throughput and turnaround", "Show interoperability with existing LIMS/imaging systems", "Bundle service, reagents and managed-equipment options"],
    relatedBlogs: [["/blog/diagnostics-procurement-guide", "Diagnostics procurement guide"]],
  },
  surgical_instruments: {
    noun: "Surgical Instrument", plural: "surgical instrument and theatre", cat: "surgical_instruments",
    covers: ["reusable and single-use instruments", "endoscopy, laparoscopy and robotics", "orthopaedic implants and kits", "operating theatre equipment"],
    cpv: "33169000 (surgical instruments) / 33162000 (theatre apparatus)", naics: "339112 (surgical &amp; medical instruments)",
    howToWin: ["Evidence sterilisation, traceability and instrument lifecycle", "Support trials and clinician evaluation", "Price the whole kit and consumable stream, not the headline instrument"],
    relatedBlogs: [["/blog/framework-agreements-healthcare-procurement", "Framework agreements explained"]],
  },
  laboratory_equipment: {
    noun: "Laboratory Equipment", plural: "laboratory equipment", cat: "laboratory_equipment",
    covers: ["analysers and instrumentation", "reagents and consumables", "cold storage and sample handling", "managed laboratory service contracts"],
    cpv: "38000000 (laboratory &amp; scientific equipment)", naics: "334516 (analytical laboratory instruments)",
    howToWin: ["Offer managed-service and reagent-rental models buyers increasingly prefer", "Evidence uptime, service response and validation support", "Show integration with existing lab workflows"],
    relatedBlogs: [["/blog/diagnostics-procurement-guide", "Diagnostics procurement guide"]],
  },
  health_it: {
    noun: "Digital Health &amp; IT", plural: "digital health and IT", cat: "health_it",
    covers: ["electronic health/patient records (EHR/EPR)", "clinical and interoperability systems", "telehealth and remote monitoring platforms", "data, analytics and cyber security"],
    cpv: "48000000 (software) / 72000000 (IT services)", naics: "541512 (computer systems design)",
    howToWin: ["Evidence interoperability standards (FHIR, DTAC) and information governance", "Show clinical safety (DCB0129/0160) and cyber assurance", "De-risk implementation with proven deployments"],
    relatedBlogs: [["/blog/digital-health-telehealth-procurement", "Digital health & telehealth procurement"]],
  },
  allied_health: {
    noun: "Allied Health", plural: "allied health services", cat: "allied_health",
    covers: ["physiotherapy and MSK services", "speech &amp; language therapy and dietetics", "podiatry and osteopathy", "community rehabilitation and reablement"],
    cpv: "85142100 (physiotherapy) / 85142000 (paramedical services)", naics: "621340 (PT/OT/speech therapists)",
    howToWin: ["Evidence outcomes and waiting-time performance, not just activity", "Demonstrate workforce resilience given AHP shortages", "Build social value into the bid"],
    relatedBlogs: [["/blog/allied-health-procurement-guide", "Allied health procurement guide"], ["/blog/physiotherapy-service-tenders", "NHS physiotherapy contracts"]],
  },
  occupational_therapy: {
    noun: "Occupational Therapy", plural: "occupational therapy services and equipment", cat: "occupational_therapy",
    covers: ["OT assessment and reablement services", "home adaptations and daily-living aids", "mobility and assistive technology", "rehabilitation and disability equipment"],
    cpv: "85312500 (rehabilitation) / 33196000 (medical aids)", naics: "621340 (OT services)",
    howToWin: ["Separate service quality from equipment cost in your response", "Evidence reduced admissions and faster discharge", "Show fast turnaround on adaptations and aids"],
    relatedBlogs: [["/blog/allied-health-procurement-guide", "Allied health procurement guide"]],
  },
  clinical_services: {
    noun: "Clinical Services", plural: "clinical and staffing services", cat: "clinical_services",
    covers: ["clinical staffing and locum frameworks", "outsourced clinical services", "community and out-of-hours provision", "insourcing and waiting-list initiatives"],
    cpv: "85100000 (health services) / 79600000 (recruitment)", naics: "561320 (temporary help services)",
    howToWin: ["Evidence quality governance, not just fill rates", "Demonstrate compliant, resilient workforce supply", "Show measurable impact on waiting lists"],
    relatedBlogs: [["/blog/clinical-services-outsourcing", "Clinical services outsourcing"]],
  },
  social_care: {
    noun: "Social Care", plural: "social and domiciliary care", cat: "social_care",
    covers: ["domiciliary and home care", "residential and nursing placements", "supported living and complex care", "reablement and prevention services"],
    cpv: "85300000 (social work services)", naics: "624120 (services for the elderly &amp; disabled)",
    howToWin: ["Evidence CQC/regulator ratings and safeguarding", "Demonstrate workforce pay, retention and training", "Show co-production and outcomes for people supported"],
    relatedBlogs: [["/blog/clinical-services-outsourcing", "Clinical services outsourcing"]],
  },
  menstrual_health: {
    noun: "Menstrual Health", plural: "menstrual health and sanitary product", cat: "menstrual_health",
    covers: ["sanitary pads, towels and menstrual cups", "reusable and disposable period products", "dignity kits and period-poverty programmes", "menstrual hygiene management (MHM)"],
    cpv: "33771000 (sanitary paper products) / 33140000 (medical consumables)", naics: "322291 (sanitary paper products)",
    howToWin: ["Evidence product quality, safety and acceptability for local users", "Meet donor (World Bank/UN) procurement and packaging requirements", "Show distribution reach, especially to schools and rural areas"],
    relatedBlogs: [["/blog/framework-agreements-healthcare-procurement", "Framework agreements explained"]],
  },
  wash_hygiene: {
    noun: "WASH &amp; Hygiene", plural: "water, sanitation and hygiene (WASH)", cat: "wash_hygiene",
    covers: ["hygiene kits and consumables", "school and community sanitation", "latrines and handwashing facilities", "menstrual hygiene management (MHM) programmes"],
    cpv: "45215500 (sanitary facilities) / 33700000 (personal care products)", naics: "237110 (water &amp; sewer construction)",
    howToWin: ["Align to donor WASH standards and safeguarding requirements", "Evidence community engagement and maintenance/sustainability", "Show delivery capacity across dispersed sites"],
    relatedBlogs: [["/blog/framework-agreements-healthcare-procurement", "Framework agreements explained"]],
  },
};

// ---------------------------------------------------------------------------
// Region metadata, where tenders are published and who buys.
// ---------------------------------------------------------------------------
const REGIONS = {
  uk: {
    slug: "uk", in: "in the UK", adj: "UK", nhs: true, region: "United Kingdom", codes: "CPV",
    buyers: "NHS trusts, integrated care boards (ICBs), NHS Supply Chain and local authorities",
    sources: '<strong>Find a Tender</strong> (above-threshold) and <strong>Contracts Finder</strong> (below-threshold), plus <strong>NHS Supply Chain</strong> notices',
  },
  eu: {
    slug: "eu", in: "in Europe", adj: "European", region: "Europe", codes: "CPV",
    buyers: "national health ministries, regional health authorities and public hospitals across EU member states",
    sources: '<strong>TED (Tenders Electronic Daily)</strong>, the EU\'s official procurement journal',
  },
  us: {
    slug: "us", in: "in the United States", adj: "US federal", region: "North America", codes: "NAICS",
    buyers: "federal agencies including the VA, HHS and the Defense Health Agency, plus large health systems",
    sources: '<strong>SAM.gov</strong>, the US federal contracting system',
  },
  global: {
    slug: "global", in: "worldwide", adj: "global development", region: "Global", codes: "CPV/UNSPSC",
    buyers: "World Bank-financed health projects, UN agencies (UNICEF, UNFPA, WHO) and national governments",
    sources: '<strong>World Bank</strong> procurement notices and the <strong>UN Global Marketplace (UNGM)</strong>',
  },
  east_africa: {
    slug: "east-africa", in: "in East Africa", adj: "East African", region: "East Africa", codes: "UNSPSC/donor",
    buyers: "Ministries of Health, Education and Gender, World Bank-financed projects and UN country offices across Rwanda, Kenya, Uganda, Tanzania and Malawi",
    sources: '<strong>World Bank</strong> procurement notices, the <strong>UN Global Marketplace (UNGM)</strong>, and national e-procurement portals',
  },
  south_asia: {
    slug: "south-asia", in: "in South Asia", adj: "South Asian", region: "South Asia", codes: "UNSPSC/donor",
    buyers: "national and state health departments, World Bank-financed projects and UN country offices across India and Bangladesh",
    sources: '<strong>World Bank</strong> procurement notices, the <strong>UN Global Marketplace (UNGM)</strong>, and national e-procurement portals',
  },
};

// ---------------------------------------------------------------------------
// Curated combos, chosen for real search intent, not every permutation
// (thin/duplicate pages hurt SEO). { category, region }.
// ---------------------------------------------------------------------------
const COMBOS = [
  // UK / NHS, highest domestic intent
  ["medical_devices", "uk"], ["pharmaceuticals", "uk"], ["personal_protective_equipment", "uk"],
  ["diagnostics", "uk"], ["surgical_instruments", "uk"], ["laboratory_equipment", "uk"],
  ["health_it", "uk"], ["allied_health", "uk"], ["occupational_therapy", "uk"],
  ["clinical_services", "uk"], ["social_care", "uk"],
  // EU
  ["medical_devices", "eu"], ["pharmaceuticals", "eu"], ["diagnostics", "eu"],
  // US
  ["medical_devices", "us"], ["pharmaceuticals", "us"],
  // Global development
  ["medical_devices", "global"], ["pharmaceuticals", "global"],
  // Menstrual health / WASH, the differentiated donor-data angle
  ["menstrual_health", "global"], ["wash_hygiene", "global"],
  ["menstrual_health", "east_africa"], ["menstrual_health", "south_asia"],
];

// ---------- small HTML helpers ----------
const clean = (s) => s.replace(/&amp;/g, "&");
function titleFor(c, r) {
  const cat = CATEGORIES[c], reg = REGIONS[r];
  if (reg.nhs && ["allied_health", "occupational_therapy", "clinical_services", "social_care"].includes(c) === false && c !== "menstrual_health") {
    return `NHS ${cat.noun} Tenders`;
  }
  return `${cat.noun} Tenders ${reg.in}`;
}
function slugFor(c, r) {
  return `${c.replace(/_/g, "-")}-tenders-${REGIONS[r].slug}`;
}

function page(c, r) {
  const cat = CATEGORIES[c], reg = REGIONS[r];
  const slug = slugFor(c, r);
  const url = `${SITE}/tenders/${slug}`;
  const title = clean(titleFor(c, r));
  const h1 = title;
  const codeLabel = reg.codes;
  const codes = reg.codes.startsWith("NAICS") || reg.codes === "NAICS" ? cat.naics : cat.cpv;
  const desc = clean(`Live ${cat.plural} tenders ${reg.in}: who buys them, where they're published, the ${codeLabel} codes to watch, and how to win. Track ${cat.plural} contracts with HealthProcure Intel.`);
  const keywords = clean(`${cat.plural} tenders, ${cat.plural} contracts ${reg.in}, ${reg.adj} ${cat.plural} procurement, healthcare tenders ${reg.in}, ${cat.noun.toLowerCase()} bidding`);
  const dashHref = `/dashboard?category=${cat.cat}`;

  const related = cat.relatedBlogs.map(([href, label]) => `<a href="${href}" class="text-gold hover:underline">${label}</a>`).join(" &middot; ");

  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} (${YEAR}) | HealthProcure Intel</title>
  <meta name="description" content="${desc}" />
  <meta name="keywords" content="${keywords}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${SITE}/logo-hp.png" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": ${JSON.stringify(title)},
    "description": ${JSON.stringify(desc)},
    "url": "${url}",
    "isPartOf": { "@type": "WebSite", "name": "HealthProcure Intel", "url": "${SITE}/" },
    "publisher": { "@type": "Organization", "name": "HealthProcure Intel", "logo": { "@type": "ImageObject", "url": "${SITE}/logo-hp.png" } }
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "${SITE}/" },
      { "@type": "ListItem", "position": 2, "name": "Tenders", "item": "${SITE}/tenders" },
      { "@type": "ListItem", "position": 3, "name": ${JSON.stringify(title)}, "item": "${url}" }
    ]
  }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { theme: { extend: {
      colors: {
        gold: { DEFAULT: '#c9a96e', light: '#d4c4a0', dark: '#a8883f', bright: '#d4af37', muted: '#b8975a' },
        dark: { DEFAULT: '#0a0a0f', 100: '#12141d', 200: '#0f1117', 300: '#181b27', 400: '#1e2130', 500: '#252839' },
        teal: { DEFAULT: '#1a7a6d', light: '#0d9488', dark: '#145f55' },
      },
      fontFamily: { display: ['Playfair Display', 'Georgia', 'serif'], body: ['Inter', 'system-ui', 'sans-serif'] },
    } } };
  </script>
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; background-color: #0a0a0f; color: #e2e8f0; }
    .nav-blur { backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
    ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0a0a0f; }
    ::-webkit-scrollbar-thumb { background: rgba(201,169,110,0.3); border-radius: 3px; }
    .prose-custom h2 { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 700; color: #fff; margin-top: 2.5rem; margin-bottom: 1rem; }
    .prose-custom p { color: #cbd5e1; line-height: 1.8; margin-bottom: 1.25rem; }
    .prose-custom ul { margin-bottom: 1.25rem; padding-left: 1.5rem; }
    .prose-custom li { color: #cbd5e1; line-height: 1.7; margin-bottom: 0.5rem; list-style-type: disc; }
    .prose-custom a { color: #c9a96e; }
    .prose-custom strong { color: #fff; font-weight: 600; }
  </style>
</head>
<body class="antialiased">
  <nav class="fixed top-0 left-0 right-0 z-50 nav-blur bg-dark/80 border-b border-white/5">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="flex items-center justify-between h-16 lg:h-20">
        <a href="/" class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center shadow-lg shadow-gold/10">
            <span class="font-display font-bold text-dark text-lg tracking-tight">HP</span>
          </div>
          <span class="hidden sm:block font-body font-semibold text-white text-lg tracking-tight">HealthProcure <span class="text-gold">Intel</span></span>
        </a>
        <div class="flex items-center gap-6 sm:gap-8">
          <a href="/tenders" class="text-sm text-gray-400 hover:text-gold transition-colors">Tenders</a>
          <a href="/blog" class="text-sm text-gray-400 hover:text-gold transition-colors">Blog</a>
          <a href="/dashboard" class="text-sm text-gray-400 hover:text-gold transition-colors">Dashboard</a>
        </div>
      </div>
    </div>
  </nav>

  <main class="max-w-3xl mx-auto px-6 lg:px-8 pt-32 pb-24">
    <nav class="flex items-center gap-2 text-xs text-gray-500 mb-8">
      <a href="/" class="hover:text-gold">Home</a><span>/</span>
      <a href="/tenders" class="hover:text-gold">Tenders</a><span>/</span>
      <span class="text-gray-400">${cat.noun.replace(/&amp;/g, "&")}</span>
    </nav>

    <div class="flex items-center gap-3 mb-5">
      <span class="text-xs px-2.5 py-1 rounded-md bg-gold/10 text-gold border border-gold/10">${reg.adj} tenders</span>
      <span class="text-xs text-gray-500">Updated live</span>
    </div>
    <h1 class="font-display text-3xl md:text-4xl font-bold text-white leading-tight mb-6">${h1}</h1>
    <p class="text-lg text-gray-300 leading-relaxed mb-8">Track live <strong class="text-white">${cat.plural} tenders</strong> ${reg.in}, aggregated from ${reg.sources.replace(/<\/?strong>/g, "")} into one searchable feed. Below is a live sample, the full, filterable set is in your dashboard.</p>

    <!-- Live tenders widget -->
    <section class="bg-gradient-to-b from-dark-100 to-dark-200 border border-gold/10 rounded-2xl p-6 md:p-8 mb-12">
      <div class="flex items-center justify-between mb-5">
        <h2 class="font-display text-xl font-bold text-white">Live ${cat.noun.replace(/&amp;/g, "&")} tenders ${reg.in}</h2>
        <span id="live-count" class="text-xs text-gray-500"></span>
      </div>
      <div id="live-tenders" class="space-y-3">
        <p class="text-sm text-gray-500">Loading live tenders&hellip;</p>
      </div>
      <a href="${dashHref}" class="inline-flex items-center gap-2 mt-6 text-gold text-sm font-medium hover:underline">
        See all ${cat.plural} tenders in the dashboard
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
      </a>
    </section>

    <div class="prose-custom">
      <h2>What ${cat.plural} tenders cover</h2>
      <p>${cat.noun.replace(/&amp;/g, "&")} procurement ${reg.in} spans a broad range of contracts, most commonly:</p>
      <ul>${cat.covers.map((x) => `<li>${x}</li>`).join("")}</ul>

      <h2>Who buys ${cat.plural} ${reg.in}</h2>
      <p>The main buyers are ${reg.buyers}. Understanding which body owns the budget, and whether they buy through a framework, a Dynamic Purchasing System or open tender, is often the difference between a bid that lands and one that never gets seen.</p>

      <h2>Where ${cat.plural} tenders are published</h2>
      <p>${reg.adj.charAt(0).toUpperCase() + reg.adj.slice(1)} ${cat.plural} opportunities are published across ${reg.sources}. HealthProcure Intel aggregates these into a single feed so you don't have to monitor each portal separately. The <strong>${codeLabel}</strong> codes to watch for this category are <strong>${codes}</strong>.</p>

      <h2>How to win ${cat.plural} contracts</h2>
      <ul>${cat.howToWin.map((x) => `<li>${x}</li>`).join("")}</ul>

      <h2>Frequently asked questions</h2>
      <p><strong>What codes cover ${cat.plural} tenders ${reg.in}?</strong><br/>They typically sit under ${codeLabel} ${codes}. Codes vary by buyer, so keyword tracking alongside code filtering catches the most.</p>
      <p><strong>Where do most ${reg.adj} ${cat.plural} tenders appear?</strong><br/>Across ${reg.sources.replace(/<\/?strong>/g, "")}. HealthProcure Intel monitors all of them in one place.</p>
      <p><strong>How do I get alerted to new ${cat.plural} tenders?</strong><br/>Create a free account, filter to ${cat.plural} ${reg.in}, and save an alert, you'll be emailed when a new matching tender is published.</p>

      <p class="text-sm text-gray-500 mt-8">Related reading: ${related}</p>
    </div>

    <div class="mt-14 bg-gradient-to-b from-dark-100 to-dark-200 border border-gold/10 rounded-2xl p-8 md:p-10 text-center">
      <h3 class="font-display text-2xl font-bold text-white mb-3">Never miss a ${cat.plural} tender ${reg.in}</h3>
      <p class="text-gray-400 mb-6 max-w-lg mx-auto">Track and get alerted to ${cat.plural} tenders ${reg.in} and worldwide. Free tier, no credit card.</p>
      <a href="/#cta" class="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-dark font-semibold text-base hover:from-gold-bright hover:to-gold transition-all duration-200 shadow-lg shadow-gold/20">Get Your Free API Key</a>
    </div>
  </main>

  <footer class="bg-dark-100 border-t border-white/5 py-10">
    <div class="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p class="text-xs text-gray-600">&copy; ${YEAR} HealthProcure Intel. All rights reserved.</p>
      <div class="flex items-center gap-6">
        <a href="/tenders" class="text-xs text-gray-500 hover:text-gold transition-colors">All tenders</a>
        <a href="/blog" class="text-xs text-gray-500 hover:text-gold transition-colors">Blog</a>
        <a href="/docs" class="text-xs text-gray-500 hover:text-gold transition-colors">API Docs</a>
      </div>
    </div>
  </footer>

  <script>
    (function () {
      var params = new URLSearchParams({ category: ${JSON.stringify(cat.cat)}, region: ${JSON.stringify(reg.region)} });
      var box = document.getElementById('live-tenders');
      var countEl = document.getElementById('live-count');
      function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
      function money(v) { if (v == null) return ''; try { return '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 }); } catch (e) { return ''; } }
      fetch('/api/v1/public-tenders?' + params.toString())
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var rows = (j && j.data) || [];
          if (!rows.length) {
            box.innerHTML = '<p class="text-sm text-gray-400">No open tenders in this category right now. <a href="/#cta" class="text-gold hover:underline">Set a free alert</a> and we\\'ll email you the moment one is published.</p>';
            return;
          }
          countEl.textContent = rows.length + ' open';
          box.innerHTML = rows.map(function (t) {
            var val = money(t.value_usd);
            var meta = [esc(t.buyer_country), val].filter(Boolean).join(' &middot; ');
            var href = t.url ? esc(t.url) : '/#cta';
            return '<a href="' + href + '" target="_blank" rel="noopener" class="block p-4 rounded-xl bg-dark-300/60 border border-white/5 hover:border-gold/30 transition-colors">' +
              '<div class="text-sm font-medium text-white leading-snug mb-1">' + esc(t.title) + '</div>' +
              '<div class="text-xs text-gray-500">' + meta + '</div></a>';
          }).join('');
        })
        .catch(function () {
          box.innerHTML = '<p class="text-sm text-gray-400"><a href="/dashboard" class="text-gold hover:underline">Open the dashboard</a> to browse live tenders.</p>';
        });
    })();
  </script>
</body>
</html>
`;
}

// ---------- hub index page ----------
function hubPage(cards) {
  const url = `${SITE}/tenders`;
  const items = cards.map(({ slug, title, reg }) => `
      <a href="/tenders/${slug}" class="group block p-5 rounded-xl bg-dark-100 border border-white/5 hover:border-gold/30 transition-colors">
        <span class="text-xs px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/10">${reg}</span>
        <div class="mt-3 text-white font-medium group-hover:text-gold transition-colors">${title}</div>
      </a>`).join("");
  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Healthcare Tenders by Category &amp; Region (${YEAR}) | HealthProcure Intel</title>
  <meta name="description" content="Browse live healthcare procurement tenders by category and region, medical devices, pharmaceuticals, diagnostics, allied health and more across the UK, EU, US and globally." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${url}" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { theme: { extend: { colors: {
      gold: { DEFAULT: '#c9a96e', dark: '#a8883f', bright: '#d4af37' },
      dark: { DEFAULT: '#0a0a0f', 100: '#12141d', 200: '#0f1117', 300: '#181b27' },
    }, fontFamily: { display: ['Playfair Display','Georgia','serif'], body: ['Inter','system-ui','sans-serif'] } } } };
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet" />
  <style> body { font-family: 'Inter', system-ui, sans-serif; background:#0a0a0f; color:#e2e8f0; } .nav-blur { backdrop-filter: blur(16px); } </style>
</head>
<body class="antialiased">
  <nav class="fixed top-0 left-0 right-0 z-50 nav-blur bg-dark/80 border-b border-white/5">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="flex items-center justify-between h-16 lg:h-20">
        <a href="/" class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center"><span class="font-display font-bold text-dark text-lg">HP</span></div>
          <span class="hidden sm:block font-semibold text-white text-lg">HealthProcure <span class="text-gold">Intel</span></span>
        </a>
        <div class="flex items-center gap-6 sm:gap-8">
          <a href="/blog" class="text-sm text-gray-400 hover:text-gold">Blog</a>
          <a href="/dashboard" class="text-sm text-gray-400 hover:text-gold">Dashboard</a>
        </div>
      </div>
    </div>
  </nav>
  <main class="max-w-5xl mx-auto px-6 lg:px-8 pt-32 pb-24">
    <h1 class="font-display text-4xl font-bold text-white mb-4">Healthcare tenders by category &amp; region</h1>
    <p class="text-lg text-gray-400 mb-12 max-w-2xl">Live procurement opportunities aggregated from TED, the UK feeds, SAM.gov, the World Bank and UNGM, browse by what you supply and where you sell.</p>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${items}
    </div>
  </main>
  <footer class="bg-dark-100 border-t border-white/5 py-10">
    <div class="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
      <p class="text-xs text-gray-600">&copy; ${YEAR} HealthProcure Intel.</p>
      <a href="/blog" class="text-xs text-gray-500 hover:text-gold">Blog</a>
    </div>
  </footer>
</body>
</html>
`;
}

// ---------- generate ----------
const cards = [];
const sitemap = [];
for (const [c, r] of COMBOS) {
  const slug = slugFor(c, r);
  writeFileSync(join(outDir, `${slug}.html`), page(c, r));
  cards.push({ slug, title: clean(titleFor(c, r)), reg: REGIONS[r].adj });
  sitemap.push(`  <url><loc>${SITE}/tenders/${slug}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`);
}
writeFileSync(join(outDir, "index.html"), hubPage(cards));
sitemap.unshift(`  <url><loc>${SITE}/tenders</loc><changefreq>daily</changefreq><priority>0.9</priority></url>`);

console.log(`Generated ${cards.length} SEO pages + hub in public/tenders/`);
console.log("\nAdd these <url> entries to public/sitemap.xml:\n");
console.log(sitemap.join("\n"));
