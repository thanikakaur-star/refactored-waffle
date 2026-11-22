// Generates The Kaur Care Journal: hub (public/journal/index.html) and article
// pages (public/journal/<slug>.html). Warm, editorial, ASA-safe consumer SEO.
// Run: node scripts/generate-journal.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE = "https://healthprocureintel.com";
const outDir = join(__dirname, "..", "public", "journal");
mkdirSync(outDir, { recursive: true });

const STYLE = `:root{--sage:#2D5A47;--sage-d:#234738;--cream:#FAF7F2;--sand:#E8E0D5;--terra:#C87A5A;--ink:#1E293B;--muted:#6b6256}
*{box-sizing:border-box}
body{margin:0;font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:var(--cream);color:var(--ink);line-height:1.68}
a{color:var(--sage)}
img{max-width:100%}
.safety{background:#FBEEE7;color:#8a4b32;border-bottom:1px solid #eeccba;font-size:14px;padding:10px 16px;text-align:center}
.nav{position:sticky;top:0;z-index:40;background:rgba(250,247,242,.95);backdrop-filter:blur(8px);border-bottom:1px solid var(--sand)}
.nav .wrap{max-width:1100px;margin:0 auto;padding:0 20px;height:64px;display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none}
.mark{width:40px;height:40px;border-radius:14px;background:var(--sage);color:#fff;display:flex;align-items:center;justify-content:center;font-family:Fraunces,serif;font-weight:700;font-size:20px}
.brand b{font-family:Fraunces,serif;color:var(--sage);font-size:20px;font-weight:600}
.btn{display:inline-block;background:var(--sage);color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:12px}
.btn:hover{background:var(--sage-d)}
.btn.alt{background:var(--terra)}
main{max-width:720px;margin:0 auto;padding:40px 20px 10px}
.eyebrow{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--terra);margin:0 0 10px}
h1{font-family:Fraunces,serif;color:var(--sage);font-weight:600;font-size:clamp(30px,5vw,40px);line-height:1.08;margin:0 0 14px}
h2{font-family:Fraunces,serif;color:var(--sage);font-weight:600;font-size:24px;margin:36px 0 10px}
h3{font-weight:700;font-size:17px;margin:24px 0 4px}
p,li{color:#3a4148;font-size:17px}
.lead{font-size:20px;color:var(--muted);line-height:1.55}
.meta{color:var(--muted);font-size:14px;margin:0 0 26px}
.cta{background:#EDF3EF;border:1px solid #d9e6de;border-radius:22px;padding:26px;margin:36px 0}
.cta h2{margin-top:0}
.cta .btn{margin:6px 8px 0 0}
.tip{background:#fff;border:1px solid var(--sand);border-left:4px solid var(--terra);border-radius:14px;padding:16px 18px;margin:20px 0;font-size:16px}
.grid{display:grid;gap:22px}
@media(min-width:760px){.grid.three{grid-template-columns:repeat(3,1fr)}}
.ccard{display:block;background:#fff;border:1px solid var(--sand);border-radius:20px;padding:22px;text-decoration:none;transition:transform .15s,box-shadow .15s}
.ccard:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(45,90,71,.08)}
.ccard .k{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--terra)}
.ccard h3{color:var(--sage);font-family:Fraunces,serif;font-weight:600;font-size:19px;margin:8px 0 6px}
.ccard p{font-size:14.5px;color:var(--muted);margin:0}
footer{border-top:1px solid var(--sand);background:var(--sage);color:rgba(255,255,255,.85);margin-top:44px}
footer .wrap{max-width:720px;margin:0 auto;padding:26px 20px;font-size:13px}
footer a{color:#fff;text-decoration:underline}`;

