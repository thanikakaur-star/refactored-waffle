import * as fs from "node:fs";
import * as path from "node:path";

const designsPath = path.resolve(__dirname, "../src/content/product-designs.json");
const designs = JSON.parse(fs.readFileSync(designsPath, "utf-8"));
const outputDir = path.resolve(__dirname, "../assets/book-template");

fs.mkdirSync(outputDir, { recursive: true });

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildCoverPage(): string {
  return `
    <div class="page cover-page">
      <div class="cover-content">
        <h1 class="cover-title">${escapeHtml(designs.book.title)}</h1>
        <p class="cover-subtitle">${escapeHtml(designs.book.subtitle)}</p>
        <p class="cover-author">${escapeHtml(designs.book.author)}</p>
      </div>
    </div>`;
}

function buildColoringPage(page: typeof designs.pages[0]): string {
  const vocabHtml = page.gurmukhi_vocab
    .map((v: { gurmukhi: string; transliteration: string; english: string }) =>
      `<span class="vocab-item"><span class="gurmukhi">${escapeHtml(v.gurmukhi)}</span> <span class="transliteration">(${escapeHtml(v.transliteration)})</span> — <span class="english">${escapeHtml(v.english)}</span></span>`
    )
    .join(" &bull; ");

  return `
    <div class="page coloring-page" data-page="${page.page}">
      <div class="page-header">
        <span class="section-label">${escapeHtml(page.section)}</span>
        <h2 class="page-title">${escapeHtml(page.title)}</h2>
      </div>
      <div class="illustration-area">
        <div class="placeholder">
          <p class="placeholder-label">ILLUSTRATION PLACEHOLDER</p>
          <p class="placeholder-prompt">${escapeHtml(page.ai_prompt)}</p>
        </div>
      </div>
      <div class="page-footer">
        <p class="educational-text">${escapeHtml(page.educational_text)}</p>
        <div class="vocab-bar">${vocabHtml}</div>
      </div>
      <div class="page-number">${page.page}</div>
    </div>`;
}

function buildBackCover(): string {
  return `
    <div class="page back-cover">
      <div class="cover-content">
        <h2>Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh!</h2>
        <p>Thank you for colouring with Khalsa Kreatives.</p>
        <p>Share your art: @khalsakreatives</p>
        <p class="cover-subtitle">khalsakreatives.com</p>
      </div>
    </div>`;
}

const css = `
  @page { size: 8.5in 11in; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Georgia', 'Noto Serif', serif; color: #1a1a1a; }
  .page {
    width: 8.5in; height: 11in; padding: 0.6in;
    page-break-after: always; position: relative;
    display: flex; flex-direction: column;
  }
  .cover-page, .back-cover {
    justify-content: center; align-items: center; text-align: center;
    border: 3px solid #1a1a1a;
  }
  .cover-title { font-size: 32pt; line-height: 1.2; margin-bottom: 16px; }
  .cover-subtitle { font-size: 14pt; font-style: italic; margin-bottom: 12px; }
  .cover-author { font-size: 16pt; margin-top: 24px; letter-spacing: 2px; text-transform: uppercase; }
  .page-header { text-align: center; margin-bottom: 8px; }
  .section-label {
    font-size: 9pt; text-transform: uppercase; letter-spacing: 3px;
    color: #666; display: block; margin-bottom: 4px;
  }
  .page-title { font-size: 20pt; }
  .illustration-area {
    flex: 1; border: 2px dashed #ccc; margin: 8px 0;
    display: flex; justify-content: center; align-items: center;
  }
  .placeholder { padding: 20px; text-align: center; max-width: 90%; }
  .placeholder-label {
    font-size: 11pt; font-weight: bold; letter-spacing: 2px;
    color: #999; margin-bottom: 12px;
  }
  .placeholder-prompt { font-size: 8pt; color: #aaa; line-height: 1.4; }
  .page-footer { margin-top: 8px; }
  .educational-text { font-size: 9.5pt; line-height: 1.5; margin-bottom: 6px; text-align: justify; }
  .vocab-bar {
    font-size: 8.5pt; border-top: 1px solid #ccc; padding-top: 4px;
    text-align: center;
  }
  .gurmukhi { font-size: 11pt; }
  .transliteration { font-style: italic; }
  .page-number {
    position: absolute; bottom: 0.4in;
    left: 50%; transform: translateX(-50%);
    font-size: 9pt; color: #999;
  }
`;

let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(designs.book.title)}</title>
  <style>${css}</style>
</head>
<body>
${buildCoverPage()}
${designs.pages.map(buildColoringPage).join("\n")}
${buildBackCover()}
</body>
</html>`;

const outputPath = path.join(outputDir, "book-template.html");
fs.writeFileSync(outputPath, html, "utf-8");

const promptsMarkdown = designs.pages
  .map((p: typeof designs.pages[0]) =>
    `## Page ${p.page}: ${p.title}\n\n**Section:** ${p.section}\n\n**AI Prompt:**\n\`\`\`\n${p.ai_prompt}\n\`\`\`\n\n**Educational Text:**\n${p.educational_text}\n\n**Vocabulary:**\n${p.gurmukhi_vocab.map((v: { gurmukhi: string; transliteration: string; english: string }) => `- ${v.gurmukhi} (${v.transliteration}) — ${v.english}`).join("\n")}\n`
  )
  .join("\n---\n\n");

const promptsPath = path.join(outputDir, "ai-prompts.md");
fs.writeFileSync(promptsPath, `# Khalsa Kreatives — AI Image Generation Prompts\n\nUse these prompts with Midjourney, DALL-E 3, or Stable Diffusion.\nAll prompts are optimised for clean black-and-white coloring book line art.\n\n---\n\n${promptsMarkdown}`, "utf-8");

console.log(`Book template generated: ${outputPath}`);
console.log(`AI prompts exported: ${promptsPath}`);
console.log(`Total pages: ${designs.pages.length} + cover + back cover`);
