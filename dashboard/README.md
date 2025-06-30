# NGINX Analytics Dashboard

## Deployment Guide

Deploy the Next.js dashboard on the same server as NGINX.

```bash
git clone https://github.com/tom-draper/nginx-analytics.git
cd dashboard
npm install
npm run build
npm start
```

> You can use `pm2` to run the dashboard as a background process.
> ```bash
> pm2 start npm --name "nginx-analytics" -- start
> ```


Or use Docker if preferred.

```bash
git clone https://github.com/tom-draper/nginx-analytics.git
cd dashboard
docker build -t nginx-analytics .
docker run -d -p 3000:3000 nginx-analytics
```

In a `.env` file, set `NGINX_ANALYTICS_ACCESS_PATH` to point to the directory containing your log files. It's likely to be the default location `/var/log/nginx/`.

```env
NGINX_ANALYTICS_ACCESS_PATH=/path/to/nginx/access/logs
```

You may need to update your NGINX configuration to make the app publically accessible.

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /_next/static/ {
        alias /path/to/your/app/.next/static/;
        expires 1y;
        access_log off;
    }

    location /public/ {
        alias /path/to/your/app/public/;
        expires 1y;
        access_log off;
    }
}
```

If you wish to serve the dashboard on a specific path e.g. `https://yourdomain.com/analytics`, remember to update `next.config.js` with the `basePath` as well as your NGINX config.

```js
const nextConfig = {
    basePath: '/analytics',
    // Other Next.js configurations...
};
```

### Access Logs

By default, when `NGINX_ANALYTICS_ACCESS_PATH` is set to a directory, all compressed (.gz) and uncompressed (.log) log files within the directory will be served to the dashboard. If you only intend to target a single `access.log` file, use a full filepath instead.

```env
NGINX_ANALYTICS_ACCESS_PATH=/path/to/nginx/access/logs
# or...
NGINX_ANALYTICS_ACCESS_PATH=/path/to/nginx/access.log
```

### Error Logs

By default, the `NGINX_ANALYTICS_ACCESS_PATH` will be checked for error logs if it is pointing to a directory. If your error logs are stored in a different path, or targeting a single log file instead, you can specify the location of your error logs separately using `NGINX_ANALYTICS_ERROR_PATH`.

```env
NGINX_ANALYTICS_ERROR_PATH=/path/to/nginx/error/logs
# or...
NGINX_ANALYTICS_ERROR_PATH=/path/to/nginx/error.log
```

### Locations

IP-location inference can be set up quickly, utilising <a href="https://www.maxmind.com/en/home">MaxMind's free GeoLite2 database</a>. Simply drop the `GeoLite2-Country.mmdb` or `GeoLite2-City.mmdb` file in the root folder of the agent or dashboard deployment.

### System Monitoring

By default, system monitoring is disabled. To enable it, set the `NGINX_ANALYTICS_SYSTEM_MONITORING` environment variable to `true`.

```env
NGINX_ANALYTICS_SYSTEM_MONITORING=true
```

You can control how often resource usage is polled by adjusting `NGINX_ANALYTICS_MONITOR_INTERVAL`.

```env
NGINX_ANALYTICS_SYSTEM_MONITORING=2000  # 2s interval (default)
```

### Password Protection

To enable password protection for dashboard access, set a password against the `NGINX_ANALYTICS_PASSWORD` environment variable.

```env
NGINX_ANALYTICS_PASSWORD=mypassword
```

