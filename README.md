# Nginx Analytics

An extremely flexible privacy-focused analytics solution for Nginx.

# Getting Started

There are three options to get up and running:

## Remote Access

#### Recommended

Deploy the lightweight agent to your server to securely expose your log files to the dashboard, and stream log file content and changes in real-time.

```bash
go build -o log_agent agent.go
scp log_agent user@yourserver:/usr/local/bin/
ssh user@yourserver
chmod +x /usr/local/bin/log_agent
```

Run it and confirm it's publically accessible.

```
/usr/local/bin/log_agent
```

```bash
curl http://yourserver.com/logs/status

> {"status": "ok"}
```

All log data transferred by the agent is encrypted end-to-end, so HTTPS is optional.

Setup a systemd service `/etc/systemd/system/log_agent.service` to run the agent in the background.

```toml
[Unit]
Description=Nginx Log Agent
After=network.target

[Service]
ExecStart=/usr/local/bin/log_agent
Restart=always
User=nobody
Group=nogroup

[Install]
WantedBy=multi-user.target
```

Enable and start: 

```bash
sudo systemctl daemon-reload
sudo systemctl enable log_agent
sudo systemctl start log_agent
```


Then, host the dashboard on your favourite platform, ensuring environment variables are set pointing to these endpoints.

```env
NGINX_ACCESS_URL=http://yourserver.com/logs/access
NGINX_ERROR_URL=http://yourserver.com/logs/error
```

#### Alternative

Update your Nginx configuration to serve your log files over HTTP as restricted static files.

```nginx
server {
    listen 80;
    server_name yourserver.com;

    location /logs/access {
        alias /var/log/nginx/access.log;
        allow your.ip.address;  # Restrict IP access
        deny all;
    }

    location /logs/error {
        alias /var/log/nginx/error.log;
        allow your.ip.address;  # Restrict IP access
        deny all;
    }
}
```

Then, host the dashboard on your favourite platform, ensuring environment variables are set pointing to these endpoints.

```env
NGINX_ACCESS_URL=http://yourserver.com/logs/access
NGINX_ERROR_URL=http://yourserver.com/logs/error
```

## Local Setup

Host the dashboard on the same server, providing the path to your log files in a `.env` file.

```
NGINX_ACCESS_PATH=/var/log/nginx/access.log
NGINX_ERROR_PATH=/var/log/nginx/error.log
```

You may need to update your Nginx configuration to make the app publically accessible.

```nginx
location /analytics {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## File Upload

Drag-and-drop your `access.log` and `error.log` directly into the dashboard. Get started straight away on <a href="">our deployment</a>.