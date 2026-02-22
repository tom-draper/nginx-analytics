FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o agent ./cmd/agent

FROM alpine:3

RUN apk --no-cache add ca-certificates && \
    addgroup -S agent && adduser -S agent -G agent

WORKDIR /app

COPY --from=builder /app/agent .

# GeoLite2 database is not bundled due to MaxMind's license restrictions.
# Mount it at runtime to enable location lookups:
#   -v /path/to/GeoLite2-Country.mmdb:/app/GeoLite2-Country.mmdb
# Without it, location lookups are silently disabled.

RUN chown -R agent:agent /app
USER agent

EXPOSE 5000

CMD ["./agent"]
