# syntax=docker/dockerfile:1

# ---- Build stage ------------------------------------------------------
FROM golang:1.26-alpine AS build

# git is required by `go mod download` for modules fetched via VCS; ca-certificates
# is needed at build time so `go mod download` can talk to HTTPS module proxies.
RUN apk add --no-cache git ca-certificates

WORKDIR /src

# Cache dependency downloads separately from source changes.
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# CGO disabled -> fully static binary, works unmodified on the alpine
# runtime image below. Trim debug symbols (-s -w) to shrink the binary.
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/kinetirx-mcp .

# ---- Runtime stage ------------------------------------------------------
FROM alpine:3.20 AS runtime

# ca-certificates: required for outbound TLS calls if KINETIRX_API_URL is ever https.
RUN apk add --no-cache ca-certificates \
    && addgroup -S kinetirx \
    && adduser -S -G kinetirx kinetirx

WORKDIR /app

COPY --from=build /out/kinetirx-mcp ./kinetirx-mcp

USER kinetirx

# This server speaks MCP over stdio (stdin/stdout), not a network port —
# there is nothing to EXPOSE or HEALTHCHECK the way the HTTP backend has.
# See README.md for why this isn't wired into deploy/docker-compose.yml as
# an always-on service, and how to run it via `docker run -i` from an MCP
# client config instead.
ENTRYPOINT ["./kinetirx-mcp"]
