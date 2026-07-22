FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

FROM base AS build
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json drizzle.config.ts ./
COPY src ./src
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
RUN mkdir -p /app/data/uploads
EXPOSE 4000
CMD ["node", "dist/index.js"]
