ARG NODE_VERSION=24.13.1

# base stage
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
COPY package*.json ./

# dev stage
FROM base AS dev
RUN npm ci
COPY . .
EXPOSE 3003
CMD [ "npm", "run", "dev" ]

# build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# production stage
FROM node:${NODE_VERSION}-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3003
CMD [ "node", "dist/server.js" ]