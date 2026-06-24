import * as fs from "node:fs";
import * as path from "node:path";
import * as https from "node:https";
import * as http from "node:http";
import { config } from "dotenv";
import OpenAI from "openai";

config({ path: path.resolve(__dirname, "../.env") });

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in .env file. Add it and try again.");
  process.exit(1);
}

const designsPath = path.resolve(__dirname, "../src/content/product-designs.json");
const designs = JSON.parse(fs.readFileSync(designsPath, "utf-8"));
const imagesDir = path.resolve(__dirname, "../assets/book-template/images");
const templatePath = path.resolve(__dirname, "../assets/book-template/book-template.html");

fs.mkdirSync(imagesDir, { recursive: true });

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = url.startsWith("https") ? https.get : http.get;
    get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function generatePage(page: { page: number; title: string; section: string; ai_prompt: string }) {
  const destFile = path.join(imagesDir, `page-${page.page}-${slugify(page.section)}.png`);

  if (fs.existsSync(destFile)) {
    console.log(`Page ${page.page} already exists, skipping: ${page.title}`);
    return;
  }

  console.log(`Generating page ${page.page}: ${page.title}...`);

  const response = await client.images.generate({
    model: "dall-e-3",
    prompt: page.ai_prompt,
    n: 1,
    size: "1024x1792",
    quality: "hd",
  });

  const imageUrl = response.data?.[0]?.url;
  if (!imageUrl) {
    console.error(`No image URL returned for page ${page.page}`);
    return;
  }

  await downloadFile(imageUrl, destFile);
  console.log(`Saved page ${page.page}: ${destFile}`);
}

function updateTemplate() {
  if (!fs.existsSync(templatePath)) {
    console.log("No template found, skipping template update.");
    return;
  }

  let html = fs.readFileSync(templatePath, "utf-8");

  for (const page of designs.pages) {
    const imgPath = `images/page-${page.page}-${slugify(page.section)}.png`;
    const imgTag = `<img src="${imgPath}" alt="${page.title}" class="illustration-img" />`;

    const placeholderRegex = new RegExp(
      `<div class="placeholder">\\s*<p class="placeholder-label">ILLUSTRATION PLACEHOLDER</p>\\s*<p class="placeholder-prompt">[^<]*</p>\\s*</div>`,
    );

    if (html.match(placeholderRegex)) {
      html = html.replace(placeholderRegex, imgTag);
    }
  }

  const imgStyle = `
  .illustration-img {
    max-width: 100%; max-height: 100%; object-fit: contain;
  }`;
  html = html.replace("</style>", `${imgStyle}\n  </style>`);

  fs.writeFileSync(templatePath, html, "utf-8");
  console.log("Template updated with image references.");
}

async function main() {
  console.log(`Generating ${designs.pages.length} coloring book illustrations via DALL-E 3...\n`);

  for (const page of designs.pages) {
    try {
      await generatePage(page);
    } catch (err: any) {
      console.error(`Failed page ${page.page}: ${err.message}`);
      if (err.message?.includes("rate_limit")) {
        console.log("Rate limited, waiting 60s...");
        await new Promise((r) => setTimeout(r, 60000));
        try { await generatePage(page); } catch (e: any) {
          console.error(`Retry failed page ${page.page}: ${e.message}`);
        }
      }
    }
  }

  updateTemplate();
  console.log("\nDone. Check assets/book-template/images/ for generated illustrations.");
}

main();
