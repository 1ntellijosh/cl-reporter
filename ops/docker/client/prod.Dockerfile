# ------------------------------------------------------------------------------------------------
# PRODUCTION Dockerfile for Frontend client of Clover Reporter project
#
# @since app-skaffold--JP
# ------------------------------------------------------------------------------------------------

FROM node:alpine AS builder

WORKDIR /app

# Copy workspace package (client only needs @reporter/common)
COPY packages/common/package.json ./packages/common/
COPY packages/common/dist ./packages/common/dist

# Copy client app and point @reporter/common to local package
COPY client/ .
RUN sed 's|"@reporter/common": "\*"|"@reporter/common": "file:./packages/common"|g' ./package.json > ./package.json.tmp && mv ./package.json.tmp ./package.json

# Install deps and build (next.config resolves @reporter/common via node_modules in container)
RUN npm install && npm run build

# Production runner: only need .next and node_modules
FROM node:alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
    