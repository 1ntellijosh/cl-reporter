# ------------------------------------------------------------------------------------------------
# LOCAL DEVELOPMENT Dockerfile for Frontend client of Clover Reporter project
#
# @since app-skaffold--JP
# ------------------------------------------------------------------------------------------------

FROM node:alpine

WORKDIR /app

# Copy workspace package (client only needs @reporter/common)
COPY packages/common/package.json ./packages/common/
COPY packages/common/dist ./packages/common/dist

# Copy client source and config, then point @reporter/common to local package
COPY client/ .
RUN sed 's|"@reporter/common": "\*"|"@reporter/common": "file:./packages/common"|g' ./package.json > ./package.json.tmp && mv ./package.json.tmp ./package.json

# Install dependencies (uses file:./packages)
RUN npm install

CMD ["npm", "run", "dev"]