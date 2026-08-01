// One-off generator for a batch of SEO blog posts. Produces self-contained
// HTML files in public/blog/ that match the existing post template, and prints
// the index cards to paste into public/blog.html plus the sitemap <url> lines.
//
//   node scripts/generate-blogs.mjs
//
// Idempotent: re-running overwrites the generated files with the same content.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const blogDir = join(root, "public", "blog");
mkdirSync(blogDir, { recursive: true });

const SITE = "https://healthprocureintel.com";

// Small helpers to keep post bodies terse but real.
const h2 = (t) => `      <h2>${t}</h2>\n`;
const h3 = (t) => `      <h3>${t}</h3>\n`;
const p = (t) => `      <p>${t}</p>\n`;
const ul = (items) =>
  `      <ul>\n${items.map((i) => `        <li>${i}</li>`).join("\n")}\n      </ul>\n`;
const faq = (pairs) =>
  h2("Frequently asked questions") + pairs.map(([q, a]) => h3(q) + p(a)).join("");

function page(post) {
  const url = `${SITE}/blog/${post.slug}`;
  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${post.title} | HealthProcure Intel</title>
  <meta name="description" content="${post.desc}" />
  <meta name="keywords" content="${post.keywords}" />
  <meta name="author" content="HealthProcure Intel" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${url}" />

  <meta property="og:type" content="article" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${post.title}" />
  <meta property="og:description" content="${post.desc}" />
  <meta property="og:image" content="${SITE}/logo-hp.png" />
  <meta property="article:published_time" content="${post.date}" />

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": ${JSON.stringify(post.title)},
    "description": ${JSON.stringify(post.desc)},
    "image": "${SITE}/logo-hp.png",
    "datePublished": "${post.date}",
    "dateModified": "${post.date}",
    "author": { "@type": "Organization", "name": "HealthProcure Intel", "url": "${SITE}/" },
    "publisher": { "@type": "Organization", "name": "HealthProcure Intel", "logo": { "@type": "ImageObject", "url": "${SITE}/logo-hp.png" } },
    "mainEntityOfPage": { "@type": "WebPage", "@id": "${url}" }
  }
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: { extend: {
        colors: {
          gold: { DEFAULT: '#c9a96e', light: '#d4c4a0', dark: '#a8883f', bright: '#d4af37', muted: '#b8975a' },
          dark: { DEFAULT: '#0a0a0f', 100: '#12141d', 200: '#0f1117', 300: '#181b27', 400: '#1e2130', 500: '#252839' },
          teal: { DEFAULT: '#1a7a6d', light: '#0d9488', dark: '#145f55' },
        },
        fontFamily: { display: ['Playfair Display', 'Georgia', 'serif'], body: ['Inter', 'system-ui', 'sans-serif'] },
      } },
    };
  </script>
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; background-color: #0a0a0f; color: #e2e8f0; }
    .nav-blur { backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #0a0a0f; }
    ::-webkit-scrollbar-thumb { background: rgba(201,169,110,0.3); border-radius: 3px; }
    .prose-custom h2 { font-family: 'Playfair Display', serif; font-size: 1.75rem; font-weight: 700; color: #fff; margin-top: 2.5rem; margin-bottom: 1rem; }
    .prose-custom h3 { font-size: 1.25rem; font-weight: 600; color: #fff; margin-top: 1.75rem; margin-bottom: 0.75rem; }
    .prose-custom p { color: #cbd5e1; line-height: 1.8; margin-bottom: 1.25rem; }
    .prose-custom ul { margin-bottom: 1.25rem; padding-left: 1.5rem; }
    .prose-custom li { color: #cbd5e1; line-height: 1.7; margin-bottom: 0.5rem; list-style-type: disc; }
    .prose-custom a { color: #c9a96e; text-decoration: underline; }
    .prose-custom strong { color: #fff; font-weight: 600; }
    .prose-custom table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
    .prose-custom th { text-align: left; padding: 0.6rem; font-size: 0.85rem; color: #c9a96e; border-bottom: 1px solid rgba(255,255,255,0.1); vertical-align: top; }
    .prose-custom td { padding: 0.6rem; font-size: 0.9rem; color: #cbd5e1; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: top; }
  </style>
</head>
<body class="antialiased">

  <nav class="fixed top-0 left-0 right-0 z-50 nav-blur bg-dark/80 border-b border-white/5">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="flex items-center justify-between h-16 lg:h-20">
        <a href="/" class="flex items-center gap-3 group">
          <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center shadow-lg shadow-gold/10">
            <span class="font-display font-bold text-dark text-lg tracking-tight">HP</span>
          </div>
          <span class="hidden sm:block font-body font-semibold text-white text-lg tracking-tight">HealthProcure <span class="text-gold">Intel</span></span>
        </a>
        <div class="flex items-center gap-6 sm:gap-8">
          <a href="/" class="text-sm text-gray-400 hover:text-gold transition-colors duration-200">Home</a>
          <a href="/blog" class="text-sm text-gray-400 hover:text-gold transition-colors duration-200">Blog</a>
          <a href="/docs" class="text-sm text-gray-400 hover:text-gold transition-colors duration-200">API Docs</a>
          <a href="/dashboard" class="text-sm text-gray-400 hover:text-gold transition-colors duration-200">Dashboard</a>
        </div>
      </div>
    </div>
  </nav>

  <article class="max-w-3xl mx-auto px-6 lg:px-8 pt-32 pb-24">
    <nav class="flex items-center gap-2 text-xs text-gray-500 mb-8">
      <a href="/" class="hover:text-gold">Home</a><span>/</span>
      <a href="/blog" class="hover:text-gold">Blog</a><span>/</span>
      <span class="text-gray-400">${post.crumb}</span>
    </nav>

    <div class="flex items-center gap-3 mb-5">
      <span class="text-xs px-2.5 py-1 rounded-md bg-gold/10 text-gold border border-gold/10">${post.tag}</span>
      <span class="text-xs text-gray-500">${post.read} min read</span>
      <span class="text-xs text-gray-500">${post.dateHuman}</span>
    </div>
    <h1 class="font-display text-3xl md:text-4xl font-bold text-white leading-tight mb-6">${post.h1}</h1>

    <div class="prose-custom">
${post.body}    </div>

    <div class="mt-16 bg-gradient-to-b from-dark-100 to-dark-200 border border-gold/10 rounded-2xl p-8 md:p-10 text-center">
      <h3 class="font-display text-2xl font-bold text-white mb-3">${post.ctaTitle}</h3>
      <p class="text-gray-400 mb-6 max-w-lg mx-auto">${post.ctaText}</p>
      <a href="/#cta" class="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-dark font-semibold text-base hover:from-gold-bright hover:to-gold transition-all duration-200 shadow-lg shadow-gold/20">Get Your Free API Key</a>
    </div>

    <div class="mt-10 text-center">
      <a href="/blog" class="inline-flex items-center gap-2 text-gold text-sm font-medium hover:underline">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"/></svg>
        Back to all articles
      </a>
    </div>
  </article>

  <footer class="bg-dark-100 border-t border-white/5 py-10">
    <div class="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p class="text-xs text-gray-600">&copy; 2026 HealthProcure Intel. All rights reserved.</p>
      <div class="flex items-center gap-6">
        <a href="/" class="text-xs text-gray-500 hover:text-gold transition-colors">Home</a>
        <a href="/docs" class="text-xs text-gray-500 hover:text-gold transition-colors">API Docs</a>
        <a href="/blog" class="text-xs text-gray-500 hover:text-gold transition-colors">Blog</a>
      </div>
    </div>
  </footer>

</body>
</html>
`;
}

const DATE = "2026-07-24";
const DATE_HUMAN = "July 24, 2026";

const posts = [
  {
    slug: "allied-health-procurement-guide",
    tag: "Guide", read: 8, crumb: "Allied Health Procurement",
    title: "Allied Health Procurement: Physiotherapy & Occupational Therapy Tenders (2026)",
    h1: "Allied Health Procurement: Physiotherapy & Occupational Therapy Tenders",
    desc: "How healthcare systems buy physiotherapy, occupational therapy and other allied health services — the frameworks, evaluation criteria and where to find allied health tenders.",
    keywords: "allied health procurement, physiotherapy tenders, occupational therapy contracts, allied health services tenders, NHS physiotherapy contracts, rehabilitation services procurement",
    ctaTitle: "Track allied health tenders in one place",
    ctaText: "Physiotherapy, OT and rehabilitation service tenders from the NHS, EU and beyond — filtered to the Allied Health category. Free tier, no credit card.",
    body:
      p("<strong>Allied health procurement covers the tenders and frameworks through which health systems buy physiotherapy, occupational therapy, speech &amp; language therapy, dietetics, podiatry and related rehabilitation services.</strong> It is a distinct, fast-growing services category — quite different from buying medical devices or drugs — and it rewards providers who understand how these contracts are evaluated.") +
      h2("What counts as allied health") +
      p("Allied health professions (AHPs) are the clinical disciplines outside of medicine, nursing and pharmacy. In procurement terms the category most often spans:") +
      ul([
        "<strong>Physiotherapy</strong> — musculoskeletal, neuro, respiratory and community rehab services",
        "<strong>Occupational therapy</strong> — functional assessment, home adaptations, reablement",
        "<strong>Speech &amp; language therapy</strong>, <strong>dietetics</strong>, <strong>podiatry</strong> and <strong>orthotics</strong>",
        "Multi-disciplinary <strong>community rehabilitation</strong> and <strong>reablement</strong> contracts",
      ]) +
      h2("How allied health services are bought") +
      p("Unlike a one-off equipment purchase, allied health is usually procured as an ongoing service — via framework agreements, dynamic purchasing systems, or block/spot contracts with integrated care systems and local authorities. Buyers weigh clinical quality, workforce capacity, waiting-time performance and social value heavily, not just price. For the mechanics of these vehicles see our guides to <a href=\"/blog/framework-vs-dps\">frameworks vs DPS</a> and <a href=\"/blog/clinical-services-outsourcing\">clinical services outsourcing</a>.") +
      h2("Where allied health tenders are published") +
      ul([
        "<strong>UK Find a Tender</strong> and <strong>Contracts Finder</strong> — NHS trusts, integrated care boards and councils (CPV 85142100 physiotherapy, 85142000 paramedical services)",
        "<strong>TED Europa</strong> — allied health and rehabilitation services across EU member states",
        "<strong>Local authority</strong> portals for social-care-adjacent reablement and therapy contracts",
      ]) +
      h2("How to win allied health contracts") +
      ul([
        "Evidence <strong>outcomes</strong>, not just activity — waiting times, functional improvement, discharge rates",
        "Show <strong>workforce resilience</strong> — recruitment, retention and skill mix are scrutinised given AHP shortages",
        "Build <strong>social value</strong> into the bid — see <a href=\"/blog/nhs-net-zero-procurement\">sustainable procurement</a>",
        "Price against real award data — see <a href=\"/blog/how-to-price-a-healthcare-tender-bid\">pricing a tender bid</a>",
      ]) +
      faq([
        ["What CPV code covers physiotherapy tenders?", "Physiotherapy services usually sit under CPV 85142100, within the broader 85142000 paramedical services family. Occupational therapy and rehab often use the same codes or 85312500."],
        ["Are allied health contracts price-only?", "Rarely. Clinical quality, workforce capacity, waiting-time performance and social value typically carry the majority of the evaluation weight."],
        ["Where do most UK allied health tenders appear?", "On Find a Tender (above-threshold) and Contracts Finder (below-threshold), published by NHS trusts, integrated care boards and local authorities."],
      ]),
  },
  {
    slug: "physiotherapy-service-tenders",
    tag: "NHS", read: 7, crumb: "Physiotherapy Tenders",
    title: "How to Win NHS Physiotherapy Service Contracts (2026)",
    h1: "How to Win NHS Physiotherapy Service Contracts",
    desc: "A practical guide to NHS and community physiotherapy tenders: who buys them, how they're evaluated, the CPV codes to watch, and how to find physiotherapy contracts.",
    keywords: "physiotherapy tenders, NHS physiotherapy contracts, community physiotherapy procurement, MSK service tenders, physiotherapy framework, physio contract bidding",
    ctaTitle: "Never miss a physiotherapy tender",
    ctaText: "Set an alert for physiotherapy and MSK service tenders across the NHS and EU. Free tier, no credit card.",
    body:
      p("<strong>Physiotherapy service contracts — musculoskeletal (MSK), community rehab, neuro and respiratory physiotherapy — are among the most actively tendered allied health services.</strong> Demand is rising with elective-recovery and waiting-list pressures, which makes this a genuine growth market for independent providers and larger clinical groups alike.") +
      h2("Who commissions physiotherapy") +
      ul([
        "<strong>Integrated care boards (ICBs)</strong> — community and MSK physiotherapy at population scale — see <a href=\"/blog/integrated-care-boards-procurement\">selling to ICBs</a>",
        "<strong>NHS trusts</strong> — inpatient and outpatient physiotherapy, often via staffing frameworks",
        "<strong>Local authorities</strong> — reablement and falls-prevention services with a physiotherapy element",
      ]) +
      h2("How physiotherapy bids are scored") +
      p("Commissioners want measurable clinical outcomes and short waits. Expect quality and social value to dominate the scoring, with price a smaller (but still real) component. Strong bids evidence:") +
      ul([
        "Waiting-time and <strong>referral-to-treatment</strong> performance",
        "<strong>Outcome measures</strong> (e.g. functional and pain scores) and re-referral rates",
        "Workforce plans that address the national <strong>physiotherapist shortage</strong>",
        "Digital and <strong>telerehabilitation</strong> capability — see <a href=\"/blog/allied-health-procurement-guide\">allied health procurement</a>",
      ]) +
      h2("Finding physiotherapy tenders") +
      p("Physiotherapy contracts appear on Find a Tender and Contracts Finder under CPV 85142100, and across TED Europa for EU markets. Because they are published by many different ICBs, trusts and councils, monitoring them manually is painful — the exact problem covered in <a href=\"/blog/manual-tender-tracking-vs-platform\">manual tracking vs a platform</a>.") +
      faq([
        ["What CPV code is used for physiotherapy?", "CPV 85142100 (physiotherapy services), within the 85142000 paramedical services family."],
        ["Is physiotherapy usually a framework or a single contract?", "Both exist. Larger commissioners often use frameworks or dynamic purchasing systems; smaller or pilot services may be single block contracts."],
        ["Can independent providers win NHS physiotherapy work?", "Yes — independent and third-sector providers regularly win community and MSK physiotherapy contracts, especially where they can demonstrate capacity and short waits."],
      ]),
  },
  {
    slug: "occupational-therapy-contracts",
    tag: "Guide", read: 7, crumb: "Occupational Therapy",
    title: "Occupational Therapy Contracts: A Supplier's Guide (2026)",
    h1: "Occupational Therapy Contracts: A Supplier's Guide",
    desc: "How occupational therapy services are commissioned across health and social care — reablement, home adaptations, functional assessment — and where to find OT tenders.",
    keywords: "occupational therapy contracts, OT tenders, reablement procurement, home adaptations tenders, occupational therapy framework, OT services bidding",
    ctaTitle: "Track occupational therapy tenders",
    ctaText: "OT, reablement and adaptation service tenders from health and social care buyers — in one feed. Free tier, no credit card.",
    body:
      p("<strong>Occupational therapy (OT) sits at the intersection of health and social care, which makes its procurement landscape unusually broad.</strong> OT contracts range from hospital-based functional assessment to community reablement and local-authority home-adaptation services — commissioned by NHS bodies and councils alike.") +
      h2("The main OT contract types") +
      ul([
        "<strong>Reablement</strong> — short-term intensive support to restore independence after illness or hospital",
        "<strong>Home adaptations &amp; equipment</strong> — assessment and provision, often council-led",
        "<strong>Hospital &amp; community OT</strong> — functional assessment, discharge support",
        "<strong>Vocational rehabilitation</strong> — return-to-work OT for employers and insurers",
      ]) +
      h2("Who buys occupational therapy") +
      p("Because OT spans sectors, you will see it commissioned by integrated care boards, NHS trusts, and — very often — local authority adult social care teams. That means watching both healthcare portals and <a href=\"/blog/social-care-procurement-guide\">social care procurement</a> routes.") +
      h2("Winning OT contracts") +
      ul([
        "Evidence <strong>independence outcomes</strong> and reduced onward care needs",
        "Show fast <strong>assessment turnaround</strong> — delays create discharge and hospital-flow problems buyers care about",
        "Demonstrate an integrated <strong>health-and-social-care</strong> approach",
        "Address the OT <strong>workforce supply</strong> challenge credibly",
      ]) +
      h2("Finding OT tenders") +
      p("OT services appear on Find a Tender, Contracts Finder and local authority portals, and on TED Europa in the EU. They share CPV codes with the wider allied health family — see the <a href=\"/blog/allied-health-procurement-guide\">allied health procurement guide</a>.") +
      faq([
        ["Is occupational therapy health or social care procurement?", "Both. OT is commissioned by NHS bodies and by local-authority social care teams, so relevant tenders appear across both routes."],
        ["What outcomes do OT commissioners look for?", "Restored independence, reduced need for ongoing care, safe and timely hospital discharge, and fast assessment turnaround."],
      ]),
  },
  {
    slug: "world-bank-health-procurement",
    tag: "Global", read: 8, crumb: "World Bank Procurement",
    title: "World Bank Health Procurement: How to Bid on Globally-Financed Projects (2026)",
    h1: "World Bank Health Procurement: How to Bid on Globally-Financed Projects",
    desc: "How World Bank-financed health projects are procured, the rules that apply, and how suppliers find and bid on health-sector opportunities across 100+ countries.",
    keywords: "World Bank health procurement, World Bank tenders, globally financed health projects, World Bank procurement notices, development bank tenders, health system strengthening contracts",
    ctaTitle: "Track World Bank health tenders",
    ctaText: "Health-sector procurement notices from World Bank-financed projects across 100+ countries, in one feed. Free tier, no credit card.",
    body:
      p("<strong>The World Bank finances health projects — hospitals, health-system strengthening, disease programmes, medical equipment — across more than 100 countries, and each generates procurement notices open to international suppliers.</strong> It is one of the largest and least-understood healthcare procurement channels in the world.") +
      h2("How World Bank procurement works") +
      p("World Bank-financed contracts are procured by the borrowing country's implementing agency, but under the Bank's Procurement Regulations rather than purely national rules. That standardisation is an advantage for foreign suppliers — the process is more predictable across markets. Notices are published continuously as projects move from approval into implementation.") +
      h2("The kinds of health opportunities") +
      ul([
        "<strong>Goods</strong> — medical equipment, pharmaceuticals, diagnostics, cold-chain and PPE",
        "<strong>Works</strong> — hospital and clinic construction and rehabilitation",
        "<strong>Consulting services</strong> — health-system design, project management, clinical training",
      ]) +
      h2("What suppliers need to know") +
      ul([
        "Watch the <strong>procurement method</strong> — international vs national competitive procurement changes who can bid",
        "Registration and <strong>eligibility</strong> rules matter; check debarment/exclusion lists",
        "Lead times are long — track projects from <strong>approval</strong>, not just when notices appear",
        "Compare with other global buyers in <a href=\"/blog/who-procurement-vs-unicef-supply-division\">WHO vs UNICEF Supply Division</a>",
      ]) +
      h2("Finding World Bank health tenders") +
      p("The Bank publishes procurement notices through its project operations feed, mixed across every sector and country. Isolating the health-relevant slice — and doing it daily — is exactly what HealthProcure Intel automates, alongside the EU, UK and US channels.") +
      faq([
        ["Can foreign companies bid on World Bank health projects?", "Yes — under international competitive procurement methods, eligible foreign suppliers can bid directly. Some contracts use national procurement, which is more restricted."],
        ["Who actually runs the tender?", "The borrowing country's implementing agency runs the procurement, but under the World Bank's Procurement Regulations."],
        ["How far ahead can you see opportunities?", "Projects are visible from approval, often months before individual procurement notices are published — useful lead time for planning."],
      ]),
  },
  {
    slug: "canadabuys-healthcare-tenders",
    tag: "Canada", read: 7, crumb: "CanadaBuys",
    title: "CanadaBuys Healthcare Tenders: A Supplier's Guide (2026)",
    h1: "CanadaBuys Healthcare Tenders: A Supplier's Guide",
    desc: "How to find and bid on Canadian healthcare tenders through CanadaBuys — the federal procurement service — plus provincial routes and classification codes.",
    keywords: "CanadaBuys, Canada healthcare tenders, Canadian government procurement, CanadaBuys medical tenders, Canada public sector procurement, GETS Canada tenders",
    ctaTitle: "Track Canadian healthcare tenders",
    ctaText: "CanadaBuys healthcare opportunities alongside the EU, UK, US and global feeds. Free tier, no credit card.",
    body:
      p("<strong>CanadaBuys is the Government of Canada's official procurement service, and it publishes open tender notices — including a steady stream of healthcare and medical opportunities — as machine-readable open data.</strong> For suppliers already selling into the US or UK, Canada is an accessible next market.") +
      h2("How Canadian public procurement is structured") +
      ul([
        "<strong>Federal</strong> — CanadaBuys is the single window for federal opportunities (replacing the older Buyandsell/MERX GETS route)",
        "<strong>Provincial &amp; territorial</strong> — each province runs its own portal; health authorities buy at this level too",
        "<strong>Group purchasing organisations</strong> — much clinical purchasing runs through regional health-authority GPOs",
      ]) +
      h2("Finding healthcare opportunities on CanadaBuys") +
      p("CanadaBuys classifies notices with UNSPSC codes rather than CPV. Medical and health opportunities cluster in the medical-equipment, pharmaceutical and health-services segments. Healthcare buyers include federal bodies (e.g. Indigenous Services, the military health system, Veterans Affairs) plus, at provincial level, the health authorities.") +
      h2("Tips for bidding into Canada") +
      ul([
        "Watch for <strong>trade-agreement</strong> thresholds (CFTA/CETA) that open contracts to more bidders",
        "Bilingual (English/French) documentation is often required",
        "Register early — some processes need supplier registration before you can respond",
        "Benchmark against award notices — see <a href=\"/blog/reading-contract-award-notices\">how to read a contract award notice</a>",
      ]) +
      faq([
        ["What classification codes does CanadaBuys use?", "UNSPSC codes. Healthcare opportunities appear mainly in the medical equipment, pharmaceutical and health-services segments."],
        ["Did CanadaBuys replace Buyandsell.gc.ca?", "Yes — CanadaBuys is the current single window for Government of Canada tender opportunities."],
        ["Can non-Canadian suppliers bid?", "Often yes, particularly where trade agreements (CFTA, CETA, CPTPP) apply and open the contract to international competition."],
      ]),
  },
  {
    slug: "contracts-finder-explained",
    tag: "UK", read: 7, crumb: "Contracts Finder",
    title: "Contracts Finder Explained: UK Below-Threshold Healthcare Tenders (2026)",
    h1: "Contracts Finder Explained: UK Below-Threshold Healthcare Tenders",
    desc: "What Contracts Finder is, how it differs from Find a Tender, and how healthcare suppliers use it to win NHS and local-authority contracts below the high-value threshold.",
    keywords: "Contracts Finder, UK healthcare tenders, below threshold contracts, NHS local tenders, Contracts Finder vs Find a Tender, UK public procurement",
    ctaTitle: "Track Contracts Finder + Find a Tender together",
    ctaText: "Both UK portals in one feed, filtered to healthcare, with award data. Free tier, no credit card.",
    body:
      p("<strong>Contracts Finder is the UK government's portal for lower-value public contracts — and it's where a huge volume of everyday NHS and local-authority healthcare spend is advertised.</strong> Suppliers who only watch the high-value Find a Tender service miss most of it.") +
      h2("Contracts Finder vs Find a Tender") +
      p("The two portals split by contract value. In simple terms:") +
      ul([
        "<strong>Find a Tender (FTS)</strong> — above-threshold, higher-value public contracts (including major NHS and NHS Supply Chain frameworks)",
        "<strong>Contracts Finder</strong> — below-threshold opportunities and contract awards from central government, the NHS and local authorities",
      ]) +
      p("For the higher-value side and how NHS Supply Chain fits in, see <a href=\"/blog/nhs-supply-chain-vs-find-a-tender\">NHS Supply Chain vs Find a Tender</a>.") +
      h2("Why below-threshold matters for healthcare suppliers") +
      ul([
        "Far more <strong>volume</strong> — most contracts by count are below threshold",
        "Lower <strong>competition</strong> on smaller lots, and a route to build NHS track record",
        "A path to becoming an established supplier — see <a href=\"/blog/how-to-become-an-nhs-supplier\">how to become an NHS supplier</a>",
      ]) +
      h2("How to use Contracts Finder well") +
      p("Contracts Finder publishes both opportunities and award notices as OCDS open data (see <a href=\"/blog/understanding-ocds\">OCDS explained</a>). That means you can systematically track who is winning what — invaluable competitive intelligence. Filtering the healthcare slice out of a general-government feed, daily, is the fragmentation problem HealthProcure Intel solves.") +
      faq([
        ["Is Contracts Finder only for small contracts?", "It focuses on below-threshold opportunities and awards, but the volume is enormous — it is where most NHS and council contracts by count are advertised."],
        ["Does Contracts Finder show contract awards?", "Yes — it publishes award notices as well as opportunities, which makes it a strong source of competitive intelligence."],
        ["Do I need to watch both Contracts Finder and Find a Tender?", "Yes, to see the full UK picture — they split by contract value and each carries opportunities the other does not."],
      ]),
  },
  {
    slug: "surgical-instruments-procurement",
    tag: "Guide", read: 7, crumb: "Surgical Instruments",
    title: "Surgical Instruments Procurement: A Supplier's Guide (2026)",
    h1: "Surgical Instruments Procurement: A Supplier's Guide",
    desc: "How hospitals and health systems buy surgical instruments and operating-theatre equipment, the compliance that applies, and where to find surgical instrument tenders.",
    keywords: "surgical instruments procurement, operating theatre equipment tenders, surgical instrument suppliers, NHS surgical tenders, orthopaedic implants procurement, CE marked surgical instruments",
    ctaTitle: "Find surgical instrument tenders everywhere",
    ctaText: "Surgical and theatre equipment tenders from the EU, UK, US and beyond, in one dashboard. Free tier, no credit card.",
    body:
      p("<strong>Surgical instruments procurement spans everything from basic reusable instruments to high-value orthopaedic implants, energy devices and complete operating-theatre systems.</strong> It is a technically demanding, compliance-heavy category with long framework cycles.") +
      h2("How surgical instruments are bought") +
      ul([
        "<strong>National frameworks</strong> (e.g. NHS Supply Chain) for reusable instruments and consumables",
        "<strong>Capital tenders</strong> for theatre systems, imaging and energy platforms",
        "<strong>Managed service</strong> and consignment arrangements for implants",
      ]) +
      h2("Compliance and evaluation") +
      p("Instruments used in surgery face strict regulatory and quality requirements. Buyers typically require:") +
      ul([
        "<strong>CE / UKCA marking</strong> and conformity with the EU MDR / UK MDR",
        "<strong>ISO 13485</strong> quality management and full traceability",
        "Sterilisation, reprocessing and <strong>decontamination</strong> evidence for reusables",
        "Clinical evaluation and, for implants, outcomes/registry data",
      ]) +
      h2("Finding surgical instrument tenders") +
      p("Surgical tenders (CPV 33169000 surgical instruments, 33162000 theatre apparatus) appear across TED Europa, UK Find a Tender and NHS Supply Chain, plus US federal channels. Selling across regions means monitoring several portals — see <a href=\"/blog/selling-medical-devices-to-the-nhs\">selling medical devices to the NHS</a> for the UK-specific path.") +
      faq([
        ["What CPV codes cover surgical instruments?", "Mainly 33169000 (surgical instruments) and 33162000 (operating theatre devices and apparatus)."],
        ["What compliance do surgical instruments need?", "CE/UKCA marking under the MDR, ISO 13485 quality management, full traceability, and decontamination evidence for reusable instruments."],
      ]),
  },
  {
    slug: "laboratory-equipment-tenders",
    tag: "Guide", read: 7, crumb: "Laboratory Equipment",
    title: "Laboratory Equipment Tenders: How Diagnostics Labs Buy (2026)",
    h1: "Laboratory Equipment Tenders: How Diagnostics Labs Buy",
    desc: "How clinical and public-health laboratories procure analysers, reagents and automation, the reagent-rental model, and where to find laboratory equipment tenders.",
    keywords: "laboratory equipment tenders, lab analyser procurement, reagent rental contracts, clinical laboratory tenders, diagnostics procurement, pathology equipment tenders",
    ctaTitle: "Track laboratory equipment tenders",
    ctaText: "Analyser, reagent and lab automation tenders across every major market. Free tier, no credit card.",
    body:
      p("<strong>Laboratory equipment procurement is dominated by long-term, high-value contracts that bundle analysers, reagents, consumables, service and IT into a single managed arrangement.</strong> Understanding that model is the key to competing.") +
      h2("The reagent-rental / managed model") +
      p("Labs rarely buy an analyser outright. Instead they run <strong>reagent-rental</strong> or managed-service contracts where the instrument is provided in exchange for a committed reagent volume over 5–7 years. This makes total-cost-of-ownership and cost-per-test the decisive metrics, not the sticker price of the machine.") +
      h2("What buyers evaluate") +
      ul([
        "<strong>Cost per reportable result</strong> across the full test menu",
        "<strong>Throughput, uptime</strong> and turnaround-time guarantees",
        "<strong>Menu breadth</strong> and consolidation onto fewer platforms",
        "<strong>Middleware / LIMS integration</strong> — see <a href=\"/blog/diagnostics-procurement-guide\">diagnostics procurement</a>",
      ]) +
      h2("Finding laboratory tenders") +
      p("Lab equipment and diagnostics tenders appear under CPV 38000000 (laboratory equipment) and the 33124000 diagnostics family across TED Europa, UK Find a Tender and NHS Supply Chain, plus World Bank-financed lab strengthening projects in emerging markets — see <a href=\"/blog/world-bank-health-procurement\">World Bank health procurement</a>.") +
      faq([
        ["What is a reagent-rental contract?", "An arrangement where the supplier provides the analyser at little or no upfront cost in exchange for a committed reagent purchase volume over several years."],
        ["What CPV code covers laboratory equipment?", "CPV 38000000 covers laboratory, optical and precision equipment; diagnostics reagents and kits sit in the 33124000 family."],
      ]),
  },
  {
    slug: "clinical-services-outsourcing",
    tag: "Guide", read: 7, crumb: "Clinical Services",
    title: "Clinical Services Outsourcing: Tenders & Frameworks (2026)",
    h1: "Clinical Services Outsourcing: Tenders & Frameworks",
    desc: "How health systems outsource clinical services — diagnostics reporting, staffing, community services — the frameworks used, and where to find clinical service tenders.",
    keywords: "clinical services outsourcing, clinical service tenders, NHS insourcing outsourcing, teleradiology tenders, clinical staffing frameworks, community services procurement",
    ctaTitle: "Track clinical service tenders",
    ctaText: "Outsourced clinical, diagnostic and staffing tenders across the NHS and EU. Free tier, no credit card.",
    body:
      p("<strong>Clinical services outsourcing covers the growing market for delivering clinical care under contract — from teleradiology reporting and elective insourcing to community services and clinical staffing.</strong> Waiting-list recovery has expanded this category sharply.") +
      h2("Common clinical service contracts") +
      ul([
        "<strong>Diagnostics reporting</strong> — outsourced teleradiology and pathology to clear backlogs",
        "<strong>Elective insourcing / outsourcing</strong> — additional capacity for planned procedures",
        "<strong>Community services</strong> — nursing, therapy and long-term condition management",
        "<strong>Clinical staffing frameworks</strong> — locum and agency provision",
      ]) +
      h2("How these are evaluated") +
      p("Clinical governance is front and centre. Buyers scrutinise CQC registration and ratings, clinical outcomes, workforce credentialing and information governance far more than in a product tender. Price still matters, but a weak clinical-quality response is usually fatal.") +
      h2("Finding clinical service tenders") +
      p("These appear on Find a Tender and Contracts Finder (and TED in the EU), commissioned by trusts and integrated care boards. The allied health slice — physiotherapy, OT — is a related but distinct category; see <a href=\"/blog/allied-health-procurement-guide\">allied health procurement</a>.") +
      faq([
        ["What is the difference between insourcing and outsourcing?", "Insourcing brings an external clinical team to work within the hospital's own facilities; outsourcing sends the work to the provider's site. Both are procured via tender."],
        ["What matters most in a clinical services bid?", "Clinical governance — CQC registration/ratings, outcomes, workforce credentialing and information governance — typically outweighs price."],
      ]),
  },
  {
    slug: "social-care-procurement-guide",
    tag: "Guide", read: 7, crumb: "Social Care",
    title: "Social Care Procurement: A Provider's Guide (2026)",
    h1: "Social Care Procurement: A Provider's Guide",
    desc: "How local authorities and the NHS commission social care — home care, residential, supported living — the frameworks used, and where to find social care tenders.",
    keywords: "social care procurement, home care tenders, domiciliary care contracts, supported living tenders, adult social care commissioning, care provider bidding",
    ctaTitle: "Track social care tenders",
    ctaText: "Home care, residential and supported-living tenders from councils and the NHS. Free tier, no credit card.",
    body:
      p("<strong>Social care procurement is run largely by local authorities, commissioning home care, residential and nursing placements, supported living and reablement at very large scale.</strong> It overlaps with health at the edges — reablement, occupational therapy and continuing healthcare — making it relevant to many health suppliers too.") +
      h2("How social care is commissioned") +
      ul([
        "<strong>Frameworks and DPS</strong> for home care and supported living — providers onboard then win call-offs",
        "<strong>Block and spot contracts</strong> for residential/nursing placements",
        "<strong>Section 75 / joint</strong> arrangements where the NHS and councils commission together",
      ]) +
      h2("What commissioners look for") +
      ul([
        "<strong>CQC registration and rating</strong> — a baseline requirement",
        "<strong>Workforce</strong> stability, pay and training in a high-turnover sector",
        "<strong>Outcomes and safeguarding</strong> track record",
        "<strong>Social value</strong> and local employment commitments",
      ]) +
      h2("Finding social care tenders") +
      p("Most appear on Contracts Finder and individual council portals, with higher-value framework tenders on Find a Tender. The health-adjacent parts (reablement, OT) also surface in <a href=\"/blog/occupational-therapy-contracts\">occupational therapy contracts</a>.") +
      faq([
        ["Who commissions most social care?", "Local authority adult social care teams, often jointly with the NHS for health-adjacent services like reablement and continuing healthcare."],
        ["Is CQC registration required to bid?", "For regulated activities, yes — CQC registration and a reasonable rating are typically baseline requirements."],
      ]),
  },
  {
    slug: "understanding-cpv-codes",
    tag: "Reference", read: 6, crumb: "CPV Codes",
    title: "Understanding CPV Codes for Healthcare Tenders (2026)",
    h1: "Understanding CPV Codes for Healthcare Tenders",
    desc: "What CPV codes are, how the healthcare-relevant 33xxxxxx and 85xxxxxx families work, and how to use them to find the right medical tenders and filter out noise.",
    keywords: "CPV codes, healthcare CPV codes, CPV 33000000, medical device CPV, CPV code list healthcare, how to use CPV codes",
    ctaTitle: "Search tenders by CPV automatically",
    ctaText: "We classify every tender by CPV and category so you can filter to exactly your market. Free tier, no credit card.",
    body:
      p("<strong>CPV (Common Procurement Vocabulary) codes are the standardised classification system used across EU and UK public procurement to describe what a contract is for.</strong> For healthcare suppliers they are the single most useful tool for finding relevant tenders and filtering out everything else.") +
      h2("How CPV codes are structured") +
      p("A CPV code is an eight-digit number (plus a check digit), organised as a hierarchy — the first two digits are the division, and each subsequent pair narrows the category. For healthcare, two divisions matter most:") +
      ul([
        "<strong>33xxxxxx</strong> — medical equipments, pharmaceuticals and personal care products",
        "<strong>85xxxxxx</strong> — health and social work services",
      ]) +
      h2("Key healthcare CPV families") +
      ul([
        "<strong>33100000</strong> medical equipments &middot; <strong>33600000</strong> pharmaceuticals &middot; <strong>33140000</strong> medical consumables/PPE",
        "<strong>33124000</strong> diagnostics &middot; <strong>33169000</strong> surgical instruments &middot; <strong>38000000</strong> laboratory equipment",
        "<strong>85142100</strong> physiotherapy &middot; <strong>85142000</strong> paramedical &middot; <strong>85300000</strong> social work services",
      ]) +
      h2("Using CPV codes in practice") +
      p("Buyers tag each notice with one or more CPV codes; you search by them to find your market. But codes are applied inconsistently — a health notice may be tagged only at line-item level, or with a too-generic parent code — so pure CPV filtering misses tenders. Combining CPV with keyword classification (what HealthProcure Intel does) catches far more. For the US equivalent see <a href=\"/blog/cpv-codes-vs-naics-codes\">CPV codes vs NAICS codes</a>.") +
      faq([
        ["What CPV division covers medical devices?", "Division 33 (medical equipments, pharmaceuticals and personal care products). Health and social-work services sit in division 85."],
        ["Why do CPV searches miss relevant tenders?", "Because buyers apply codes inconsistently — sometimes only at line-item level or with an over-generic parent code. Combining CPV with keyword matching catches more."],
      ]),
  },
  {
    slug: "understanding-ocds",
    tag: "Reference", read: 6, crumb: "OCDS",
    title: "OCDS Explained: Open Contracting Data for Healthcare Suppliers (2026)",
    h1: "OCDS Explained: Open Contracting Data for Healthcare Suppliers",
    desc: "What the Open Contracting Data Standard (OCDS) is, which UK portals use it, and how healthcare suppliers can use open contracting data for competitive intelligence.",
    keywords: "OCDS, open contracting data standard, Find a Tender API, Contracts Finder OCDS, open contracting healthcare, procurement open data",
    ctaTitle: "Turn open contracting data into an edge",
    ctaText: "We parse OCDS feeds daily so you see opportunities and awards without touching an API. Free tier, no credit card.",
    body:
      p("<strong>The Open Contracting Data Standard (OCDS) is a common, machine-readable format for publishing public procurement data — and the UK's Find a Tender and Contracts Finder both use it.</strong> For suppliers, OCDS turns procurement from a pile of PDFs into structured, queryable data.") +
      h2("What OCDS contains") +
      p("An OCDS release describes a contracting process through its stages — planning, tender, award and contract — with structured fields for buyer, value, dates, classification (CPV) and suppliers. Crucially it covers <strong>awards</strong>, not just opportunities, so you can see who won and for how much.") +
      h2("Why it matters for healthcare suppliers") +
      ul([
        "Systematic <strong>opportunity discovery</strong> by CPV, buyer and keyword",
        "<strong>Competitive intelligence</strong> from award data — see <a href=\"/blog/who-is-winning-healthcare-contracts-award-data\">who is winning healthcare contracts</a>",
        "Reliable <strong>deadlines and values</strong> in structured fields, not buried in documents",
      ]) +
      h2("The catch: it's still a data-engineering job") +
      p("OCDS feeds are large, paginated, rate-limited and mixed across every sector — extracting the healthcare slice daily, de-duplicating it and linking awards to tenders is real engineering. That is precisely the pipeline HealthProcure Intel runs so you don't have to. For how it compares across borders see <a href=\"/blog/reading-contract-award-notices\">reading a contract award notice</a>.") +
      faq([
        ["Which UK portals use OCDS?", "Both Find a Tender and Contracts Finder publish OCDS release packages via their APIs."],
        ["Does OCDS include who won a contract?", "Yes — OCDS covers the award stage, including supplier names and values, which makes it valuable for competitive intelligence."],
      ]),
  },
  {
    slug: "bid-writing-tips-healthcare",
    tag: "How-to", read: 7, crumb: "Bid Writing",
    title: "10 Bid-Writing Tips for Healthcare Tenders (2026)",
    h1: "10 Bid-Writing Tips for Healthcare Tenders",
    desc: "Practical, tested bid-writing tips for healthcare and NHS tenders — how to score higher on quality questions, evidence outcomes, and avoid the mistakes that lose bids.",
    keywords: "bid writing healthcare, NHS bid writing tips, tender writing, winning tender responses, healthcare bid quality questions, tender response tips",
    ctaTitle: "Spend your time bidding, not searching",
    ctaText: "We surface every relevant tender so your team can focus on writing winning responses. Free tier, no credit card.",
    body:
      p("<strong>Most healthcare tenders are won or lost on the quality responses, not the price.</strong> These ten tips come straight from what evaluators reward — and penalise — on NHS and public-sector bids.") +
      h2("The ten tips") +
      ul([
        "<strong>Answer the question asked</strong> — score against the published criteria, not the story you want to tell",
        "<strong>Evidence everything</strong> — replace claims with numbers, case studies and named outcomes",
        "<strong>Mirror the weighting</strong> — put your effort where the marks are",
        "<strong>Lead with outcomes</strong> — waiting times, clinical results, patient experience",
        "<strong>Show workforce resilience</strong> — recruitment, retention, training and cover",
        "<strong>Build in social value</strong> deliberately — see <a href=\"/blog/nhs-net-zero-procurement\">sustainable procurement</a>",
        "<strong>Price with evidence</strong> — benchmark against award data, see <a href=\"/blog/how-to-price-a-healthcare-tender-bid\">pricing a bid</a>",
        "<strong>Make it easy to mark</strong> — headings that match the question, no wall of text",
        "<strong>Get the compliance basics right</strong> — a failed pass/fail question sinks the whole bid",
        "<strong>Start early</strong> — a good bid team needs runway, see <a href=\"/blog/how-to-build-a-winning-bid-team\">building a bid team</a>",
      ]) +
      h2("The mistakes that lose bids") +
      p("Generic boilerplate, ignoring the weighting, unevidenced claims and missing a mandatory requirement are the recurring reasons good providers still lose. For a fuller list see <a href=\"/blog/common-mistakes-losing-healthcare-tenders\">common mistakes that lose tenders</a>.") +
      faq([
        ["What matters more in healthcare tenders, price or quality?", "Usually quality — clinical outcomes, governance and social value typically carry the majority of the marks, with price a smaller share."],
        ["How early should you start a bid?", "As early as possible — the strongest bids are planned before the tender even drops, using pipeline intelligence to anticipate it."],
      ]),
  },
  {
    slug: "framework-vs-dps",
    tag: "Reference", read: 6, crumb: "Frameworks vs DPS",
    title: "Frameworks vs Dynamic Purchasing Systems (DPS) Explained (2026)",
    h1: "Frameworks vs Dynamic Purchasing Systems (DPS) Explained",
    desc: "The difference between framework agreements and dynamic purchasing systems in healthcare procurement, when each is used, and what they mean for suppliers.",
    keywords: "framework vs DPS, dynamic purchasing system, framework agreement healthcare, DPS procurement, NHS frameworks, how frameworks work",
    ctaTitle: "Track frameworks and DPS opportunities",
    ctaText: "Framework and DPS tenders across the NHS and EU, with award data. Free tier, no credit card.",
    body:
      p("<strong>Framework agreements and dynamic purchasing systems (DPS) are the two main vehicles buyers use to procure repeatedly without running a full tender each time — and they behave very differently for suppliers.</strong>") +
      h2("Framework agreements") +
      p("A framework is a pre-approved list of suppliers, set up for a fixed term (typically 2–4 years), from which buyers place orders or run mini-competitions. The list is <strong>closed</strong> once awarded — miss the tender and you usually wait years for the next round. See <a href=\"/blog/framework-agreements-healthcare-procurement\">framework agreements in depth</a>.") +
      h2("Dynamic purchasing systems") +
      p("A DPS is an <strong>open</strong> supplier list that new suppliers can join at any time during its life, provided they meet the selection criteria. Buyers then run call-off competitions among qualified suppliers. DPS suit markets that change quickly or have many small providers — such as staffing, home care and community services.") +
      h2("Framework vs DPS at a glance") +
      ul([
        "<strong>Entry</strong>: framework = fixed window; DPS = join any time",
        "<strong>Term</strong>: framework = fixed; DPS = often longer/open-ended",
        "<strong>Best for</strong>: framework = stable products; DPS = fast-moving or fragmented services",
      ]) +
      p("The practical lesson: for a framework, never miss the tender window — see <a href=\"/blog/tender-deadline-management\">managing tender deadlines</a>.") +
      faq([
        ["Can I join a framework after it's awarded?", "No — frameworks are closed once awarded. You must bid in the tender window; the next chance is when the framework is re-let."],
        ["Can I join a DPS at any time?", "Yes — a DPS remains open throughout its life, so you can apply to join whenever you meet the selection criteria."],
      ]),
  },
  {
    slug: "integrated-care-boards-procurement",
    tag: "NHS", read: 7, crumb: "ICB Procurement",
    title: "Selling to NHS Integrated Care Boards (ICBs) in 2026",
    h1: "Selling to NHS Integrated Care Boards (ICBs)",
    desc: "How NHS integrated care boards commission and procure, how the Provider Selection Regime changes the rules, and how suppliers find ICB opportunities.",
    keywords: "integrated care boards, ICB procurement, NHS ICB tenders, provider selection regime, ICS commissioning, selling to the NHS",
    ctaTitle: "Track ICB opportunities across England",
    ctaText: "Integrated care board and NHS tenders in one feed, filtered to your category. Free tier, no credit card.",
    body:
      p("<strong>Integrated care boards (ICBs) are the statutory NHS bodies that plan and commission most health services for their populations — making them central customers for clinical services, community care and health tech.</strong> Understanding how they buy is essential for any healthcare supplier in England.") +
      h2("How ICBs commission") +
      p("Since 2023, many NHS clinical service arrangements fall under the <strong>Provider Selection Regime (PSR)</strong> rather than standard procurement rules. The PSR gives ICBs more discretion — including the ability to continue with an incumbent or select without full competition where justified — which changes how suppliers position themselves. Non-clinical goods and services still follow mainstream public procurement.") +
      h2("What this means for suppliers") +
      ul([
        "<strong>Relationships and evidence matter earlier</strong> — decisions may not always go to open tender",
        "<strong>Transparency notices</strong> are still published — watch them to see intended awards",
        "For goods and non-clinical services, standard <strong>Find a Tender / Contracts Finder</strong> routes still apply",
      ]) +
      h2("Finding ICB opportunities") +
      p("ICB opportunities and PSR transparency notices surface across Find a Tender and Contracts Finder. Because there are dozens of ICBs each publishing separately, tracking them all manually is impractical — see <a href=\"/blog/how-to-find-nhs-tenders\">how to find NHS tenders</a>.") +
      faq([
        ["What is the Provider Selection Regime?", "A set of NHS-specific rules (from 2023) for procuring clinical healthcare services, giving ICBs more flexibility than standard procurement — including selecting without full competition in defined circumstances."],
        ["Do ICBs still publish tenders?", "Yes — for goods and non-clinical services under standard rules, and PSR transparency notices for clinical services, both visible on Find a Tender and Contracts Finder."],
      ]),
  },
  {
    slug: "tender-deadline-management",
    tag: "How-to", read: 6, crumb: "Deadline Management",
    title: "Never Miss a Tender Deadline: A Management Guide (2026)",
    h1: "Never Miss a Tender Deadline: A Management Guide",
    desc: "A practical system for tracking healthcare tender deadlines across multiple portals, building a bid pipeline, and never missing a framework window again.",
    keywords: "tender deadline management, tender pipeline, never miss a tender, bid pipeline management, tender tracking system, healthcare tender deadlines",
    ctaTitle: "Automate your tender pipeline",
    ctaText: "Daily alerts and a single feed across 8 sources mean you never miss a relevant deadline. Free tier, no credit card.",
    body:
      p("<strong>Missing a tender deadline is the most avoidable way to lose business — and with frameworks, one missed window can mean waiting years for another chance.</strong> The fix is a simple, disciplined pipeline system.") +
      h2("Why deadlines get missed") +
      ul([
        "Relevant tenders are spread across <strong>many portals</strong> (TED, Find a Tender, Contracts Finder, NHS Supply Chain, World Bank, and more)",
        "Manual checking is <strong>inconsistent</strong> — people get busy and gaps appear",
        "Framework windows are <strong>infrequent</strong>, so there's no second chance soon",
      ]) +
      h2("A pipeline that works") +
      ul([
        "<strong>Centralise</strong> every relevant opportunity into one list, automatically",
        "Capture the <strong>key dates</strong> — clarification deadline, submission deadline, framework term",
        "Score opportunities <strong>bid/no-bid</strong> early so effort goes to winnable work",
        "Set <strong>alerts</strong> for new tenders matching your category and buyer profile",
      ]) +
      h2("Automating it") +
      p("The reliable way to never miss a deadline is to stop relying on manual checks. Aggregation plus alerts turns a scattered, error-prone routine into a single daily feed — the case made in <a href=\"/blog/manual-tender-tracking-vs-platform\">manual tracking vs a platform</a> and <a href=\"/blog/healthcare-tender-alerts-guide\">tender alerts</a>.") +
      faq([
        ["How do suppliers usually miss deadlines?", "By relying on manual checks across many separate portals — gaps appear when people are busy, and infrequent framework windows offer no quick second chance."],
        ["What dates should a tender pipeline track?", "At minimum the clarification-question deadline, the submission deadline, and the framework term (so you know when the next window opens)."],
      ]),
  },
  {
    slug: "reading-contract-award-notices",
    tag: "How-to", read: 6, crumb: "Award Notices",
    title: "How to Read a Contract Award Notice (2026)",
    h1: "How to Read a Contract Award Notice",
    desc: "What a contract award notice tells you, how to mine award data for competitive intelligence, and how to use it to price and target future healthcare bids.",
    keywords: "contract award notice, award data, procurement competitive intelligence, who won the contract, award notice fields, healthcare award data",
    ctaTitle: "Turn award notices into intelligence",
    ctaText: "We collect award notices across every source so you can see who's winning and at what value. Free tier, no credit card.",
    body:
      p("<strong>A contract award notice tells you who won a contract, for how much, and for how long — making it one of the most valuable, and most underused, sources of competitive intelligence in procurement.</strong>") +
      h2("What's in an award notice") +
      ul([
        "<strong>Winning supplier(s)</strong> and, for frameworks, the full awarded list",
        "<strong>Award value</strong> and contract duration",
        "The <strong>buyer</strong>, the <strong>CPV</strong> classification and the procedure used",
        "Sometimes the <strong>number of bidders</strong> — a signal of how competitive the lot was",
      ]) +
      h2("How to use award data") +
      ul([
        "<strong>Benchmark price</strong> — real award values are the best guide to what will win, see <a href=\"/blog/how-to-price-a-healthcare-tender-bid\">pricing a bid</a>",
        "<strong>Map competitors</strong> — who wins what, where, and how often",
        "<strong>Anticipate re-tenders</strong> — award duration tells you when a contract comes back to market",
        "<strong>Target buyers</strong> — see which authorities buy your category and at what scale",
      ]) +
      h2("Where award notices live") +
      p("Awards are published alongside opportunities on TED Europa, Find a Tender, Contracts Finder and other portals — often as structured OCDS data (see <a href=\"/blog/understanding-ocds\">OCDS explained</a>). Aggregating them into a searchable competitor and pricing view is exactly what <a href=\"/blog/who-is-winning-healthcare-contracts-award-data\">award-data analysis</a> enables.") +
      faq([
        ["What can you learn from a contract award notice?", "Who won, the value, the duration, the buyer and classification — enough to benchmark pricing, map competitors and predict when the contract returns to market."],
        ["When will a contract come back to tender?", "Roughly at the end of its stated duration (plus any extensions) — award notices give you the duration so you can plan ahead."],
      ]),
  },
  {
    slug: "medtech-market-entry-europe",
    tag: "Guide", read: 7, crumb: "EU Market Entry",
    title: "MedTech Market Entry in Europe via TED (2026)",
    h1: "MedTech Market Entry in Europe via TED",
    desc: "How medical device companies enter European markets through public procurement, using TED Europa to find tenders across 27 member states, plus the compliance that applies.",
    keywords: "medtech market entry Europe, TED Europa medical devices, EU medical device tenders, CE marking MDR, European healthcare procurement, selling medical devices in EU",
    ctaTitle: "See every EU healthcare tender in one place",
    ctaText: "TED Europa healthcare tenders across all 27 member states, classified and searchable. Free tier, no credit card.",
    body:
      p("<strong>For medical device companies, public procurement is the primary route into European healthcare markets — and TED Europa is the single window where above-threshold tenders from all 27 EU member states are published.</strong>") +
      h2("Why TED is the entry point") +
      p("Every EU public contract above the relevant threshold must be advertised on TED (Tenders Electronic Daily). That makes it the definitive map of the European opportunity — but it is vast, multilingual and mixed across every sector, so finding your healthcare slice is the challenge. See <a href=\"/blog/understanding-ted-europa\">understanding TED Europa</a>.") +
      h2("Compliance for the EU market") +
      ul([
        "<strong>CE marking under the EU MDR</strong> (Medical Device Regulation) is non-negotiable",
        "A <strong>Notified Body</strong> conformity assessment for most device classes",
        "An <strong>Authorised Representative</strong> if you're based outside the EU",
        "Country-specific <strong>registration and language</strong> requirements per market",
      ]) +
      h2("A practical market-entry approach") +
      ul([
        "Use TED to <strong>size the opportunity</strong> by country and CPV before committing",
        "Study <strong>award notices</strong> to see incumbents and pricing — see <a href=\"/blog/reading-contract-award-notices\">reading award notices</a>",
        "Prioritise markets by tender volume and re-tender timing",
        "Compare with the US via <a href=\"/blog/ted-europa-vs-sam-gov\">TED Europa vs SAM.gov</a>",
      ]) +
      faq([
        ["Do I need CE marking to sell medical devices in the EU?", "Yes — CE marking under the EU MDR, usually with a Notified Body assessment, is required before you can place most devices on the EU market."],
        ["Where are EU healthcare tenders published?", "On TED Europa (Tenders Electronic Daily), which carries above-threshold public contracts from all 27 member states."],
      ]),
  },
  {
    slug: "procurement-thresholds-explained",
    tag: "Reference", read: 6, crumb: "Thresholds",
    title: "Procurement Thresholds Explained (UK & EU) (2026)",
    h1: "Procurement Thresholds Explained (UK & EU)",
    desc: "What procurement thresholds are, how they decide which portal a healthcare contract is advertised on, and why suppliers need to watch both sides of the line.",
    keywords: "procurement thresholds, UK procurement thresholds, EU procurement thresholds, above threshold below threshold, Find a Tender threshold, public contracts regulations",
    ctaTitle: "Cover both sides of the threshold",
    ctaText: "Above- and below-threshold healthcare tenders in one feed. Free tier, no credit card.",
    body:
      p("<strong>Procurement thresholds are the financial limits that determine how a public contract must be advertised — and they decide which portal your next healthcare opportunity appears on.</strong> Watch only one side of the line and you miss half the market.") +
      h2("How thresholds work") +
      p("When a contract's estimated value is at or above the relevant threshold, buyers must follow the full advertised procedure and publish on the high-value portal. Below the threshold, lighter rules apply and contracts appear on the lower-value service — but there are still transparency requirements.") +
      h2("Where contracts land") +
      ul([
        "<strong>UK above-threshold</strong> → Find a Tender Service (FTS)",
        "<strong>UK below-threshold</strong> → Contracts Finder — see <a href=\"/blog/contracts-finder-explained\">Contracts Finder explained</a>",
        "<strong>EU above-threshold</strong> → TED Europa",
      ]) +
      h2("Why suppliers must watch both") +
      p("Higher-value frameworks appear on FTS/TED, but the sheer volume of everyday NHS and council spend sits below threshold on Contracts Finder. Suppliers chasing only the big frameworks miss the many smaller contracts that build track record. Monitoring both — automatically — is the point of aggregation.") +
      faq([
        ["What decides which portal a contract appears on?", "Its estimated value relative to the procurement threshold — above-threshold on Find a Tender/TED, below-threshold on Contracts Finder."],
        ["Do below-threshold contracts still have rules?", "Yes — lighter-touch rules and transparency requirements apply, but they are real, and the contracts are still openly advertised."],
      ]),
  },
  {
    slug: "nhs-net-zero-procurement",
    tag: "Guide", read: 7, crumb: "Net Zero Procurement",
    title: "NHS Net Zero & Sustainable Procurement Requirements (2026)",
    h1: "NHS Net Zero & Sustainable Procurement Requirements",
    desc: "How the NHS net zero agenda and social value rules shape healthcare procurement, what suppliers must now evidence, and how to turn sustainability into bid marks.",
    keywords: "NHS net zero, sustainable procurement, social value NHS, carbon reduction plan, NHS supplier sustainability, green procurement healthcare",
    ctaTitle: "Win on more than price",
    ctaText: "Find tenders early enough to build strong social-value and sustainability responses. Free tier, no credit card.",
    body:
      p("<strong>The NHS has committed to reaching net zero, and it is using its purchasing power to get there — which means sustainability and social value now carry real marks in healthcare bids.</strong> Suppliers who treat this as a box-tick lose ground to those who evidence it properly.") +
      h2("What suppliers now have to evidence") +
      ul([
        "A published <strong>Carbon Reduction Plan</strong> is required to bid for many higher-value NHS contracts",
        "A minimum <strong>social value</strong> weighting is applied in central-government and NHS evaluations",
        "<strong>Scope 3 / supply-chain emissions</strong> commitments are increasingly requested",
        "Product-level <strong>sustainability</strong> — reusables, packaging, lifecycle impact",
      ]) +
      h2("Turning sustainability into marks") +
      ul([
        "Quantify commitments — <strong>numbers and dates</strong>, not intentions",
        "Tie social value to the <strong>local community</strong> the contract serves",
        "Evidence delivery on <strong>past</strong> contracts, not just plans",
        "Fold it into the wider bid — see <a href=\"/blog/social-value-sustainability-healthcare-procurement\">social value &amp; sustainability</a>",
      ]) +
      h2("Why it pays to see tenders early") +
      p("Strong social-value and carbon responses take time to build. The earlier you see a tender coming, the better your answer — another reason a live pipeline beats last-minute scrambling, as covered in <a href=\"/blog/bid-writing-tips-healthcare\">bid-writing tips</a>.") +
      faq([
        ["Do I need a Carbon Reduction Plan to bid for NHS contracts?", "For many higher-value NHS and central-government contracts, yes — a published Carbon Reduction Plan is a condition of bidding."],
        ["How much do social value and sustainability count?", "A minimum weighting is applied in NHS and central-government evaluations, and it is often enough to decide close bids."],
      ]),
  },
];

// ---- write files + emit index cards / sitemap lines --------------------------
const tagColors = {
  Guide: "bg-gold/10 text-gold border-gold/10",
  Reference: "bg-teal/10 text-teal-light border-teal/10",
  "How-to": "bg-indigo-500/10 text-indigo-400/80 border-indigo-500/10",
  NHS: "bg-indigo-500/10 text-indigo-400/80 border-indigo-500/10",
  UK: "bg-teal/10 text-teal-light border-teal/10",
  Canada: "bg-gold/10 text-gold border-gold/10",
  Global: "bg-teal/10 text-teal-light border-teal/10",
};

let cards = "";
let sitemap = "";
for (const post of posts) {
  post.date = DATE;
  post.dateHuman = DATE_HUMAN;
  writeFileSync(join(blogDir, `${post.slug}.html`), page(post));
  const color = tagColors[post.tag] || tagColors.Guide;
  cards += `      <a href="/blog/${post.slug}" class="block bg-dark-100 border border-white/5 rounded-xl p-8 hover-lift">
        <div class="flex items-center gap-3 mb-3">
          <span class="text-xs px-2.5 py-1 rounded-md ${color} border">${post.tag}</span>
          <span class="text-xs text-gray-500">${post.read} min read</span>
        </div>
        <h2 class="font-display text-2xl font-semibold text-white mb-2 hover:text-gold transition-colors">${post.h1}</h2>
        <p class="text-gray-400 text-sm leading-relaxed">${post.desc}</p>
        <span class="inline-flex items-center gap-1 text-gold text-sm font-medium mt-4">Read article
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
        </span>
      </a>\n\n`;
  sitemap += `  <url><loc>${SITE}/blog/${post.slug}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
}

writeFileSync(join(root, "scripts", "_blog-cards.html"), cards);
writeFileSync(join(root, "scripts", "_blog-sitemap.txt"), sitemap);
console.log(`Generated ${posts.length} blog posts in public/blog/`);
console.log("Index cards  -> scripts/_blog-cards.html");
console.log("Sitemap urls -> scripts/_blog-sitemap.txt");
