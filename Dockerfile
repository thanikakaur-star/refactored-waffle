FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/
COPY dashboard/ ./dashboard/

RUN npx tsc

ENV NODE_ENV=production
ENV API_PORT=10000

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD curl -f http://localhost:10000/health || exit 1

CMD ["node", "dist/server.js"]
