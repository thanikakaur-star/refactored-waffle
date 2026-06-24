FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/
COPY dashboard/ ./dashboard/

RUN npx tsc && cp -r public dist/public && cp -r dashboard dist/dashboard

RUN npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 10000

CMD ["node", "dist/server.js"]
