# syntax=docker/dockerfile:1
# One Dockerfile for the four JavaScript apps. docker-compose.yml picks a stage with "target".
# (The Python AI service has its own Dockerfile in services/ai-recommendation.)

# ---- base: install every workspace's packages once, then copy the source ----
FROM node:22-alpine AS base
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY shared/package.json shared/
COPY apps/user-backend/package.json apps/user-backend/
COPY apps/admin-backend/package.json apps/admin-backend/
COPY apps/user-frontend/package.json apps/user-frontend/
COPY apps/admin-frontend/package.json apps/admin-frontend/
RUN npm install --no-audit --no-fund
COPY shared shared
COPY apps apps

# ---- the two APIs ----
FROM base AS user-backend
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "apps/user-backend/src/server.js"]

FROM base AS admin-backend
ENV NODE_ENV=production
EXPOSE 5001
CMD ["node", "apps/admin-backend/src/server.js"]

# ---- build both frontends into static files ----
# The API addresses are baked in at build time; they are the addresses the BROWSER uses.
FROM base AS web-build
ARG VITE_API_URL=http://localhost:5000/api/v1
ARG VITE_ADMIN_API_URL=http://localhost:5001/api/v1/admin
ENV VITE_API_URL=$VITE_API_URL VITE_ADMIN_API_URL=$VITE_ADMIN_API_URL
RUN npm run build

# ---- serve each frontend with nginx ----
FROM nginx:1.27-alpine AS user-frontend
COPY infrastructure/nginx/spa.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /repo/apps/user-frontend/dist /usr/share/nginx/html

FROM nginx:1.27-alpine AS admin-frontend
COPY infrastructure/nginx/spa.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /repo/apps/admin-frontend/dist /usr/share/nginx/html
