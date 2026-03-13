FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run prisma:generate
RUN npm run build

FROM base AS runner
ENV PORT=3000
EXPOSE 3000
COPY --from=build /app /app
CMD ["sh", "-c", "npm run db:deploy && npm run start"]
