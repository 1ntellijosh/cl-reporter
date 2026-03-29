# ------------------------------------------------------------------------------------------------
# LOCAL DEVELOPMENT Dockerfile for Frontend client of Clover Reporter project
#
# @since app-skaffold--JP
# ------------------------------------------------------------------------------------------------

FROM node:alpine

WORKDIR /app

# Copy workspace package (client only needs @reporter/core)
COPY packages/package.json ./packages/
COPY packages/dist ./packages/dist

# Copy client source and config, then point @reporter/core to local package
COPY client/ .
RUN sed 's|"@reporter/core": "\*"|"@reporter/core": "file:./packages"|g' ./package.json > ./package.json.tmp && mv ./package.json.tmp ./package.json

# Install dependencies (uses file:./packages)
RUN npm install

CMD ["npm", "run", "dev"]