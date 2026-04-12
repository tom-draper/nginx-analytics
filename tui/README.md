# NGINX Analytics TUI

A NGINX log analytics TUI dashboard, built with Go.

## Deployment Guide

### Option 1: Build from source

```bash
git clone https://github.com/tom-draper/nginx-analytics.git
cd nginx-analytics/tui

make
# or...
go build -o bin/nginx-analytics ./cmd/nginx-analytics

scp bin/nginx-analytics user@yourserver:/usr/local/bin/
ssh user@yourserver
chmod +x /usr/local/bin/nginx-analytics
```

If your NGINX log path is different from the default `/var/log/nginx`, set the correct path as an environment variable within a `.env` file.

```env
NGINX_ANALYTICS_ACCESS_PATH=/path/to/access/logs
NGINX_ANALYTICS_ERROR_PATH=/path/to/error/logs
```

If you are using the [agent](../agent/README.md), set the agent URL and the optional auth token.

```env
NGINX_SERVER_URL=https://your-agent.com
NGINX_ANALYTICS_AUTH_TOKEN=your-token
```

### Option 2: Docker

Pull the pre-built image from GitHub Container Registry:

```bash
docker pull ghcr.io/tom-draper/nginx-analytics-tui:latest
```

The TUI requires `-it` to allocate a pseudo-TTY.

**Local mode** — read log files directly (mount them as a volume):

```bash
docker run -it \
  -v /var/log/nginx:/var/log/nginx:ro \
  -e NGINX_ANALYTICS_ACCESS_PATH=/var/log/nginx \
  ghcr.io/tom-draper/nginx-analytics-tui:latest
```

**Remote mode** — connect to a running [agent](../agent/README.md):

```bash
docker run -it \
  -e NGINX_ANALYTICS_SERVER_URL=https://your-agent.com \
  -e NGINX_ANALYTICS_AUTH_TOKEN=your-token \
  ghcr.io/tom-draper/nginx-analytics-tui:latest
```

To enable location lookups, mount a [MaxMind GeoLite2](https://www.maxmind.com/en/geolite2/signup) database:

```bash
docker run -it \
  -v /var/log/nginx:/var/log/nginx:ro \
  -v /path/to/GeoLite2-City.mmdb:/app/GeoLite2-City.mmdb:ro \
  -e NGINX_ANALYTICS_ACCESS_PATH=/var/log/nginx \
  ghcr.io/tom-draper/nginx-analytics-tui:latest
```

To build the image yourself, run from the **repo root** (required due to the shared agent dependency):

```bash
docker build -f tui/Dockerfile -t nginx-analytics-tui .
```
### Access Logs

By default, when `NGINX_ANALYTICS_ACCESS_PATH` is set to a directory, all compressed (.gz) and uncompressed (.log) log files within the directory will be included. If you only intend to target a single `access.log` file, use a full filepath instead.

```env
NGINX_ANALYTICS_ACCESS_PATH=/path/to/nginx/access/logs
# or...
NGINX_ANALYTICS_ACCESS_PATH=/path/to/nginx/access.log
```

### Error Logs

By default, the `NGINX_ANALYTICS_ACCESS_PATH` will be checked for error logs if it is pointing to a directory. If your error logs are stored in a different path, or targeting a single log file instead, you can specify the location of your error logs separately using `NGINX_ANALYTICS_ERROR_PATH`.

```env
NGINX_ANALYTICS_ERROR_PATH=/path/to/nginx/error/logs
# or...
NGINX_ANALYTICS_ERROR_PATH=/path/to/nginx/error.log
```

### Locations

IP-location inference can be set up quickly, utilising <a href="https://www.maxmind.com/en/home">MaxMind's free GeoLite2 database</a>. Simply drop the `GeoLite2-City.mmdb` (preferred) or `GeoLite2-Country.mmdb` file in the root folder of the agent or dashboard deployment.

### System Monitoring

By default, system monitoring is disabled. To enable it, set the `NGINX_ANALYTICS_SYSTEM_MONITORING` environment variable to `true`.

```env
NGINX_ANALYTICS_SYSTEM_MONITORING=true
```

You can control how often resource usage is polled by adjusting `NGINX_ANALYTICS_MONITOR_INTERVAL`.

```env
NGINX_ANALYTICS_SYSTEM_MONITORING=2000  # 2s interval (default)
```
