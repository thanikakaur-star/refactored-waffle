# Official Playwright image: ships Chromium + all system libraries, so the
# TED Europa (browser-based) scraper can run in production. The image tag MUST
# match the playwright version in package-lock.json — a mismatch makes
# playwright look for a browser build it can't find. Bump both together.
FROM mcr.microsoft.com/playwright:v1.61.1-noble

WORKDIR /app

# Browsers are already baked into the image at /ms-playwright (the image sets
# PLAYWRIGHT_BROWSERS_PATH) — stop npm install from re-downloading ~400MB.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# devDependencies are needed at build time (tsc) AND at runtime (playwright
# is a devDependency, imported dynamically when a scrape runs).
COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
