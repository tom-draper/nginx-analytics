# Nginx Analytics Dashboard

Build with Next.js + TypeScript + Tailwind.

## Deployment Guide

Deploy on the server with Nginx running.

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

Provide paths to your log files in a `.env` file.

```env
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

### Password Protection

To enable password protection to access the dashboard, set a password against `NGINX_ANALYTICS_PASSWORD` in `.env`.