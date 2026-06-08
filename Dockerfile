# =============================================================================
# Multi-stage Dockerfile para Next.js (galeria-art-frontend)
# - Etapa 1: instalar dependencias con npm ci
# - Etapa 2: build de la app
# - Etapa 3: imagen final mínima (node:20-alpine) corriendo standalone
# =============================================================================

# --- Etapa 1: deps ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# --- Etapa 2: build ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next.js usa NEXT_PUBLIC_API_URL en build time
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# standalone=true genera un bundle mínimo en .next/standalone
RUN npm run build

# --- Etapa 3: runner (imagen final) ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuario no-root por seguridad
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copiamos solo lo necesario del build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