const head = (title, desc, url) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<title>${title} | Kaur Care Journal</title>
<meta name="description" content="${desc}" />
<link rel="canonical" href="${url}" />
<meta name="robots" content="index, follow" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Kaur Care" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:url" content="${url}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${desc}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap" rel="stylesheet" />
<style>${STYLE}</style>
</head>
<body>
<div class="safety">&#9829; Your safety comes first. For a medical emergency or severe symptoms, call <strong>999</strong> or <strong>NHS 111</strong> straight away.</div>
<nav class="nav"><div class="wrap">
<a class="brand" href="/"><span class="mark">K</span><b>Kaur Care</b></a>
<a class="btn" href="/#find">Find care</a>
</div></nav>`;

const footer = `<footer><div class="wrap">
Kaur Care, operated by HealthProcure Intel. A navigation tool, not medical advice. <a href="/">Home</a> &middot; <a href="/journal">Journal</a> &middot; <a href="/privacy">Privacy</a>
</div></footer>
</body></html>`;

const cta = `<div class="cta">
<h2>Find your own route to care</h2>
<p>Pop in your postcode and what is going on. Kaur Care shows your same-day NHS pharmacy, Right to Choose and scan options in about ten seconds, all free.</p>
<a class="btn" href="/#find">Find my care options</a>
<a class="btn alt" href="/#pricing">Build a 1-page GP brief</a>
</div>`;

const articles = [
  {
    slug: "pharmacy-first-conditions-uk",
    title: "12 Things You Can Get Sorted at a UK Pharmacy Today (Without the 8 AM GP Queue)",
    desc: "Your local pharmacist can now assess and treat a surprising list of everyday conditions, free and often same-day. Here are the seven nationwide NHS Pharmacy First pathways plus five newer ones being rolled out.",
    read: 6,
    body: `<p class="lead">You wake up, something hurts, and the only plan is to join the 8 AM phone scramble for a GP appointment. Here is the thing many people still do not realise: for a growing list of everyday conditions, you can walk into a pharmacy and be seen the same day, for free, no appointment and no GP referral.</p>
<p>This is NHS Pharmacy First in England. Since early 2024 your community pharmacist has been able to assess, and where appropriate supply treatment including some prescription-only medicines, for a defined set of conditions. It is quick, it is private (most pharmacies have a consultation room), and it takes real pressure off the GP queue.</p>
<h2>The seven your pharmacist can treat right now</h2>
<p>These seven pathways are available nationwide. Age and eligibility rules apply, and your pharmacist will check them with you.</p>
<h3>1. Urinary tract infections (UTIs)</h3>
<p>For women aged 16 to 64 with uncomplicated symptoms. Not suitable in pregnancy, for men, or if you feel very unwell or have back or flank pain, in which case you will be pointed to a GP or 111.</p>
<h3>2. Sore throat</h3>
<p>For anyone aged 5 and over. The pharmacist checks whether it is likely to need treatment.</p>
<h3>3. Earache in children (acute otitis media)</h3>
<p>For children aged 1 to 17. This one must be done in person, so a distance-selling online pharmacy cannot provide it.</p>
<h3>4. Sinusitis</h3>
<p>For anyone aged 12 and over.</p>
<h3>5. Impetigo</h3>
<p>For anyone aged 1 and over with the tell-tale crusty skin infection.</p>
<h3>6. Infected insect bites</h3>
<p>For anyone aged 1 and over, when a bite has become infected.</p>
<h3>7. Shingles</h3>
<p>For adults aged 18 and over. Get seen quickly, as treatment works best started early.</p>
<div class="tip">All seven are free on the NHS and usually dealt with the same day. If you are not eligible, the pharmacist will tell you the right next step rather than leave you stuck.</div>
<h2>Five more being rolled out</h2>
<p>Through late 2026, NHS pharmacy services have been expanding. Depending on your area and your pharmacy, you may also be able to get help with:</p>
<ul>
<li><strong>Adult outer ear infection</strong> (otitis externa)</li>
<li><strong>Children's hay fever</strong> and seasonal allergy symptoms</li>
<li><strong>Mild to moderate acne</strong></li>
<li><strong>Episodic migraine</strong> in adults</li>
<li><strong>Mild skin and soft-tissue infections, and scabies</strong></li>
</ul>
<p>These newer pathways are still being introduced and availability varies from place to place, so treat them as "worth asking about" rather than guaranteed. A quick call to your local pharmacy, or a check of current NHS England guidance, will confirm what is on offer near you.</p>
<h2>When the pharmacy will send you onward</h2>
<p>Pharmacists are trained to spot when something needs more than they can give. If you have trouble breathing or swallowing, a very high fever, a stiff neck, a spreading infection, or you simply feel very unwell, that is a job for 111 or 999, not a pharmacy counter. Trust that steer.</p>
<h2>How to make the visit quick</h2>
<p>Jot down when your symptoms started, what you have already tried, and any medicines or allergies. If it turns out you do need the GP instead, a clear one-page summary of the same details will make that appointment count too.</p>` + cta,
  },
  {
    slug: "how-to-use-right-to-choose-adhd-autism",
    title: "How to Use NHS Right to Choose for ADHD & Autism Assessments in England",
    desc: "Waiting lists for adult ADHD and autism assessments can run for years. In England you have a legal right to choose a different NHS-funded provider, which can mean a much shorter wait. Here is how it works.",
    read: 7,
    body: `<p class="lead">If you have been told the wait for an ADHD or autism assessment is measured in years, you are not imagining it. What far fewer people are told is that in England you have a legal right to choose who assesses you, and that choice can dramatically shorten the wait, at no cost to you.</p>
