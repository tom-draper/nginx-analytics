# Nginx Analytics

An extremely simple analytics solution for Nginx log files.

# Getting Started

There are three options to get up and running:

## Remote Access

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

Alternatively, deploy our lightweight websocket API, to stream log file changes in real-time.

Then host this app on your favourite platform, ensuring environment variables are set pointing to these endpoints.

```env
NGINX_ACCESS_URL=http://yourserver.com/logs/access
NGINX_ERROR_URL=http://yourserver.com/logs/error
```

## Local Setup

Host this app on the same server, providing the path to your log files in a `.env` file.

```
NGINX_ACCESS_PATH=/var/log/nginx/access.log
NGINX_ERROR_PATH=/var/log/nginx/error.log
```

Update your Nginx configuration to make the app publically accessible.

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

Drag-and-drop your access.log and error.log directly into the app.