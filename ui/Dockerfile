# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:20-alpine AS deps

# libc6-compat diperlukan untuk beberapa native module di Alpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files dulu agar layer di-cache saat source berubah
COPY package.json package-lock.json ./
RUN npm install


# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Matikan telemetri Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# AGENT*_URL tidak dibutuhkan saat build — hanya saat runtime (API routes).
# Variabel ini akan di-inject oleh docker-compose lewat environment: block.
RUN npm run build


# ─── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Buat user non-root untuk keamanan
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Salin public assets
COPY --from=builder /app/public ./public

# Salin standalone server + static files
# Standalone output sudah include semua dependency yang dibutuhkan runtime
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static   ./.next/static

USER nextjs

EXPOSE 3000

# AGENT*_URL, PORT, HOSTNAME di-set oleh docker-compose
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