<h2>What Right to Choose actually is</h2>
<p>Under the NHS Choice Framework in England, when your GP refers you for a routine assessment you can usually ask to be referred to any provider that holds an NHS contract for that service, not only your local one. Several independent providers offer NHS-funded ADHD and autism assessments with shorter waiting lists. You still pay nothing; it is NHS care, just delivered somewhere with more capacity.</p>
<div class="tip">Right to Choose applies to routine referrals in England. It does not apply in urgent or specialist mental-health crisis situations, and local rules can vary, so always confirm current acceptance with your GP and the provider.</div>
<h2>Step by step</h2>
<h3>1. Book a GP appointment about the referral</h3>
<p>You need a GP referral to start. Be clear that you would like to be assessed for ADHD or autism and that you want to use your right to choose your provider.</p>
<h3>2. Choose a provider that holds an NHS contract</h3>
<p>Do a little homework first. Look for a provider that explicitly offers NHS Right to Choose assessments for your nation and age group, and note their name and address so the GP can refer directly.</p>
<h3>3. Ask for the referral to that provider</h3>
<p>Give the GP the provider's details. The referral itself is a standard NHS e-referral; it does not cost you anything.</p>
<h3>4. If the GP is unsure or declines</h3>
<p>Some practices are simply unfamiliar with the process, and local Integrated Care Board (ICB) policies do vary. It often helps to calmly mention that you are exercising your right under the NHS Choice Framework, and to bring a short written request. If it still stalls, ask what the practice's policy is and whether the practice manager can help.</p>
<h3>5. Put it in writing</h3>
<p>A short, clear letter that names the framework, the condition and your chosen provider makes the request easy to action and easy to file. You can build one in a couple of minutes with the Kaur Care referral-letter tool, then hand or email it to your surgery.</p>
<h2>What to expect after referral</h2>
<p>Waiting times still vary by provider, so it is worth comparing before you choose. Once referred, the provider will contact you about next steps and any questionnaires. Keep a note of dates and who you spoke to.</p>
<h2>A note on expectations</h2>
<p>Right to Choose is a route, not a guarantee of a particular outcome, and acceptance can depend on your ICB. But for a lot of people it is the single most effective way to turn a multi-year wait into a far shorter one.</p>` + cta,
  },
  {
    slug: "skip-the-gp-queue-econsult-guide",
    title: "Skip the 8 AM GP Queue: How to Write an eConsult or NHS App Brief That Gets Actioned",
    desc: "Most GP practices now take online requests through eConsult, Patchs or the NHS App. A clear, well-structured brief is far more likely to get a same-day response. Here is exactly what to write.",
    read: 6,
    body: `<p class="lead">The 8 AM phone scramble is not the only way in any more. Most GP practices in England now accept online requests, through eConsult, Patchs, Anima or the NHS App, and a well-written one often gets triaged and actioned the same day. The trick is knowing what to put in it.</p>
<h2>Why the written route can work better</h2>
<p>When a clinician reads a clear, complete request, they can make a decision without a round of phone tag. A vague "please call me" gets queued; a focused brief with the right detail gets a plan. You are doing the triage team a favour, and helping yourself.</p>
<h2>What to include</h2>
<h3>One clear ask</h3>
<p>Say what you want up front: a prescription, a referral, advice, a sick note, test results. One request per submission works best.</p>
<h3>The timeline</h3>
<p>When it started, whether it is getting better or worse, and how fast.</p>
<h3>Symptoms, specifically</h3>
<p>Where, how bad (a 0 to 10 score helps), and anything that makes it better or worse. Vague beats nothing, but specific beats vague.</p>
<h3>What you have already tried</h3>
<p>Pharmacy remedies, pain relief, rest, previous treatments and whether they helped.</p>
<h3>The impact</h3>
<p>What you cannot do right now, work, sleep, school, caring. This helps the team judge urgency.</p>
<h3>Your preference</h3>
<p>Phone call, face to face, or happy with a message back.</p>
<div class="tip">A simple structure to copy: <strong>What I need</strong> &rarr; <strong>What is happening</strong> (and since when) &rarr; <strong>What I have tried</strong> &rarr; <strong>How it is affecting me</strong> &rarr; <strong>My questions</strong>. That is exactly the shape the Kaur Care GP brief produces.</p>
<h2>Keep it to one issue</h2>
<p>If you have three separate problems, resist the urge to list them all in one box. Triage systems handle one clear issue far better than a mixed bag; submit separately or flag that others can wait.</p>
<h2>When not to use online triage</h2>
<p>Online forms are for non-urgent problems. If symptoms are severe or fast-moving, chest pain, trouble breathing, a stiff neck with a high fever, heavy bleeding, confusion, use NHS 111 or call 999. When in doubt, 111 will tell you where to go.</p>` + cta,
  },
  {
    slug: "prepare-10-minute-gp-appointment-womens-family-health",
    title: "How to Prepare for a 10-Minute GP Appointment (For Women's Health, Parents & Adults)",
    desc: "A GP appointment is often just ten minutes. A little preparation can double what you get from it. A practical, warm guide for women's health, parents and any adult.",
    read: 6,
    body: `<p class="lead">Ten minutes is not long, especially when you are nervous or in pain and the thing you most wanted to say slips your mind. The good news is that a few minutes of preparation genuinely changes the outcome. Here is how to walk in ready, whatever the concern.</p>
