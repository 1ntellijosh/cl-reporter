# ------------------------------------------------------------------------------------------------
# PRODUCTION Dockerfile for OAuth API of cl-reporter project
#
# @since agentic-flow--JP
# ------------------------------------------------------------------------------------------------

FROM node:alpine

ENV NODE_ENV=production
WORKDIR /app

# Copy workspace packages (built dist + package.json)
COPY packages/common/package.json ./common/packages/
COPY packages/common/dist ./packages/common/dist
COPY packages/middleware/package.json ./packages/middleware/
COPY packages/middleware/dist ./packages/middleware/dist

# Copy oauth-api package.json and point workspace deps to local packages
COPY oauth-api/package.json ./package.json.tmp
RUN sed 's|"@reporter/common": "\*"|"@reporter/common": "file:./packages/common"|g; s|"@reporter/middleware": "\*"|"@reporter/middleware": "file:./packages/middleware"|g' ./package.json.tmp > ./package.json && rm ./package.json.tmp

# Install production dependencies only
RUN npm install --omit=dev

# Copy oauth-api source and build for production
COPY oauth-api/src ./src
COPY oauth-api/tsconfig.json ./tsconfig.json
RUN npm run build

# Run compiled app (no ts-node)
CMD ["npm", "run", "start:prod"]
