# NGINX Analytics Agent

A lightweight agent to securely expose log files and monitor system resources, written in Go.

## Deployment Guide

```bash
make
# or...
go build -o bin/agent cmd/agent

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

Host the dashboard on your preferred platform, with environment variables set pointing to the agent's endpoints.

```env
NGINX_ANALYTICS_SERVER_URL=https://yourserver.com
```

<!-- ### CLI -->
<!---->
<!-- Run the CLI from anywhere, with environment variables set pointing to the agent's endpoints. -->
<!---->
<!-- ```env -->
<!-- NGINX_ANALYTICS_SERVER_URL=https://yourserver.com -->
<!-- ``` -->

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

### System Monitoring

By default, system monitoring is disabled. To enable it, set the `NGINX_ANALYTICS_SYSTEM_MONITORING` environment variable to `true`, or with the `--system-monitoring` command line argument.

#### HTTPS

Deploying over a secure HTTPS connection is always recommended. Without this, you risk exposing any personal information within your log files such as IP addresses.
