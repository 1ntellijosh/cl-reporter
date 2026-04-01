# ------------------------------------------------------------------------------------------------
# LOCAL DEVELOPMENT Dockerfile for OAuth API of cl-reporter project
#
# @since agentic-flow--JP
# ------------------------------------------------------------------------------------------------

FROM node:alpine

WORKDIR /app

# Workspace packages: each under packages/<name>/ (must not share one ./packages/dist or npm cannot link both).
COPY packages/common/package.json ./packages/common/package.json
COPY packages/common/dist ./packages/common/dist
COPY packages/middleware/package.json ./packages/middleware/package.json
COPY packages/middleware/dist ./packages/middleware/dist

# Middleware lists @reporter/common — point at sibling folder (no public registry in image).
RUN sed 's|"@reporter/common": "\*"|"@reporter/common": "file:../common"|g' packages/middleware/package.json > packages/middleware/package.json.tmp \
  && mv packages/middleware/package.json.tmp packages/middleware/package.json

# Copy oauth-api package.json and wire workspace deps to those local folders
COPY oauth-api/package.json ./package.json.tmp
RUN sed 's|"@reporter/common": "\*"|"@reporter/common": "file:./packages/common"|g; s|"@reporter/middleware": "\*"|"@reporter/middleware": "file:./packages/middleware"|g' ./package.json.tmp > ./package.json && rm ./package.json.tmp

# Install oauth-api dependencies (local file: packages for @reporter/*)
RUN npm install --omit=dev

# Copy oauth-api source code and config files
COPY oauth-api/src ./src
COPY oauth-api/tsconfig.json ./tsconfig.json
COPY oauth-api/tests ./tests

# Polling so Skaffold-synced file changes are detected (inotify often doesn't fire for sync)
ENV CHOKIDAR_USEPOLLING=true

CMD ["npm", "start"]