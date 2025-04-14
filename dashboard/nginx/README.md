# NGINX Configuration

## Configuration Guide

Update your existing NGINX configuration to securely expose your log files.

```nginx
server {
    listen 80;
    server_name yourserver.com;

    location /api/logs/access {
        alias /var/log/nginx/access.log;
        allow your.ip.address;  # Restrict IP access
        deny all;
    }

    location /api/logs/error {
        alias /var/log/nginx/error.log;
        allow your.ip.address;  # Restrict IP access
        deny all;
    }
}
```

Reload Nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Dashboard

Host the dashboard on your preferred platform, with an environment variable set pointing to your server.

```env
NGINX_ANALYTICS_SERVER_URL=https://yourserver.com
```

### CLI

Run the CLI from anywhere, with an environment variable set pointing to your server.

```env
NGINX_ANALYTICS_SERVER_URL=https://yourserver.com
```
