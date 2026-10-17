# ---- build ----------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Lockfile first so dependency installs are cached independently of source.
COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

# HARD_API is deliberately absent here. The app reads it through
# $env/dynamic/private at request time, so the image is not tied to one
# backend URL and the same build runs anywhere.
RUN npm run build && npm prune --omit=dev


# ---- production -----------------------------------------------------------
FROM node:22-alpine AS production

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build

# `node` is a pre-existing non-root user in the official image.
USER node

EXPOSE 3000

CMD ["node", "build/index.js"]


# ---- development ----------------------------------------------------------
# Used by docker-compose.dev.yml, which bind-mounts the source over /app.
FROM node:22-alpine AS development

ENV NODE_ENV=development

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
