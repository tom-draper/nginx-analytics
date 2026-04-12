FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy module files for both the tui and its local agent dependency.
# The tui go.mod has: replace github.com/tom-draper/nginx-analytics/agent => ../agent
# so both modules must be present in the build context.
COPY agent/go.mod agent/go.sum ./agent/
COPY tui/go.mod tui/go.sum ./tui/

RUN cd tui && go mod download

COPY agent/ ./agent/
COPY tui/ ./tui/

RUN cd tui && CGO_ENABLED=0 GOOS=linux go build -o /app/nginx-analytics ./cmd/nginx-analytics

FROM alpine:3

RUN apk --no-cache add ca-certificates && \
    addgroup -S app && adduser -S app -G app

WORKDIR /app

COPY --from=builder /app/nginx-analytics .

# GeoLite2 database is not bundled due to MaxMind's license restrictions.
# Mount it at runtime to enable location lookups:
#   -v /path/to/GeoLite2-Country.mmdb:/app/GeoLite2-Country.mmdb
# Without it, location lookups are silently disabled.

RUN chown -R app:app /app
USER app

# This is a TUI application — always run with -it to allocate a pseudo-TTY:
#   docker run -it [options] <image>
CMD ["./nginx-analytics"]
