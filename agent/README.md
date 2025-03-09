# Nginx Analytics Agent

A lightweight agent to monitor server resources and securely expose log files, written in Go.

## Deployment Guide

```bash
go build -o nginx-analytics-agent agent.go
scp nginx-analytics-agent user@yourserver:/usr/local/bin/
ssh user@yourserver
chmod +x /usr/local/bin/nginx-analytics-agent
```

Update your existing Nginx configuration, or copy `nginx.conf` to `/etc/nginx/conf.d/nginx-analytics-agent.conf`.

```
location /logs/access {
    proxy_pass http://localhost:3000/logs/access;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

location /logs/error {
    proxy_pass http://localhost:3000/logs/error;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

location /status {
    proxy_pass http://localhost:3000/status;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

All log data transferred by the agent is encrypted end-to-end, so HTTPS is optional.

Setup a systemd service `/etc/systemd/system/nginx-analytics-agent.service` to run the agent in the background.

```
[Unit]
Description=Nginx Analytics Agent
After=network.target

[Service]
ExecStart=/usr/local/bin/nginx-analytics-agent
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
curl http://yourserver.com/logs/status

> {"status": "ok", "accessLogStatus": "ok", "errorLogStatus": "ok", ...}
```

### Dashboard

Host the dashboard on your preferred platform, with environment variables set pointing to the agent's endpoints.

```env
NGINX_ACCESS_URL=http://yourserver.com/logs/access
NGINX_ERROR_URL=http://yourserver.com/logs/error
```

### CLI

Run the CLI from anywhere, with environment variables set pointing to the agent's endpoints.

```env
NGINX_ACCESS_URL=http://yourserver.com/logs/access
NGINX_ERROR_URL=http://yourserver.com/logs/error
``