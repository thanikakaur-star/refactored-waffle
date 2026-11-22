// Generates The Kaur Care Journal: hub (public/journal/index.html) with category
// filter pills + read-time badges, and article pages (public/journal/<slug>.html)
// with full SEO/OpenGraph, calm 999/111 notes and soft mid + bottom CTAs.
// Run: node scripts/generate-journal.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE = "https://kaurcare.com";
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
.mark{width:40px;height:40px;border-radius:14px;background:#FBEEE7;border:1px solid #f0ddd0;display:flex;align-items:center;justify-content:center;overflow:hidden}
.mark img{width:32px;height:32px;object-fit:contain}
.brand b{font-family:Fraunces,serif;color:var(--sage);font-size:20px;font-weight:600}
.btn{display:inline-block;background:var(--sage);color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:12px;border:0;cursor:pointer}
.btn:hover{background:var(--sage-d)}
.btn.alt{background:var(--terra)}
main{max-width:720px;margin:0 auto;padding:40px 20px 10px}
.hub{max-width:1060px}
.eyebrow{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--terra);margin:0 0 10px}
h1{font-family:Fraunces,serif;color:var(--sage);font-weight:600;font-size:clamp(30px,5vw,42px);line-height:1.08;margin:0 0 14px}
h2{font-family:Fraunces,serif;color:var(--sage);font-weight:600;font-size:24px;margin:34px 0 10px}
h3{font-weight:700;font-size:17px;margin:22px 0 4px}
p,li{color:#3a4148;font-size:17px}
article p,article li{font-size:17.5px}
.lead{font-size:20px;color:var(--muted);line-height:1.55}
.meta{color:var(--muted);font-size:14px;margin:0 0 26px}
.badge{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--terra)}
.cta{background:#EDF3EF;border:1px solid #d9e6de;border-radius:22px;padding:24px;margin:34px 0}
.cta h2,.cta h3{margin-top:0}
.cta .btn{margin:6px 8px 0 0}
.softcta{background:#fff;border:1px solid var(--sand);border-left:4px solid var(--terra);border-radius:16px;padding:18px 20px;margin:28px 0}
.softcta p{margin:0 0 10px;font-size:16px}
.tip{background:#fff;border:1px solid var(--sand);border-radius:14px;padding:16px 18px;margin:20px 0;font-size:16px}
.pills{display:flex;flex-wrap:wrap;gap:8px;margin:26px 0 30px}
.pill{border:1px solid var(--sand);background:#fff;border-radius:9999px;padding:8px 16px;font-size:14px;font-weight:600;color:#5c564c;cursor:pointer;transition:all .15s}
.pill:hover{border-color:var(--sage)}
.pill.active{background:var(--sage);color:#fff;border-color:var(--sage)}
.grid{display:grid;gap:22px}
@media(min-width:720px){.grid.three{grid-template-columns:repeat(3,1fr)}}
.ccard{display:flex;flex-direction:column;background:#fff;border:1px solid var(--sand);border-radius:20px;padding:22px;text-decoration:none;transition:transform .15s,box-shadow .15s}
.ccard:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(45,90,71,.08)}
.ccard .row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
.ccard .cat{font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--terra)}
.ccard .rt{font-size:12px;color:var(--muted);background:var(--cream);border:1px solid var(--sand);border-radius:9999px;padding:3px 9px;white-space:nowrap}
.ccard h3{color:var(--sage);font-family:Fraunces,serif;font-weight:600;font-size:19px;margin:2px 0 8px;line-height:1.2}
.ccard p{font-size:14.5px;color:var(--muted);margin:0}
footer{border-top:1px solid var(--sand);background:var(--sage);color:rgba(255,255,255,.85);margin-top:44px}
footer .wrap{max-width:720px;margin:0 auto;padding:26px 20px;font-size:13px}
footer a{color:#fff;text-decoration:underline}`;

const head = (title, desc, url) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="icon" type="image/png" href="/icons/favicon.png" />
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
<a class="brand" href="/"><span class="mark"><img src="/logo-emblem.png" alt="Kaur Care" /></span><b>Kaur Care</b></a>
<a class="btn" href="/#find">Find care</a>
</div></nav>`;

const footer = `<footer><div class="wrap">
Kaur Care is an independent NHS care-navigation tool, not medical advice. <a href="/">Home</a> &middot; <a href="/journal">Journal</a> &middot; <a href="/privacy">Privacy</a>
</div></footer>
</body></html>`;

const MIDCTA = `<div class="softcta">
<p><strong>Not sure where to start?</strong> Kaur Care matches your postcode to your same-day NHS pharmacy, Right to Choose and scan options in about ten seconds.</p>
<a class="btn" href="/#find">Find my care options</a>
</div>`;

const cta = `<div class="cta">
<h3>Walk in prepared</h3>
<p>Build a clear 1-page GP brief or a Right to Choose referral letter in a couple of minutes, then take it to your appointment. Free, and your details stay on your device.</p>
<a class="btn" href="/#find">Find my care options</a>
<a class="btn alt" href="/#pricing">Build a GP brief</a>
</div>`;

const CATS = ["All", "NHS Shortcuts", "ADHD & Autism", "Women's Health", "Chronic Illness", "Parents & Kids", "Adult Health"];
const catSlug = (c) => c.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const articles = [
  {
    slug: "nhs-referral-loop-how-to-get-seen-faster",
    category: "NHS Shortcuts",
    title: "Stuck in the NHS Referral Loop? How to Get Seen and Diagnosed Faster",
    desc: "GP to physio to scan to GP to specialist, months between each step. Here is how the referral loop works, where the real delays are, and the legitimate ways to move faster.",
    read: 6,
    body: `<p class="lead">You know the pattern. You see your GP, who refers you to a physio, who sends you for a scan, whose results go back to your GP, who then refers you to a specialist, with weeks or months between each step. It can take a year or more to get an answer to something that feels like it should take days. Here is why it happens, and the legitimate ways to move faster.</p>
<h2>Why the loop exists</h2>
<p>The NHS triages by clinical urgency. If something is not immediately dangerous, it joins a queue, and there are queues at every stage: for the GP, for physiotherapy, for imaging, and for the specialist who can interpret it. Each handover adds a wait. Add in staff shortages and the backlog, and a straightforward problem can crawl through the system. None of this means you are powerless, it means knowing where the shortcuts are.</p>
<h2>Step 1: Skip the GP entirely where you can</h2>
<p>For a surprising number of everyday problems you do not need the GP at all. NHS Pharmacy First lets a pharmacist assess and treat seven common conditions the same day, free. For many practices you can also now refer yourself directly to physiotherapy without a GP gatekeeping the first appointment. See <a href="/journal/pharmacy-first-12-conditions-uk">what a pharmacist can sort today</a> and ask your surgery whether they offer self-referral for physio.</p>
<h2>Step 2: Use the online front door, and write it well</h2>
<p>Most practices take online requests through the NHS App, eConsult or Patchs, and a clear, complete request is often triaged the same day, no 8 AM phone queue. The quality of what you write genuinely changes how fast you are seen. We break down exactly what to include in <a href="/journal/how-to-write-econsult-nhs-app-message">how to write an online GP form that gets actioned</a>.</p>
${MIDCTA}
<h2>Step 3: Use your Right to Choose to jump the specialist queue</h2>
<p>This is the big one. In England, when your GP refers you for a routine assessment, you have a legal right under the NHS Choice Framework to pick any provider that holds an NHS contract for that service, not just your local hospital. Many have far shorter waits. It is still NHS care and still free. It is especially powerful for the long queues, dermatology, ENT, MSK, scans, and ADHD or autism assessments (see <a href="/journal/nhs-right-to-choose-adhd-autism-guide">how Right to Choose works</a>). Kaur Care points you to the official NHS and CQC directories so you can find a provider and name it to your GP.</p>
<h2>Step 4: Ask for your own results</h2>
<p>A common frustration is waiting weeks for a scan result, then being told you must book another appointment just to hear it. You are entitled to access your own health records, including test and imaging results, through the NHS App or by asking your practice. Having your results in hand means you can prepare properly for the next conversation rather than losing another appointment to simply being told what they say.</p>
<h2>Step 5: Walk into every appointment prepared</h2>
<p>Every stage of the loop is a chance to lose time to a vague conversation. A clear one-page summary of your symptoms, timeline, what you have tried and your questions makes each appointment count. Our guide to <a href="/journal/how-to-prepare-10-minute-gp-appointment">preparing for a 10-minute GP appointment</a> walks through it, and Kaur Care can generate that brief for you.</p>
<h2>A word on urgency</h2>
<p>These shortcuts are for routine, non-urgent problems. If your symptoms are severe or fast-moving, chest pain, trouble breathing, a stiff neck with a high fever, heavy bleeding, sudden weakness or confusion, do not navigate the system, call NHS 111 or 999. And a problem that is not an emergency can still be worth pushing on: if it affects your ability to work, sleep or care for your family, say so clearly, because it helps the system understand the real impact.</p>` + cta,
  },
  {
    slug: "pharmacy-first-12-conditions-uk",
    category: "NHS Shortcuts",
    title: "12 Things You Can Get Sorted at a UK Pharmacy Today (Without the 8 AM GP Queue)",
    desc: "Your local pharmacist can assess and treat a surprising list of everyday conditions, free and often same-day. Here are the seven nationwide NHS Pharmacy First pathways plus five newer ones.",
    read: 4,
    body: `<p class="lead">You wake up, something hurts, and the only plan seems to be the 8 AM phone scramble. For a growing list of everyday conditions, there is a faster route: walk into a pharmacy and be seen the same day, free, no appointment and no GP referral.</p>
<p>This is NHS Pharmacy First in England. Since early 2024 your community pharmacist has been able to assess, and where appropriate supply treatment including some prescription-only medicines, for a defined set of conditions. It is quick, private, and takes real pressure off the GP queue.</p>
<h2>The seven available right now</h2>
<p>These are nationwide. Age and eligibility rules apply, and the pharmacist will check them with you.</p>
<ul>
<li><strong>UTIs</strong> in women aged 16 to 64 with uncomplicated symptoms.</li>
<li><strong>Sore throat</strong> for anyone aged 5 and over.</li>
<li><strong>Earache</strong> in children aged 1 to 17 (this one must be in person).</li>
<li><strong>Sinusitis</strong> for anyone aged 12 and over.</li>
<li><strong>Impetigo</strong> for anyone aged 1 and over.</li>
<li><strong>Infected insect bites</strong> for anyone aged 1 and over.</li>
<li><strong>Shingles</strong> for adults aged 18 and over (get seen early).</li>
</ul>
${MIDCTA}
<h2>Five more being rolled out</h2>
<p>Through late 2026, NHS pharmacy services have been expanding. Depending on your area and pharmacy, you may also be able to get help with adult outer ear infection, children's hay fever, mild to moderate acne, episodic migraine in adults, and mild skin and soft-tissue infections or scabies.</p>
<p>These newer pathways are still being introduced and availability varies, so treat them as "worth asking about" rather than guaranteed. A quick call to your local pharmacy, or a check of current NHS England guidance, confirms what is on offer near you.</p>
<h2>When the pharmacy will send you onward</h2>
<p>Pharmacists are trained to spot when something needs more. Trouble breathing or swallowing, a very high fever, a stiff neck, spreading infection, or simply feeling very unwell are jobs for 111 or 999, not a pharmacy counter. Trust that steer.</p>` + cta,
  },
  {
    slug: "nhs-right-to-choose-adhd-autism-guide",
    category: "ADHD & Autism",
    title: "Stuck on a Long NHS ADHD or Autism Waiting List? How Right to Choose Works in England",
    desc: "Waiting lists for ADHD and autism assessments can run for years. In England you have a legal right to choose a different NHS-funded provider, often with a much shorter wait. Here is how.",
    read: 4,
    body: `<p class="lead">If you have been told the wait for an ADHD or autism assessment is measured in years, you are not imagining it. What far fewer people are told is that in England you have a legal right to choose who assesses you, and that choice can shorten the wait, at no cost to you.</p>
<h2>What Right to Choose is</h2>
<p>Under the NHS Choice Framework in England, when your GP refers you for a routine assessment you can usually ask to be referred to any provider that holds an NHS contract for that service, not only your local one. Several independent providers offer NHS-funded ADHD and autism assessments with shorter waits. You still pay nothing; it is NHS care delivered somewhere with more capacity.</p>
<div class="tip">Right to Choose applies to routine referrals in England. It does not apply in urgent or crisis mental-health situations, and local rules can vary, so confirm current acceptance with your GP and the provider.</div>
<h2>Step by step</h2>
<p><strong>1.</strong> Book a GP appointment and say you would like a referral and want to use your right to choose your provider. <strong>2.</strong> Research a provider that explicitly offers NHS Right to Choose assessments for your age group, and note their details. <strong>3.</strong> Ask the GP to refer you there. <strong>4.</strong> If the practice is unsure, calmly mention the NHS Choice Framework and bring a short written request. <strong>5.</strong> Put it in writing, a clear letter naming the framework, the condition and your chosen provider.</p>
${MIDCTA}
<h2>What to expect</h2>
<p>Waiting times still vary by provider, so compare before you choose. Once referred, the provider will contact you about questionnaires and next steps. Keep a note of dates and who you spoke to. Right to Choose is a route, not a guarantee of a particular outcome, and acceptance can depend on your local Integrated Care Board, but for many people it turns a multi-year wait into a far shorter one.</p>` + cta,
  },
  {
    slug: "how-to-prepare-10-minute-gp-appointment",
    category: "Women's Health",
    title: "How to Prepare for a 10-Minute GP Appointment (Especially for Endo, PCOS & Chronic Symptoms)",
    desc: "Ten minutes is short, especially for endometriosis, PCOS and long-running symptoms. A little preparation can change the outcome. A warm, practical guide.",
    read: 4,
    body: `<p class="lead">Ten minutes is not long, especially when you are in pain and the thing you most wanted to say slips your mind. For conditions like endometriosis and PCOS, which are so often dismissed or delayed, preparation is how you get heard.</p>
<h2>Before you go: get it on one page</h2>
<p>Write your main concern in a sentence, when it started, and how it has changed. Pick the one or two things that matter most and lead with those. Bring dates, measurements and a short symptom diary.</p>
<h2>For endometriosis, PCOS and cycle symptoms</h2>
<p>Specifics help. Note your cycle length and how regular it is. For pain, where it is, a 0 to 10 score at its worst, and how it tracks with your cycle. For bleeding, how heavy (flooding, clots, products used per hour) and the effect on your energy. List what you have already tried, and what you want to discuss, including options like hormonal treatment, a scan or a gynaecology referral. Tiredness with heavy periods is worth flagging, as it can prompt an iron check.</p>
${MIDCTA}
<h2>During the appointment</h2>
<p>Lead with your main concern in the first sentence. Ask your questions while you are there. Before you leave, confirm the plan: what happens next, what to watch for, and when to come back or seek urgent help.</p>
<h2>After</h2>
<p>Jot down what was agreed, any medicine names and the follow-up date while it is fresh. If a first appointment does not get you answers, it is reasonable to go back; persistent pain deserves follow-up.</p>` + cta,
  },
  {
    slug: "kids-earache-sore-throat-calm-parent-guide",
    category: "Parents & Kids",
    title: "Kids' Earache, Sore Throat, or Rash: Calm Next Steps for UK Parents",
    desc: "A calm, practical guide for UK parents on earache, sore throat and rashes: what the pharmacy can help with same-day, and the red flags that mean 111 or 999.",
    read: 4,
    body: `<p class="lead">When your child is poorly and miserable, the hardest part is knowing how worried to be. Here is a calm map of the common ones, and where to go for each.</p>
<h2>Earache</h2>
<p>Childhood earache (acute otitis media) is now an NHS Pharmacy First pathway for children aged 1 to 17, assessed in person at the pharmacy, no GP appointment needed. The pharmacist will check it and advise on treatment or pain relief.</p>
<h2>Sore throat</h2>
<p>Sore throat is covered by Pharmacy First for anyone aged 5 and over. Most settle with simple care, and the pharmacist can tell you whether anything more is needed.</p>
<h2>Rashes</h2>
<p>Most childhood rashes are mild. Impetigo and infected insect bites can both be seen at the pharmacy for children aged 1 and over. The one rash to act on immediately is a blotchy rash that does not fade when you press a glass against it, alongside a very unwell child; that is a 999 situation.</p>
${MIDCTA}
<h2>The red flags that mean 111 or 999</h2>
<p>Trust your instinct. Seek urgent help if your child is struggling to breathe, is floppy or very hard to wake, has a stiff neck or dislikes bright light, has a rash that does not fade under a glass, is not drinking or has far fewer wet nappies, or simply seems very unwell to you. NHS 111 is there day and night to help you decide, and 999 is for emergencies.</p>
<h2>Making the pharmacy visit quick</h2>
<p>Bring your child's age, when symptoms started, their temperature, and anything you have already given them. If you are pointed to the GP, the same notes make that visit count.</p>` + cta,
  },
  {
    slug: "mens-health-gp-triage-guide",
    category: "Adult Health",
    title: "A No-Nonsense Guide for Men & Adults: How to Get Sorted at the GP Without the Hassle",
    desc: "A straightforward guide for men and busy adults: what the pharmacy can handle, how to use online GP triage, and how to make an appointment actually count.",
    read: 4,
    body: `<p class="lead">Plenty of us put things off because booking feels like more hassle than the problem. Here is the no-nonsense version of getting sorted, with the least faff.</p>
<h2>Start at the pharmacy for the common stuff</h2>
<p>You can get seen the same day, free, for a sore throat, sinusitis, shingles, infected bites and more under NHS Pharmacy First, no GP appointment and no referral. For adults, newer pharmacy pathways for things like outer ear infection are also being rolled out in many areas; it is worth asking.</p>
<h2>Use the online front door</h2>
<p>Most practices now take online requests through the NHS App, eConsult or Patchs. A clear written request often gets triaged the same day, no 8 AM phone queue. Say what you need, what is happening and since when, what you have tried, and how it is affecting you.</p>
${MIDCTA}
<h2>Do not sit on the things that matter</h2>
<p>Some symptoms are worth a prompt appointment rather than a wait: a new or changing lump, blood where it should not be, unexplained weight loss, a mole that is changing, chest pain on exertion, or problems passing urine. You do not need to self-diagnose; you just need to get it looked at.</p>
<h2>Make the appointment count</h2>
<p>Lead with the real reason you came, even if it is awkward. Note your main symptom, how long, and any questions in advance. Before you leave, confirm the plan and when to follow up. For anything severe or sudden, chest pain, trouble breathing, signs of a stroke, call 999.</p>` + cta,
  },
  {
    slug: "how-to-write-econsult-nhs-app-message",
    category: "NHS Shortcuts",
    title: "NHS App, Patchs, or eConsult: How to Write an Online GP Form That Gets Actioned",
    desc: "Most GP practices take online requests. A clear, well-structured message is far more likely to get a same-day response. Here is exactly what to write.",
    read: 4,
    body: `<p class="lead">The 8 AM phone scramble is not the only way in. Most GP practices in England accept online requests, through the NHS App, eConsult, Patchs or Anima, and a well-written one often gets triaged the same day. The trick is knowing what to put in it.</p>
<h2>Why the written route works</h2>
<p>When a clinician reads a clear, complete request, they can make a decision without phone tag. A vague "please call me" gets queued; a focused brief gets a plan.</p>
<h2>What to include</h2>
<p><strong>One clear ask:</strong> a prescription, referral, advice, sick note or results. One request per submission. <strong>The timeline:</strong> when it started and whether it is better or worse. <strong>Symptoms, specifically:</strong> where, how bad (a 0 to 10 score helps), what changes it. <strong>What you have tried:</strong> remedies, pain relief, previous treatments. <strong>The impact:</strong> what you cannot do right now. <strong>Your preference:</strong> call, face to face, or a message back.</p>
${MIDCTA}
<div class="tip">A simple structure to copy: <strong>What I need</strong> &rarr; <strong>What is happening</strong> (and since when) &rarr; <strong>What I have tried</strong> &rarr; <strong>How it is affecting me</strong> &rarr; <strong>My questions</strong>. That is exactly the shape the Kaur Care GP brief produces.</div>
<h2>Keep it to one issue</h2>
<p>If you have three separate problems, submit them separately or flag which can wait. Triage handles one clear issue far better than a mixed bag.</p>
<h2>When not to use online triage</h2>
<p>Online forms are for non-urgent problems. If symptoms are severe or fast-moving, chest pain, trouble breathing, a stiff neck with high fever, heavy bleeding or confusion, use NHS 111 or call 999.</p>` + cta,
  },
  {
    slug: "cant-get-a-gp-appointment-what-to-do-uk",
    category: "NHS Shortcuts",
    title: "Can't Get a GP Appointment? Your Faster NHS Options in England",
    desc: "When the GP line is always engaged, there are quicker NHS routes you may not have tried. A practical rundown for England.",
    read: 4,
    body: `<p class="lead">If you can never seem to get through, you are not out of options. Several NHS routes are designed exactly for the moments when a GP appointment is hard to come by.</p>
<h2>Start with the pharmacy</h2>
<p>NHS Pharmacy First lets a pharmacist assess and, where appropriate, treat seven common conditions, free and often same-day, with no GP appointment or referral: UTIs (women 16 to 64), sore throat, childhood earache, sinusitis, impetigo, infected insect bites and shingles.</p>
<h2>Use your practice's online front door</h2>
<p>Most practices accept online requests through the NHS App, eConsult or Patchs. A clear written request is often triaged the same day, no phone queue. Say what you need, what is happening and since when, what you have tried, and how it is affecting you.</p>
${MIDCTA}
<h2>NHS 111 for the in-between</h2>
<p>If you are not sure how urgent something is, NHS 111 (online or by phone) assesses symptoms day and night and directs you to the right service, which can include an urgent GP slot, a pharmacy, or an urgent treatment centre.</p>
<h2>Know your Right to Choose</h2>
<p>For routine referrals in England you can ask to be seen by an NHS-funded provider of your choice, which can shorten long waits. And for emergencies, chest pain, trouble breathing, signs of a stroke, always call 999.</p>` + cta,
  },
  {
    slug: "nhs-menopause-perimenopause-help-faster",
    category: "Women's Health",
    title: "Perimenopause & Menopause: How to Get NHS Help Faster",
    desc: "Perimenopause symptoms are often missed or minimised. Here is how to prepare, what to track, and how to get the right NHS conversation sooner.",
    read: 4,
    body: `<p class="lead">Perimenopause can start years before periods stop, and its symptoms, sleep, mood, brain fog, cycle changes, are easy to put down to stress. Preparing well is how you get taken seriously and get help sooner.</p>
<h2>Track before you talk</h2>
<p>Note your main symptoms and how long you have had them, how they affect sleep, mood and work, and any changes to your cycle. A couple of weeks of notes gives the clearest picture.</p>
<h2>Know the options exist</h2>
<p>There are effective approaches, including HRT for many people, as well as lifestyle and non-hormonal options. You do not need to have every answer; you need to open the conversation and ask what is suitable for you.</p>
${MIDCTA}
<h2>Make the appointment count</h2>
<p>Lead with your most troubling symptom. Ask directly about treatment options, including HRT, and what the next steps are. If you do not feel heard, it is reasonable to ask for another appointment or a review.</p>
<h2>When to seek help sooner</h2>
<p>Any unexpected bleeding, bleeding after your periods have stopped, or bleeding between periods should be checked promptly by your GP, as should any symptom that worries you.</p>` + cta,
  },
  {
    slug: "recurrent-uti-women-nhs-routes",
    category: "Women's Health",
    title: "Recurrent UTIs in Women: Faster NHS Routes and What to Track",
    desc: "If UTIs keep coming back, there are quicker NHS routes and useful things to track. A calm, practical guide, not medical advice.",
    read: 4,
    body: `<p class="lead">A one-off UTI is miserable; recurrent ones are exhausting. The good news is there are fast NHS routes, and a few things worth tracking that make appointments more productive.</p>
<h2>For a single, uncomplicated UTI</h2>
<p>Women aged 16 to 64 can often be assessed and treated the same day under NHS Pharmacy First, with no GP appointment. It is not suitable in pregnancy, for men, or if you feel very unwell or have back or flank pain, in which case you will be directed to a GP or NHS 111.</p>
<h2>When they keep coming back</h2>
<p>Recurrent UTIs (several in a year) are worth a longer GP conversation rather than repeat same-day fixes. Your GP can look at prevention and whether any further checks are needed.</p>
${MIDCTA}
<h2>What to track</h2>
<p>Note how many infections you have had in the last 6 to 12 months, any triggers you have spotted, what has helped or not, and how it affects daily life. Bring that summary to your appointment.</p>
<h2>When to seek help sooner</h2>
<p>A high temperature, shivering, back or side pain, or feeling very unwell can signal a more serious kidney infection, contact your GP urgently or call NHS 111. For severe symptoms, call 999.</p>` + cta,
  },
  {
    slug: "childrens-hay-fever-allergy-pharmacy-first",
    category: "Parents & Kids",
    title: "Children's Hay Fever & Allergies: Calm Options for UK Parents",
    desc: "Itchy eyes, sneezing and a streaming nose can wreck a child's summer. A calm guide to the comfort measures and NHS pharmacy routes for parents.",
    read: 4,
    body: `<p class="lead">Hay fever can make a child thoroughly miserable through spring and summer. Most of it can be managed well, and you rarely need to start with the GP.</p>
<h2>Everyday comfort measures</h2>
<p>Simple steps help a lot: keeping windows shut on high-pollen days, a wipe-down and change of clothes after playing outside, and keeping bedding fresh. A pharmacist can advise on suitable options for your child's age.</p>
<h2>Ask the pharmacy first</h2>
<p>Your pharmacist is the ideal first stop for seasonal allergy symptoms and can recommend what is appropriate. NHS pharmacy services for children's hay fever are also being expanded in many areas through 2026, so it is worth asking what is available locally, rather than assuming you need a GP.</p>
${MIDCTA}
<h2>When to see the GP</h2>
<p>Book a GP appointment if symptoms are severe, not controlled by the usual measures, or if your child also has asthma that seems to be flaring. Bring a note of what you have tried.</p>
<h2>The emergency exception</h2>
<p>Hay fever is not dangerous, but a sudden severe allergic reaction is. If a child has swelling of the lips or tongue, difficulty breathing, or becomes floppy or very distressed, call 999 immediately.</p>` + cta,
  },
  {
    slug: "periods-what-is-normal-when-to-see-gp",
    category: "Women's Health",
    title: "Period Problems: What's Normal, and When to See a GP",
    desc: "Cycles vary a lot, so what actually counts as a problem? A calm guide to what is usually normal and the changes worth getting checked.",
    read: 4,
    body: `<p class="lead">Periods are different for everyone, which makes it hard to know when something is worth raising. Here is a calm steer on what is usually within the normal range, and the changes that deserve a GP conversation.</p>
<h2>What is usually normal</h2>
<p>A typical cycle runs anywhere from about 21 to 35 days, with bleeding of two to seven days. Some cramping, mood changes and tiredness around your period are common. Cycles can also shift with stress, travel, weight changes and age.</p>
<h2>Changes worth getting checked</h2>
<p>It is reasonable to see your GP if your periods become much heavier, longer or more painful than usual, if they stop or become very irregular when that is not normal for you, or if pain is interfering with daily life. Bleeding between periods, after sex, or after the menopause should always be checked.</p>
${MIDCTA}
<h2>How to prepare</h2>
<p>Track a couple of cycles: dates, how heavy, pain score at its worst, and the impact on work and sleep. That short summary helps your GP far more than trying to remember on the spot.</p>
<h2>When to seek help sooner</h2>
<p>Soaking through pads or tampons every hour for several hours, feeling faint or very breathless, or severe sudden pelvic pain need prompt help, contact your GP or NHS 111, and call 999 for severe symptoms.</p>` + cta,
  },
  {
    slug: "heavy-periods-menorrhagia-nhs-help",
    category: "Women's Health",
    title: "Heavy Periods (Menorrhagia): NHS Help and What to Track",
    desc: "Heavy menstrual bleeding is common and treatable, and you do not have to just put up with it. What to track and how to get NHS help.",
    read: 4,
    body: `<p class="lead">Heavy periods are more common than most people realise, and they are not something you simply have to endure. There are effective options, and a clear picture of your bleeding makes the conversation quicker.</p>
<h2>What counts as heavy</h2>
<p>It is less about a precise measurement and more about impact: changing protection every hour or two, flooding, passing large clots, needing double protection, or planning your life around your period. Heavy bleeding can also leave you tired, which is worth mentioning.</p>
<h2>What to track before your appointment</h2>
<p>Note how many days you bleed, how often you change protection on the heaviest days, any clots or flooding, your energy levels, and how it affects work and daily life. Two cycles of notes is plenty.</p>
${MIDCTA}
<h2>Getting NHS help</h2>
<p>Your GP can discuss options and whether any checks are useful. Because heavy periods can cause low iron, it is reasonable to ask whether an iron or blood check is appropriate, especially if you feel tired or breathless.</p>
<h2>When to seek help sooner</h2>
<p>Soaking through protection every hour for several hours, feeling faint, or a racing heart need prompt attention, contact your GP or NHS 111 the same day, and 999 for severe symptoms.</p>` + cta,
  },
  {
    slug: "painful-periods-dysmenorrhea-comfort-and-care",
    category: "Women's Health",
    title: "Painful Periods: Comfort Measures and When It's More Than Cramps",
    desc: "Period pain is common, but pain that stops your life is worth checking. Gentle comfort measures and the signs that deserve a GP visit.",
    read: 4,
    body: `<p class="lead">Cramps are a normal part of periods for many people, but pain that regularly keeps you off work, school or your feet is a different matter, and worth raising rather than powering through.</p>
<h2>Everyday comfort</h2>
<p>Many people find relief from a heat pad on the lower tummy or back, gentle movement, staying hydrated and rest. A pharmacist can advise on suitable over-the-counter pain relief and how to take it effectively.</p>
<h2>When it is more than ordinary cramps</h2>
<p>See your GP if period pain is severe, getting worse over time, not helped by the usual measures, or comes with very heavy bleeding, pain during sex, or pain when going to the toilet. Persistent severe pain can be linked to conditions like endometriosis, which are worth investigating.</p>
${MIDCTA}
<h2>How to be heard</h2>
<p>Describe where the pain is, a 0 to 10 score at its worst, how it tracks with your cycle, what you have tried, and the impact on daily life. Being specific helps your GP take it seriously and act.</p>
<h2>When to seek help sooner</h2>
<p>Sudden severe pelvic pain, pain with fever, or feeling faint need prompt help, contact your GP or NHS 111, and call 999 for severe symptoms.</p>` + cta,
  },
  {
    slug: "pcos-symptoms-nhs-diagnosis-guide",
    category: "Women's Health",
    title: "PCOS: Spotting the Signs and Getting an NHS Diagnosis",
    desc: "Polycystic ovary syndrome is common but often missed. The signs to look for and how to approach getting an NHS diagnosis.",
    read: 4,
    body: `<p class="lead">PCOS (polycystic ovary syndrome) is one of the most common hormonal conditions, yet it often takes far too long to name. Knowing the signs helps you have a focused conversation with your GP.</p>
<h2>Common signs</h2>
<p>PCOS can show up as irregular or missing periods, along with things like acne, excess hair growth, weight changes, or difficulty conceiving. It varies a lot from person to person, and not everyone has every symptom.</p>
<h2>Getting a diagnosis</h2>
<p>Diagnosis usually involves your GP reviewing your symptoms and history and arranging some checks, which may include blood tests and sometimes a scan. It is reasonable to ask directly whether PCOS could explain your symptoms.</p>
${MIDCTA}
<h2>What to bring</h2>
<p>Track your cycle length and how irregular it is, any skin, hair or weight changes, family history, and any fertility plans or concerns. A clear summary speeds things up.</p>
<h2>Looking after yourself</h2>
<p>PCOS is manageable, and support exists for the symptoms that bother you most. If periods stop for a long time, or you have concerns about fertility or mood, raise these specifically so they can be addressed. For anything severe or sudden, use NHS 111 or 999.</p>` + cta,
  },
  {
    slug: "endometriosis-getting-diagnosed-faster-uk",
    category: "Women's Health",
    title: "Endometriosis: How to Get Taken Seriously and Diagnosed Faster",
    desc: "Endometriosis diagnosis in the UK can take years. Practical steps to be heard sooner and move towards the right care.",
    read: 5,
    body: `<p class="lead">Endometriosis affects around one in ten women and those assigned female at birth, yet getting a diagnosis can take years. Preparation and persistence genuinely help shorten that journey.</p>
<h2>What it can feel like</h2>
<p>Common experiences include painful periods that disrupt daily life, chronic pelvic pain, pain during or after sex, pain when going to the toilet during your period, and sometimes difficulty conceiving. Pain that is dismissed as "just bad periods" can be worth a closer look.</p>
<h2>Being heard at the GP</h2>
<p>Go in with specifics: where the pain is, how long you have had it, how it tracks with your cycle, a pain score, what you have tried, and the impact on work, study and relationships. Ask clearly whether endometriosis could be the cause and what the next step is.</p>
${MIDCTA}
<h2>If progress stalls</h2>
<p>It is reasonable to return if symptoms continue, to ask about referral to a gynaecologist, and in England to ask about your Right to Choose, which can shorten waits for a specialist assessment. Keeping a symptom diary across a few cycles strengthens your case.</p>
<h2>When to seek help sooner</h2>
<p>Sudden severe pelvic pain, pain with fever or feeling faint need urgent help, contact your GP or NHS 111, and call 999 for severe symptoms.</p>` + cta,
  },
  {
    slug: "pms-pmdd-getting-support",
    category: "Women's Health",
    title: "PMS and PMDD: Getting Support, Not Just 'It's Hormonal'",
    desc: "When the days before your period affect your mood and life, it deserves real support. Understanding PMS, PMDD and how to get help.",
    read: 4,
    body: `<p class="lead">Feeling low, irritable or anxious in the days before your period is common, but when it seriously affects your mood, relationships or ability to function, it deserves proper support rather than a shrug.</p>
<h2>PMS and PMDD</h2>
<p>Premenstrual syndrome (PMS) covers the physical and emotional symptoms many people get before a period. Premenstrual dysphoric disorder (PMDD) is a more severe form, where mood symptoms are intense and disruptive, and it is recognised and treatable.</p>
<h2>Tracking the pattern</h2>
<p>The key clue is timing: symptoms that reliably appear in the run-up to your period and ease once it starts. Tracking your mood and symptoms against your cycle for two or three months gives your GP a clear picture.</p>
${MIDCTA}
<h2>Getting help</h2>
<p>Take your symptom diary to your GP and describe the impact honestly, including on work and relationships. There are approaches that can help, and you are entitled to have the conversation taken seriously.</p>
<h2>An important note</h2>
<p>If you ever have thoughts of harming yourself, please reach out now: call NHS 111 and select the mental health option, contact the Samaritans on 116 123, or call 999 in an emergency. You deserve support straight away.</p>` + cta,
  },
  {
    slug: "irregular-periods-causes-when-to-check",
    category: "Women's Health",
    title: "Irregular Periods: Common Causes and When to Get Checked",
    desc: "Cycles that are all over the place can have many causes, from stress to perimenopause. What is usually behind it and when to see a GP.",
    read: 4,
    body: `<p class="lead">Periods that arrive early, late, or skip a month can be unsettling. Often there is a straightforward explanation, but some changes are worth checking so nothing is missed.</p>
<h2>Common reasons cycles shift</h2>
<p>Stress, significant weight change, intense exercise, travel, some contraception, thyroid issues and approaching perimenopause can all affect regularity. In your 40s, more variable cycles are often an early sign of perimenopause.</p>
<h2>When to see your GP</h2>
<p>Book an appointment if your periods suddenly become very irregular when that is not normal for you, stop for several months (and you are not pregnant or using contraception that does this), or come with other symptoms like significant weight or mood changes. Always get bleeding after the menopause checked.</p>
${MIDCTA}
<h2>What helps the conversation</h2>
<p>Track your cycle dates over a few months, note any other changes, and mention any family history. This helps your GP decide whether checks, such as blood tests, would be useful.</p>
<h2>When to seek help sooner</h2>
<p>Very heavy bleeding, feeling faint, or severe pelvic pain need prompt attention, contact your GP or NHS 111, and 999 for severe symptoms.</p>` + cta,
  },
  {
    slug: "heavy-periods-iron-anaemia-check",
    category: "Women's Health",
    title: "Heavy Periods and Tiredness: The Iron Link Worth Checking",
    desc: "Constant exhaustion with heavy periods is not just 'being busy'. Why heavy bleeding can lower your iron, and what to ask your GP.",
    read: 4,
    body: `<p class="lead">If heavy periods leave you wiped out, breathless on the stairs or struggling to concentrate, it is worth knowing that heavy menstrual bleeding is a common cause of low iron, and that is something your GP can check.</p>
<h2>Why the link matters</h2>
<p>Losing a lot of blood each month can gradually lower your iron stores and lead to iron-deficiency anaemia. Symptoms can creep up slowly: tiredness, looking pale, feeling breathless, headaches, or brittle nails.</p>
<h2>What to ask</h2>
<p>If you have heavy periods and these symptoms, it is reasonable to ask your GP whether a blood test to check your iron levels would be appropriate. Mention how heavy your periods are and how tired you feel, so the two are considered together.</p>
${MIDCTA}
<h2>Helping yourself in the meantime</h2>
<p>A balanced diet with iron-rich foods supports your levels, and a pharmacist can advise on whether an over-the-counter supplement is suitable for you. Do not start high-dose supplements long term without advice, as more is not always better.</p>
<h2>When to seek help sooner</h2>
<p>Severe breathlessness, chest pain, a racing heart or feeling faint need urgent help, contact NHS 111 or call 999 for severe symptoms.</p>` + cta,
  },
  {
    slug: "chronic-illness-advocate-for-yourself-nhs",
    category: "Chronic Illness",
    title: "Living With a Chronic Illness: How to Advocate for Yourself in the NHS",
    desc: "A long-term condition means a long-term relationship with the NHS. Practical, calm ways to stay in control, be heard, and keep your care joined up.",
    read: 5,
    body: `<p class="lead">When you live with a chronic or long-term condition, you are not a one-off appointment, you are in an ongoing relationship with a busy system that does not always join itself up. Advocating for yourself is not being difficult; it is how you get consistent, coordinated care. Here is how to do it with the least stress.</p>
<h2>Keep your own record</h2>
<p>The single most powerful thing you can do is keep a simple personal record: your diagnoses, medicines and doses, key dates, test results and which clinician said what. The NHS App gives you access to much of this, and your own notes fill the gaps. When departments do not talk to each other, your record is the thread that connects them.</p>
<h2>One clear ask per appointment</h2>
<p>Appointments are short. Decide your top one or two priorities beforehand and lead with them. Bring a written summary of your symptoms since last time, what has changed, and your questions. It keeps a rushed appointment focused on what matters to you.</p>
${MIDCTA}
<h2>Ask for coordination</h2>
<p>If several teams are involved, it is reasonable to ask who is overseeing your care overall, whether there is a named contact or care coordinator, and how results and letters will be shared between them and your GP. Ask for copies of clinic letters so nothing falls through the cracks.</p>
<h2>Know your rights</h2>
<p>You are entitled to ask questions, to understand your options, to a second opinion, and in England to use your Right to Choose for a clinically appropriate NHS provider. If you do not understand something, it is always fair to ask the clinician to explain it again.</p>
<h2>Look after the whole of you</h2>
<p>Living with a long-term condition is tiring, and low mood or anxiety are common and valid. Mention them to your GP, they are part of your health, not a distraction from it. If you ever feel unable to cope or have thoughts of harming yourself, reach out now: NHS 111 (mental health option), the Samaritans on 116 123, or 999 in an emergency. For a sudden change in your condition or severe new symptoms, use NHS 111 or 999.</p>` + cta,
  },
  {
    slug: "not-being-believed-long-term-symptoms-gp",
    category: "Chronic Illness",
    title: "When You Feel Dismissed: Getting Taken Seriously About Long-Term Symptoms",
    desc: "Being told it's 'nothing' or 'just stress' when you know something is wrong is exhausting. Calm, practical ways to be heard and move toward answers.",
    read: 5,
    body: `<p class="lead">Few things are more wearing than knowing something is wrong and feeling brushed off. If you have been told it is probably stress, or sent away without a plan more than once, this is not about being pushy, it is about giving the system what it needs to take you seriously.</p>
<h2>Bring evidence, not just a description</h2>
<p>Track your symptoms over a few weeks: when they happen, how severe (a 0 to 10 scale helps), what triggers or eases them, and crucially the impact on your work, sleep and daily life. Patterns on paper are harder to dismiss than a description in a rushed appointment.</p>
<h2>Ask specific, answerable questions</h2>
<p>Questions that move things forward include: "What else could this be?", "What would need to be true for you to investigate further?", "What are we ruling out, and how?", and "What is the plan if this does not improve by a set date?" These invite a next step rather than reassurance.</p>
${MIDCTA}
<h2>Ask for it to be documented</h2>
<p>It is reasonable to ask that your symptoms and your concern are recorded in your notes, including that you asked about further investigation. A clear record helps continuity and makes the next appointment build on this one.</p>
<h2>Use your right to a second opinion</h2>
<p>You can ask for a second opinion, and in England you can use your Right to Choose to be referred to a clinically appropriate NHS provider. A fresh set of eyes is a normal part of medicine, not a criticism of anyone.</p>
<h2>Be kind to yourself, and know the red lines</h2>
<p>Persisting is tiring, and it is not your fault that it is hard. Keep going, bring someone with you if it helps, and do not downplay how it affects you. If symptoms are severe or rapidly worsening, chest pain, trouble breathing, sudden weakness, heavy bleeding, do not wait to be believed, call NHS 111 or 999. And if things feel hopeless, the Samaritans (116 123) are there any time.</p>` + cta,
  },
];

for (const a of articles) {
  const url = `${SITE}/journal/${a.slug}`;
  const page = `${head(a.title, a.desc, url)}
<main>
<article>
<p class="eyebrow">${a.category}</p>
<h1>${a.title}</h1>
<p class="meta">${a.read} min read &middot; The Kaur Care Journal</p>
${a.body}
</article>
</main>
${footer}`;
  writeFileSync(join(outDir, `${a.slug}.html`), page);
}

// Hub with category filter pills + read-time badges
const pills = CATS.map((c, i) => `<button class="pill${i === 0 ? " active" : ""}" data-cat="${c === "All" ? "all" : catSlug(c)}" onclick="filterCat(this)">${c}</button>`).join("\n");
const cards = articles.map((a) => `<a class="ccard" data-cat="${catSlug(a.category)}" href="/journal/${a.slug}">
<div class="row"><span class="cat">${a.category}</span><span class="rt">${a.read} min</span></div>
<h3>${a.title}</h3>
<p>${a.desc}</p>
</a>`).join("\n");

const hub = `${head("The Kaur Care Journal", "Warm, practical guides to getting NHS care faster: Pharmacy First, Right to Choose, eConsults, women's health and preparing for your GP appointment.", `${SITE}/journal`)}
<main class="hub">
<p class="eyebrow">The Kaur Care Journal</p>
<h1>Everyday care, explained simply</h1>
<p class="lead">Plain-English guides to getting the care you need faster, from same-day pharmacy help to using your NHS Right to Choose.</p>
<div class="pills">
${pills}
</div>
<div id="grid" class="grid three">
${cards}
</div>
${cta}
</main>
${footer.replace("</body></html>", "")}
<script>
function filterCat(btn){
  document.querySelectorAll('.pills .pill').forEach(function(p){p.classList.remove('active');});
  btn.classList.add('active');
  var cat = btn.getAttribute('data-cat');
  document.querySelectorAll('#grid .ccard').forEach(function(c){
    c.style.display = (cat === 'all' || c.getAttribute('data-cat') === cat) ? '' : 'none';
  });
}
</script>
</body></html>`;
writeFileSync(join(outDir, "index.html"), hub);

console.log(`Journal built: ${articles.length} articles + hub`);
console.log(`  <url><loc>${SITE}/journal</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
for (const a of articles) console.log(`  <url><loc>${SITE}/journal/${a.slug}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`);
