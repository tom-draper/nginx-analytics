# NGINX Analytics Agent

A lightweight agent to securely expose log files and monitor system resources, written in Go.

## Deployment Guide

```bash
git clone https://github.com/tom-draper/nginx-analytics.git
cd nginx-analytics/agent

make
# or...
go build -o bin/agent ./cmd/agent

scp bin/agent user@yourserver:/usr/local/bin/
ssh user@yourserver
chmod +x /usr/local/bin/agent
```

> If your NGINX log path is different from the default `/var/log/nginx`, set the correct path as an environment variable within a `.env` file.
>
> ```env
> NGINX_ANALYTICS_ACCESS_PATH=/path/to/access/logs
> NGINX_ANALYTICS_ERROR_PATH=/path/to/error/logs
> ```
<br>

Or use Docker if preferred.

Pull the prebuilt image from GitHub Container Registry:

```bash
docker pull ghcr.io/tom-draper/nginx-analytics-agent:latest
```

```bash
docker run -d \
  -p 5000:5000 \
  -v /var/log/nginx:/var/log/nginx:ro \
  -e NGINX_ANALYTICS_ACCESS_PATH=/var/log/nginx \
  -e NGINX_ANALYTICS_AUTH_TOKEN=your-auth-token \
  ghcr.io/tom-draper/nginx-analytics-agent:latest
```

To enable location lookups, mount a [MaxMind GeoLite2](https://www.maxmind.com/en/geolite2/signup) database:

```bash
docker run -d \
  -p 5000:5000 \
  -v /var/log/nginx:/var/log/nginx:ro \
  -v /path/to/GeoLite2-Country.mmdb:/app/GeoLite2-Country.mmdb \
  -e NGINX_ANALYTICS_ACCESS_PATH=/var/log/nginx \
  -e NGINX_ANALYTICS_AUTH_TOKEN=your-auth-token \
  ghcr.io/tom-draper/nginx-analytics-agent:latest
```

Or build locally:

```bash
docker build -t nginx-analytics-agent .
docker run -d -p 5000:5000 nginx-analytics-agent
```

<br>

Update your existing NGINX configuration to redirect to the agent, or copy the below config into `/etc/nginx/conf.d/agent.conf`.

```nginx
server {
    listen 80;
    server_name yourdomain.com; # Optional

    # Common proxy settings applied to all location blocks
    location /api/logs/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # These locations will inherit settings from the parent /logs/ block
    # while maintaining their specific endpoints

    # For all non-/logs/ endpoints
    location ~ ^/api/(system|location|status)$ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Reload NGINX:

```bash
sudo nginx -t && sudo systemctl reload nginx
```
<br>

Setup a systemd service `/etc/systemd/system/nginx-analytics-agent.service` to run the agent as a background task.

```service
[Unit]
Description=NGINX Analytics Agent
After=network.target

[Service]
ExecStart=/usr/local/bin/agent
Restart=always
User=nobody
Group=nogroup

[Install]
WantedBy=multi-user.target
```

Enable and start: 

```bash
sudo systemctl daemon-reload
sudo systemctl enable nginx-analytics-agent
sudo systemctl start nginx-analytics-agent
```

Confirm the service is up and running with a status check.

```bash
curl https://yourdomain.com/api/logs/status

> {"status": "ok", "accessLogStatus": "ok", "errorLogStatus": "ok", ...}
```

### Dashboard

Host the dashboard on your preferred platform, with an environment variable set pointing to the agent's endpoint.

```env
NGINX_ANALYTICS_SERVER_URL=https://yourserver.com
```

### CLI

Run the CLI from anywhere, with an environment variable set pointing to the agent's endpoint.

```env
NGINX_ANALYTICS_SERVER_URL=https://yourserver.com
```

## Configuration

### Access Logs

By default, when `NGINX_ANALYTICS_ACCESS_PATH` is set to a directory, all compressed (.gz) and uncompressed (.log) log files within the directory will be served to the dashboard. To target a single `access.log` file, use a full filepath instead.

```env
NGINX_ANALYTICS_ACCESS_PATH=/path/to/nginx/access/logs
# or...
NGINX_ANALYTICS_ACCESS_PATH=/path/to/nginx/access.log
```

### Error Logs

By default, any access log path provided will be checked for error logs if it is pointing to a directory. If your error logs are stored in a different path, or targeting a single log file instead, you can specify the location of your error logs separately using `NGINX_ANALYTICS_ERROR_PATH`.

```env
NGINX_ANALYTICS_ERROR_PATH=/path/to/nginx/error/logs
# or...
NGINX_ANALYTICS_ERROR_PATH=/path/to/nginx/error.log
```

### Port

The default port is 5000. If this is already is use, specify an alternative with the `PORT` environment variable, or with the `--port` command line argument.

### Locations

IP-location inference can be set up quickly, utilising <a href="https://www.maxmind.com/en/home">MaxMind's free GeoLite2 database</a>. Simply drop the `GeoLite2-Country.mmdb` or `GeoLite2-City.mmdb` file in the root folder of the agent or dashboard deployment.

### Log Format

By default, the standard NGINX combined log format is assumed. If you use a custom `log_format` in your NGINX config, set `NGINX_ANALYTICS_LOG_FORMAT` to the same value so the parser knows how to read your log lines.

```env
NGINX_ANALYTICS_LOG_FORMAT=$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
```

**Nginx Proxy Manager** uses the `vcombined` format which prepends `$host:$server_port` before the client IP. Point the agent at `/data/logs/` and set:

```env
NGINX_ANALYTICS_ACCESS_PATH=/data/logs
NGINX_ANALYTICS_LOG_FORMAT=$host:$server_port $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
```

### System Monitoring

By default, system monitoring is disabled. To enable it, set the `NGINX_ANALYTICS_SYSTEM_MONITORING` environment variable to `true`, or with the `--system-monitoring` command line argument.

#### HTTPS

Deploying over a secure HTTPS connection is always recommended. Without this, you risk exposing any personal information within your log files such as IP addresses.
