// Kaur Care DEFAULT carousel template (see DESIGN.md, "Introductory Carousel").
// Copy this file for each new carousel and edit only the `slides` array copy.
// Needs: playwright; public/logo-emblem.png; wordmark PNGs (_wm_green.png / _wm_white.png,
// extracted from the official logo); embedded-fonts.css (base64 Fraunces + Plus Jakarta Sans).
// Set OUT below to the folder holding those assets. Output: intro-N.png at 1080x1350.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/tmp/claude-0/-home-user-refactored-waffle/baccdea3-a23f-58af-9363-0b886642c44e/scratchpad';
const emblem = 'data:image/png;base64,' + fs.readFileSync('/home/user/refactored-waffle/public/logo-emblem.png').toString('base64');
const WM = 'data:image/png;base64,' + fs.readFileSync(OUT + '/_wm_green.png').toString('base64');
const WMW = 'data:image/png;base64,' + fs.readFileSync(OUT + '/_wm_white.png').toString('base64');
const FONTS = fs.readFileSync(OUT + '/embedded-fonts.css', 'utf8');

const css = `
  *{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased}
  :root{--sage:#2D5A47;--cream:#FAF7F2;--linen:#F4ECDE;--sand:#E8E0D5;--terra:#C87A5A;--muted:#6b6256}
  .slide{width:1080px;height:1350px;position:relative;overflow:hidden;font-family:'Plus Jakarta Sans',system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:var(--cream)}
  .serif{font-family:'Fraunces',Georgia,'Times New Roman',serif}
  .leaf{position:absolute;opacity:.06}
  .pad{position:absolute;inset:0;padding:100px 90px;display:flex;flex-direction:column}
  .eyebrow{color:var(--terra);font-weight:800;letter-spacing:.15em;text-transform:uppercase;font-size:27px}
  h1{color:var(--sage);font-weight:600;line-height:1.05;letter-spacing:-.5px}
  p.body{color:#454a44;font-size:39px;line-height:1.45}
  .num{position:absolute;top:74px;right:90px;color:var(--sand);font-weight:800;font-size:30px}
  .url{color:var(--sage);font-weight:800;font-size:34px}.swipe{color:var(--terra);font-weight:800;font-size:34px}
  .foot{position:absolute;left:90px;right:90px;bottom:72px;display:flex;align-items:center;justify-content:space-between}
  .li{display:flex;align-items:flex-start;gap:20px;font-size:37px;color:#3a403a;font-weight:600;line-height:1.3;margin-bottom:22px}
  .dot{width:15px;height:15px;border-radius:999px;background:var(--terra);flex:none;margin-top:14px}
`;
const leaf=(pos,s,c)=>`<svg class="leaf" style="${pos};width:${s}px;height:${s}px" viewBox="-100 -100 200 200"><path fill="${c}" d="M45,-75C58,-67,76,-45,88,-1C80,29,53,65,-1,86C-32,85,-67,56,-88,-1C-85,-33,-57,-67,0,-85C15,-85,30,-83,45,-75Z"/></svg>`;
const html=inner=>`<!doctype html><html><head><meta charset="utf8"><style>${FONTS}${css}</style></head><body>${inner}</body></html>`;
const li=t=>`<div class="li"><span class="dot"></span><span>${t}</span></div>`;

