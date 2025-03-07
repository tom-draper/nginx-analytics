# Nginx Configuration for Nginx Analytics

## Configuration Guide

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

Then, host the dashboard on your favourite platform, ensuring environment variables are set pointing to these endpoints.

```env
NGINX_ACCESS_URL=http://yourserver.com/logs/access
NGINX_ERROR_URL=http://yourserver.com/logs/error
```

