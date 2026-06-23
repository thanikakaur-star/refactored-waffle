FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json tsup.config.ts ./
COPY src/ src/
RUN npx tsc && npx tsup

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist/ dist/
COPY --from=build /app/public/ public/
COPY assets/ assets/
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