<h2>Before you go: get it on one page</h2>
<p>Write down your main concern in a sentence, when it started, and how it has changed. Pick the one or two things that matter most, and lead with those. Bring any relevant dates, measurements or a symptom diary. If you take medicines, have the list to hand.</p>
<div class="tip">If writing under pressure is not your thing, the Kaur Care 1-page GP brief turns a few answers into a tidy summary you can hand over or read from.</div>
<h2>For women's health</h2>
<p>These appointments are often rushed, so specifics help you be heard. Note your cycle length and how regular it is; if bleeding is the issue, how heavy (flooding, clots, products used per hour) and how it affects your energy. For pain, where it is, a 0 to 10 score at its worst, and how it tracks with your cycle. Say what you have already tried, and what you want to discuss, including options like hormonal treatment or a referral. Tiredness with heavy periods is worth flagging, as it can prompt an iron check.</p>
<h2>For parents</h2>
<p>Bring the timeline: when symptoms started, temperature readings, feeding or drinking, wet nappies, rashes, and anything unusual about behaviour or energy. Note what has helped. Trust your instinct, if your child seems very unwell, say so plainly, and remember that for serious or fast-changing symptoms 111 and 999 are there day and night.</p>
<h2>For any adult</h2>
<p>Give the shape of it: when it began, what triggers or eases it, and the impact on work and sleep. Write your questions down in advance, because that is what tends to get forgotten.</p>
<h2>During the appointment</h2>
<p>Lead with your main concern in the first sentence. Ask your questions while you are there. Before you leave, confirm the plan: what happens next, what to watch for, and when to come back or seek urgent help.</p>
<h2>After</h2>
<p>Jot down what was agreed, any medicine names and the follow-up date, while it is fresh. It makes the next step, and the next appointment, far easier.</p>` + cta,
  },
];

for (const a of articles) {
  const url = `${SITE}/journal/${a.slug}`;
  const page = `${head(a.title, a.desc, url)}
<main>
<article>
<p class="eyebrow">The Kaur Care Journal</p>
<h1>${a.title}</h1>
<p class="meta">${a.read} min read &middot; Kaur Care Journal</p>
${a.body}
</article>
</main>
${footer}`;
  writeFileSync(join(outDir, `${a.slug}.html`), page);
}

// Hub
const cards = articles.map((a) => `<a class="ccard" href="/journal/${a.slug}">
<span class="k">${a.read} min read</span>
<h3>${a.title}</h3>
<p>${a.desc}</p>
</a>`).join("\n");

const hub = `${head("The Kaur Care Journal", "Warm, practical guides to getting NHS care faster: Pharmacy First, Right to Choose, eConsults and preparing for your GP appointment.", `${SITE}/journal`)}
<main>
<p class="eyebrow">The Kaur Care Journal</p>
<h1>Everyday care, explained simply</h1>
<p class="lead">Practical, plain-English guides to getting the care you need faster, from same-day pharmacy help to using your NHS Right to Choose.</p>
<div class="grid three" style="margin-top:30px">
${cards}
</div>
${cta}
</main>
${footer}`;
writeFileSync(join(outDir, "index.html"), hub);

console.log(`Journal built: ${articles.length} articles + hub`);
console.log("Sitemap lines:");
console.log(`  <url><loc>${SITE}/journal</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
for (const a of articles) console.log(`  <url><loc>${SITE}/journal/${a.slug}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`);
