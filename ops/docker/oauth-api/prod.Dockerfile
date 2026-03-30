# ------------------------------------------------------------------------------------------------
# PRODUCTION Dockerfile for OAuth API of cl-reporter project
#
# @since agentic-flow--JP
# ------------------------------------------------------------------------------------------------

FROM node:alpine

ENV NODE_ENV=production
WORKDIR /app

# Copy workspace packages (built dist + package.json)
COPY packages/package.json ./packages/
COPY packages/dist ./packages/dist
COPY packages/package.json ./packages/
COPY packages/dist ./packages/dist

# Copy oauth-api package.json and point workspace deps to local packages
COPY oauth-api/package.json ./package.json.tmp
RUN sed 's|"@reporter/core": "\*"|"@reporter/core": "file:./packages"|g' ./package.json.tmp > ./package.json && rm ./package.json.tmp

# Install production dependencies only
RUN npm install --omit=dev

# Copy oauth-api source and build for production
COPY oauth-api/src ./src
COPY oauth-api/tsconfig.json ./tsconfig.json
RUN npm run build

# Run compiled app (no ts-node)
CMD ["npm", "run", "start:prod"]
