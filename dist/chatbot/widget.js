"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
(() => {
    const API_BASE = window.__PANJABI_CHAT_API || "/api/chat";
    const STYLES = `
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
  `;
    let history = [];
    let leadCaptured = false;
    let messageCount = 0;
    function injectStyles() {
        const s = document.createElement("style");
        s.textContent = STYLES;
        document.head.appendChild(s);
    }
    function el(tag, cls, text) {
        const e = document.createElement(tag);
        if (cls)
            e.className = cls;
        if (text)
            e.textContent = text;
        return e;
    }
    function buildUI() {
        const widget = el("div", "pcb-widget");
        const toggle = el("button", "pcb-toggle", "🎨");
        toggle.setAttribute("aria-label", "Open chat");
        const panel = el("div", "pcb-panel");
        panel.innerHTML = `
      <div class="pcb-header" style="position:relative">
        <h3>Panjabi Cultural Guide</h3>
        <p>Ask about Sikh history, Gurmukhi & more</p>
        <button class="pcb-close" aria-label="Close">&times;</button>
      </div>
    `;
        const messages = el("div", "pcb-messages");
        const welcome = el("div", "pcb-msg bot", "Sat Sri Akaal! I'm your Panjabi Cultural Guide. Ask me about Sikh history, Gurmukhi script, festivals, or traditions — I'd love to share!");
        messages.appendChild(welcome);
        const inputRow = el("div", "pcb-input-row");
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "Ask about Panjabi culture...";
        const sendBtn = el("button", undefined, "Send");
        inputRow.appendChild(input);
        inputRow.appendChild(sendBtn);
        const leadSection = el("div", "pcb-lead");
        leadSection.style.display = "none";
        leadSection.innerHTML = `
      <p>Want 3 free colouring pages featuring Gurmukhi letters &amp; Gurdwara art?</p>
      <div class="pcb-input-row">
        <input type="email" placeholder="Your email address" />
        <button>Get Free Pages</button>
      </div>
    `;
        panel.appendChild(messages);
        panel.appendChild(inputRow);
        panel.appendChild(leadSection);
        widget.appendChild(panel);
        widget.appendChild(toggle);
        document.body.appendChild(widget);
        toggle.addEventListener("click", () => {
            panel.classList.toggle("open");
            if (panel.classList.contains("open"))
                input.focus();
        });
        panel.querySelector(".pcb-close").addEventListener("click", () => {
            panel.classList.remove("open");
        });
        async function sendMessage() {
            const text = input.value.trim();
            if (!text)
                return;
            input.value = "";
            const userBubble = el("div", "pcb-msg user", text);
            messages.appendChild(userBubble);
            messages.scrollTop = messages.scrollHeight;
            history.push({ role: "user", content: text });
            sendBtn.setAttribute("disabled", "true");
            const botBubble = el("div", "pcb-msg bot", "");
            messages.appendChild(botBubble);
            try {
                const res = await fetch(`${API_BASE}/message`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: text, history: history.slice(0, -1), stream: true }),
                });
                if (!res.ok || !res.body)
                    throw new Error("Request failed");
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let fullReply = "";
                let buffer = "";
                while (true) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";
                    for (const line of lines) {
                        if (!line.startsWith("data: "))
                            continue;
                        const payload = line.slice(6);
                        if (payload === "[DONE]")
                            continue;
                        try {
                            const parsed = JSON.parse(payload);
                            if (parsed.text) {
                                fullReply += parsed.text;
                                botBubble.textContent = fullReply;
                                messages.scrollTop = messages.scrollHeight;
                            }
                        }
                        catch { /* skip malformed */ }
                    }
                }
                history.push({ role: "assistant", content: fullReply });
                messageCount++;
                if (messageCount >= 2 && !leadCaptured) {
                    leadSection.style.display = "block";
                }
            }
            catch {
                botBubble.textContent = "Sorry, something went wrong. Please try again.";
            }
            sendBtn.removeAttribute("disabled");
            input.focus();
        }
        sendBtn.addEventListener("click", sendMessage);
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter")
                sendMessage();
        });
        const leadInput = leadSection.querySelector('input[type="email"]');
        const leadBtn = leadSection.querySelector("button");
        leadBtn.addEventListener("click", async () => {
            const email = leadInput.value.trim();
            if (!email)
                return;
            leadBtn.setAttribute("disabled", "true");
            leadBtn.textContent = "Sending...";
            try {
                const res = await fetch(`${API_BASE}/lead`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                });
                if (!res.ok)
                    throw new Error();
                leadCaptured = true;
                leadSection.innerHTML = '<p class="pcb-done">Check your inbox — your free pages are on the way!</p>';
            }
            catch {
                leadBtn.removeAttribute("disabled");
                leadBtn.textContent = "Try Again";
            }
        });
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => { injectStyles(); buildUI(); });
    }
    else {
        injectStyles();
        buildUI();
    }
})();
//# sourceMappingURL=widget.js.map