# syntax=docker/dockerfile:1

# ---- Build stage --------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /src

# Cache dependency installs separately from source changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_API_URL is baked into the static JS bundle at build time (Vite env
# vars are compile-time, not runtime) — override via --build-arg if the
# backend isn't reachable at the default. Left empty by default: when
# VITE_API_URL is unset, src/lib/api.ts falls back to
# http://localhost:8080, which is wrong for the containerized deployment;
# in this Compose setup we instead rely on nginx below proxying /api/* to
# the `backend` service, so the SPA can just call relative /api paths — see
# the ARG default here matching that: empty string keeps the client
# fetching relative /api/... URLs, not an absolute localhost one.
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ---- Runtime stage -------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY --from=build /src/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
