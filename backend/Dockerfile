# syntax=docker/dockerfile:1

# ---- Build stage ------------------------------------------------------
# --platform=$BUILDPLATFORM pins this stage to the builder's own native
# platform regardless of which platform the final image targets, so a
# multi-arch build compiles natively (fast) instead of running the whole
# build stage — apk installs, go mod download, go build — under slow QEMU
# emulation. Go's own compiler cross-compiles to TARGETOS/TARGETARCH with
# no emulation needed for that step; only the small runtime stage below
# (apk installs + copying the already-built binary) runs per-target-platform,
# which is cheap even emulated.
FROM --platform=$BUILDPLATFORM golang:1.26-alpine AS build

ARG TARGETOS
ARG TARGETARCH

# git is required by `go mod download` for modules fetched via VCS; ca-certificates
# is needed at build time so `go mod download` can talk to HTTPS module proxies.
RUN apk add --no-cache git ca-certificates

WORKDIR /src

# Cache dependency downloads separately from source changes.
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# CGO disabled -> fully static binary, works unmodified on the scratch/distroless
# runtime image below. Trim debug symbols (-s -w) to shrink the binary.
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -ldflags="-s -w" -o /out/kinetirx-server ./cmd/server

# ---- Runtime stage ------------------------------------------------------
FROM alpine:3.20 AS runtime

# ca-certificates: required for outbound TLS calls to the Gemini API and to
# any S3-compatible backup endpoint. tzdata: lets the app resolve local
# timezones if ever needed; harmless if unused. postgresql16-client: pg_dump
# and pg_restore, shelled out to by the S3 offsite backup feature — matches
# the postgres:16-alpine major version in deploy/docker-compose.yml, since
# pg_dump's custom format is not guaranteed compatible across major versions.
RUN apk add --no-cache ca-certificates tzdata postgresql16-client \
    && addgroup -S kinetirx \
    && adduser -S -G kinetirx kinetirx

WORKDIR /app

COPY --from=build /out/kinetirx-server ./kinetirx-server
COPY --from=build /src/migrations ./migrations

ENV MIGRATIONS_DIR=/app/migrations \
    GIN_MODE=release \
    PORT=8080

USER kinetirx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --spider http://127.0.0.1:8080/api/health || exit 1

ENTRYPOINT ["./kinetirx-server"]