const slides=[
 // 1 cover
 `<div class="slide">${leaf('left:-130px;top:-150px',540,'#2D5A47')}${leaf('right:-150px;bottom:-170px',560,'#C87A5A')}
   <div class="pad" style="align-items:center;text-align:center;justify-content:center">
     <span class="eyebrow" style="margin-bottom:26px">Introducing</span>
     <img style="height:250px;margin-bottom:22px" src="${emblem}">
     <img style="height:130px;margin-bottom:46px" src="${WM}">
     <h1 class="serif" style="font-size:86px;max-width:840px">Care navigation that puts you back in control.</h1>
     <p class="body" style="margin-top:32px;color:var(--muted)">Your health, your voice.</p>
   </div>
   <div class="foot"><span class="url">kaurcare.com</span><span class="swipe">swipe →</span></div></div>`,
 // 2 why
 `<div class="slide" style="background:var(--linen)">${leaf('right:-150px;top:-150px',500,'#C87A5A')}
   <div class="pad"><span class="num">01</span><span class="eyebrow">Why Kaur Care</span>
     <h1 class="serif" style="font-size:84px;margin-top:18px">So many people feel unheard.</h1>
     <p class="body" style="margin-top:30px;max-width:880px">Brushed to the side. Rushed through a 10-minute slot. Passed around and still no answers. If you've ever left an appointment feeling dismissed — this is for you.</p>
   </div><div class="foot"><span class="url">kaurcare.com</span><span class="swipe">→</span></div></div>`,
 // 3 story
 `<div class="slide">${leaf('left:-150px;bottom:-150px',520,'#2D5A47')}
   <div class="pad"><span class="num">02</span><span class="eyebrow">The story</span>
     <h1 class="serif" style="font-size:80px;margin-top:18px">I built this for them — and for you.</h1>
     <p class="body" style="margin-top:30px;max-width:900px">Shaped by my clinical experience, the experiences of people around me, and what I learned during my Master's. Having seen <b>both sides</b>, I wanted to make the whole thing easier — for patients <i>and</i> the people caring for them.</p>
   </div><div class="foot"><span class="url">kaurcare.com</span><span class="swipe">→</span></div></div>`,
 // 4 what we do
 `<div class="slide" style="background:var(--linen)">${leaf('right:-140px;bottom:-150px',500,'#C87A5A')}
   <div class="pad"><span class="num">03</span><span class="eyebrow">What we do</span>
     <h1 class="serif" style="font-size:84px;margin-top:18px">Your fastest route to care.</h1>
     <div style="margin-top:40px">
       ${li('<b>Tell us</b> who it\'s for and what\'s wrong')}
       ${li('<b>See your real options</b> — matched to your postcode')}
       ${li('<b>Walk in prepared</b>, with your words ready')}
     </div>
   </div><div class="foot"><span class="url">kaurcare.com</span><span class="swipe">→</span></div></div>`,
 // 5 everything we offer
 `<div class="slide">${leaf('left:-140px;top:-150px',480,'#2D5A47')}
   <div class="pad"><span class="num">04</span><span class="eyebrow">Everything we offer</span>
     <h1 class="serif" style="font-size:72px;margin-top:16px;margin-bottom:30px">All in one calm place</h1>
     <div style="display:flex;gap:40px">
       <div style="flex:1">${li('Same-day NHS Pharmacy First')}${li('Right to Choose — shorter waits')}${li('Women\'s health')}${li('Babies &amp; pregnancy')}</div>
       <div style="flex:1">${li('Menopause education')}${li('Eczema &amp; skin, all skin tones')}${li('Holistic wellness')}${li('GP brief, RTC letter &amp; SBAR')}</div>
     </div>
   </div><div class="foot"><span class="url">kaurcare.com</span><span class="swipe">→</span></div></div>`,
 // 6 comfort / anxiety
 `<div class="slide" style="background:var(--sage)">${leaf('right:-150px;top:-160px',540,'#ffffff')}${leaf('left:-150px;bottom:-160px',520,'#C87A5A')}
   <div class="pad"><span class="num" style="color:rgba(255,255,255,.3)">05</span>
     <span class="eyebrow" style="color:#f0c9b6">Less anxiety, more calm</span>
     <h1 class="serif" style="font-size:84px;margin-top:18px;color:#fff">Appointments don't have to be scary.</h1>
     <p class="body" style="margin-top:30px;max-width:900px;color:rgba(255,255,255,.9)">Know your rights before you go. Have your symptoms, questions and story ready on one page. Walk in calm, clear and confident — so you're heard the first time.</p>
   </div><div class="foot"><span class="url" style="color:#fff">kaurcare.com</span><span class="swipe" style="color:#f0c9b6">→</span></div></div>`,
 // 7 both sides
 `<div class="slide" style="background:var(--linen)">${leaf('left:-150px;top:-140px',500,'#2D5A47')}
   <div class="pad"><span class="num">06</span><span class="eyebrow">For everyone in the room</span>
     <h1 class="serif" style="font-size:80px;margin-top:18px">Easier for patients <br>AND providers.</h1>
     <p class="body" style="margin-top:30px;max-width:900px">When you arrive prepared, clinicians get a clear picture fast — less back-and-forth, better conversations, and care that actually moves forward. Everybody wins.</p>
   </div><div class="foot"><span class="url">kaurcare.com</span><span class="swipe">→</span></div></div>`,
 // 8 CTA
 `<div class="slide" style="background:var(--sage)">${leaf('right:-150px;top:-160px',520,'#ffffff')}${leaf('left:-150px;bottom:-160px',520,'#C87A5A')}
   <div class="pad" style="align-items:center;text-align:center;justify-content:center">
     <img style="height:220px;margin-bottom:24px" src="${emblem}">
     <img style="height:110px;margin-bottom:50px" src="${WMW}">
     <h1 class="serif" style="font-size:88px;color:#fff">Free. No sign-up.<br>Private.</h1>
     <p class="body" style="margin-top:28px;color:rgba(255,255,255,.85)">Come and find your care options.</p>
     <div style="margin-top:54px;background:#fff;color:var(--sage);font-weight:800;font-size:44px;padding:28px 58px;border-radius:999px">kaurcare.com</div>
   </div></div>`
];

(async()=>{
  const b=await chromium.launch();
  for(let i=0;i<slides.length;i++){
    const pg=await b.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1});
    await pg.setContent(html(slides[i]),{waitUntil:'load'}); await pg.waitForTimeout(500);
    await pg.screenshot({path:`${OUT}/intro-${i+1}.png`,clip:{x:0,y:0,width:1080,height:1350}}); await pg.close();
  }
  // preview sheet
  const p=await b.newPage({viewport:{width:1400,height:500}});
  const d=n=>'data:image/png;base64,'+fs.readFileSync(OUT+'/'+n).toString('base64');
  await p.setContent(`<body style="margin:0;background:#fff;display:flex;flex-wrap:wrap;gap:8px;padding:12px">${slides.map((_,i)=>`<img src="${d('intro-'+(i+1)+'.png')}" style="width:160px;border:1px solid #ddd">`).join('')}</body>`);
  await p.waitForTimeout(300); await p.screenshot({path:OUT+'/intro-sheet.png',fullPage:true}); await p.close();
  await b.close(); console.log('wrote', slides.length, 'intro slides');
})();
