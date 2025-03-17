# Dockerfile
FROM golang:1.24

WORKDIR /app
COPY . .

RUN go build -o nginx_analytics_agent .

# For authentication - must match token used by the web app
ENV NGINX_ANALYTICS_AUTH_TOKEN=your-auth-token

CMD ["./nginx_analytics_agent"]
