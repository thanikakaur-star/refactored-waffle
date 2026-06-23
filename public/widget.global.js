"use strict";(()=>{(()=>{let h=window.__PANJABI_CHAT_API||"/api/chat",L=`
    .pcb-widget{position:fixed;bottom:20px;right:20px;z-index:99999;font-family:-apple-system,system-ui,sans-serif}
    .pcb-toggle{width:60px;height:60px;border-radius:50%;border:none;background:linear-gradient(135deg,#ff6b35,#f7931e);color:#fff;font-size:28px;cursor:pointer;box-shadow:0 4px 20px rgba(255,107,53,.4);transition:transform .2s}
    .pcb-toggle:hover{transform:scale(1.1)}
    .pcb-panel{display:none;width:380px;height:520px;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.15);flex-direction:column;overflow:hidden;position:absolute;bottom:72px;right:0}
    .pcb-panel.open{display:flex}
    .pcb-header{background:linear-gradient(135deg,#ff6b35,#f7931e);padding:16px 20px;color:#fff}
    .pcb-header h3{margin:0;font-size:16px;font-weight:600}
    .pcb-header p{margin:4px 0 0;font-size:12px;opacity:.85}
    .pcb-close{position:absolute;top:12px;right:16px;background:none;border:none;color:#fff;font-size:20px;cursor:pointer;opacity:.8}
    .pcb-close:hover{opacity:1}
    .pcb-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
    .pcb-msg{max-width:85%;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.5;word-wrap:break-word}
    .pcb-msg.bot{background:#f0ebe4;color:#333;align-self:flex-start;border-bottom-left-radius:4px}
    .pcb-msg.user{background:#ff6b35;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
    .pcb-input-row{display:flex;border-top:1px solid #eee;padding:10px}
    .pcb-input-row input{flex:1;border:1px solid #ddd;border-radius:8px;padding:10px 12px;font-size:14px;outline:none}
    .pcb-input-row input:focus{border-color:#ff6b35}
    .pcb-input-row button{margin-left:8px;background:#ff6b35;color:#fff;border:none;border-radius:8px;padding:10px 16px;cursor:pointer;font-size:14px;font-weight:600}
    .pcb-input-row button:disabled{opacity:.5;cursor:default}
    .pcb-lead{padding:16px;border-top:1px solid #eee;background:#faf8f5}
    .pcb-lead p{margin:0 0 10px;font-size:13px;color:#555;line-height:1.4}
    .pcb-lead .pcb-input-row{border:none;padding:0}
    .pcb-lead .pcb-done{color:#2e7d32;font-size:13px;font-weight:600}
  `,l=[],x=!1,m=0;function y(){let i=document.createElement("style");i.textContent=L,document.head.appendChild(i)}function o(i,s,e){let t=document.createElement(i);return s&&(t.className=s),e&&(t.textContent=e),t}function w(){let i=o("div","pcb-widget"),s=o("button","pcb-toggle","\u{1F3A8}");s.setAttribute("aria-label","Open chat");let e=o("div","pcb-panel");e.innerHTML=`
      <div class="pcb-header" style="position:relative">
        <h3>Panjabi Cultural Guide</h3>
        <p>Ask about Sikh history, Gurmukhi & more</p>
        <button class="pcb-close" aria-label="Close">&times;</button>
      </div>
    `;let t=o("div","pcb-messages"),A=o("div","pcb-msg bot","Sat Sri Akaal! I'm your Panjabi Cultural Guide. Ask me about Sikh history, Gurmukhi script, festivals, or traditions \u2014 I'd love to share!");t.appendChild(A);let c=o("div","pcb-input-row"),r=document.createElement("input");r.type="text",r.placeholder="Ask about Panjabi culture...";let p=o("button",void 0,"Send");c.appendChild(r),c.appendChild(p);let a=o("div","pcb-lead");a.style.display="none",a.innerHTML=`
      <p>Want 3 free colouring pages featuring Gurmukhi letters &amp; Gurdwara art?</p>
      <div class="pcb-input-row">
        <input type="email" placeholder="Your email address" />
        <button>Get Free Pages</button>
      </div>
    `,e.appendChild(t),e.appendChild(c),e.appendChild(a),i.appendChild(e),i.appendChild(s),document.body.appendChild(i),s.addEventListener("click",()=>{e.classList.toggle("open"),e.classList.contains("open")&&r.focus()}),e.querySelector(".pcb-close").addEventListener("click",()=>{e.classList.remove("open")});async function v(){let n=r.value.trim();if(!n)return;r.value="";let k=o("div","pcb-msg user",n);t.appendChild(k),t.scrollTop=t.scrollHeight,l.push({role:"user",content:n}),p.setAttribute("disabled","true");let u=o("div","pcb-msg bot","");t.appendChild(u);try{let b=await fetch(`${h}/message`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:n,history:l.slice(0,-1),stream:!0})});if(!b.ok||!b.body)throw new Error("Request failed");let z=b.body.getReader(),P=new TextDecoder,f="",g="";for(;;){let{done:H,value:I}=await z.read();if(H)break;g+=P.decode(I,{stream:!0});let C=g.split(`
`);g=C.pop()||"";for(let S of C){if(!S.startsWith("data: "))continue;let E=S.slice(6);if(E!=="[DONE]")try{let T=JSON.parse(E);T.text&&(f+=T.text,u.textContent=f,t.scrollTop=t.scrollHeight)}catch{}}}l.push({role:"assistant",content:f}),m++,m>=2&&!x&&(a.style.display="block")}catch{u.textContent="Sorry, something went wrong. Please try again."}p.removeAttribute("disabled"),r.focus()}p.addEventListener("click",v),r.addEventListener("keydown",n=>{n.key==="Enter"&&v()});let M=a.querySelector('input[type="email"]'),d=a.querySelector("button");d.addEventListener("click",async()=>{let n=M.value.trim();if(n){d.setAttribute("disabled","true"),d.textContent="Sending...";try{if(!(await fetch(`${h}/lead`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:n})})).ok)throw new Error;x=!0,a.innerHTML='<p class="pcb-done">Check your inbox \u2014 your free pages are on the way!</p>'}catch{d.removeAttribute("disabled"),d.textContent="Try Again"}}})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{y(),w()}):(y(),w())})();})();
