# Nginx Configuration for Nginx Analytics

## Configuration Guide

Update your existing Nginx configuration to securely expose your log files.

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

Reload Nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Dashboard

Host the dashboard on your preferred platform, with environment variables set pointing to the agent's endpoints.

```env
NGINX_ANALYTICS_ACCESS_URL=http://yourserver.com
```

### CLI

Run the CLI from anywhere, with environment variables set pointing to the agent's endpoints.

```env
NGINX_ANALYTICS_ACCESS_URL=http://yourserver.com
``