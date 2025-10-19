# syntax=docker/dockerfile:1
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG INTERNAL_API_URL=http://localhost:8000

FROM node:20-alpine AS base
ARG NEXT_PUBLIC_API_URL
ARG INTERNAL_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV INTERNAL_API_URL=${INTERNAL_API_URL}
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
ARG NEXT_PUBLIC_API_URL
ARG INTERNAL_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV INTERNAL_API_URL=${INTERNAL_API_URL}
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build
RUN npm prune --omit=dev

FROM base AS runner
ARG NEXT_PUBLIC_API_URL
ARG INTERNAL_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV INTERNAL_API_URL=${INTERNAL_API_URL}
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "start"]
