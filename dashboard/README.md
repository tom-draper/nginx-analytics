# Nginx Analytics Dashboard

Build with Next.js + TypeScript + Tailwind.

## Deployment Guide

Deploy on the same server as Nginx.

```bash
git clone https://github.com/tom-draper/nginx-analytics
cd dashboard
npm install
npm run build
npm start
```

Or use Docker

```bash
git clone https://github.com/tom-draper/nginx-analytics
cd dashboard
docker build -t nginx-analytics .
docker run -d -p 3000:3000 nginx-analytics
```

Provide paths to your log files as environment variables.

```env
NGINX_ANALYTICS_ACCESS_PATH=/path/to/nginx/access/logs
NGINX_ANALYTICS_ERROR_PATH=/path/to/nginx/error/logs
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

### Password Protection

To enable password protection to access the dashboard, set a password against the `NGINX_ANALYTICS_PASSWORD` environment variable.