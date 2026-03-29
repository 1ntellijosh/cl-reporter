# ------------------------------------------------------------------------------------------------
# LOCAL DEVELOPMENT Dockerfile for OAuth API of cl-reporter project
#
# @since agentic-flow--JP
# ------------------------------------------------------------------------------------------------

FROM node:alpine

WORKDIR /app

# Copy workspace packages (built dist folders and package.json files)
COPY packages/package.json ./packages/
COPY packages/dist ./packages/dist

# Copy oauth-api package.json and modify it to use file: protocol for local packages
COPY oauth-api/package.json ./package.json.tmp
RUN sed 's|"@reporter/core": "\*"|"@reporter/core": "file:./packages"|g' ./package.json.tmp > ./package.json && rm ./package.json.tmp

# Install oauth-api dependencies (will install local packages via file: protocol)
RUN npm install --omit=dev

# Copy oauth-api source code and config files
COPY oauth-api/src ./src
COPY oauth-api/tsconfig.json ./tsconfig.json
COPY oauth-api/tests ./tests

# Polling so Skaffold-synced file changes are detected (inotify often doesn't fire for sync)
ENV CHOKIDAR_USEPOLLING=true

CMD ["npm", "start"]