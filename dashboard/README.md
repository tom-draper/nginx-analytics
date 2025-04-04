# Nginx Analytics Dashboard

## Deployment Guide

Deploy the dashboard on the same server as Nginx.

```bash
git clone https://github.com/tom-draper/nginx-analytics.git
cd dashboard
npm install
npm run build
npm start
```

Or use Docker if preferred.

```bash
git clone https://github.com/tom-draper/nginx-analytics.git
cd dashboard
docker build -t nginx-analytics .
docker run -d -p 3000:3000 nginx-analytics
```

In a `.env` file, set `NGINX_ANALYTICS_ACCESS_PATH` to point to the directory containing your log files.

```env
NGINX_ANALYTICS_ACCESS_PATH=/path/to/nginx/access/logs
```

Update your Nginx configuration to make the app publically accessible.

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /analytics {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Locations

IP-location inference can be set up quickly, utilising <a href="https://www.maxmind.com/en/home">MaxMind's free GeoLite2 database</a>. Simply drop the `GeoLite2-Country.mmdb` or `GeoLite2-City.mmdb` file in the root folder of the agent or dashboard deployment.

### System Monitoring

By default, system monitoring is disabled. To enable it, set the `NGINX_ANALYTICS_SYSTEM_MONITORING` environment variable to `true`.

```env
NGINX_ANALYTICS_SYSTEM_MONITORING=true
```

### Password Protection

To enable password protection for dashboard access, set a password against the `NGINX_ANALYTICS_PASSWORD` environment variable.

```env
NGINX_ANALYTICS_PASSWORD=mypassword
```

### Single Log File

By default, when `NGINX_ANALYTICS_ACCESS_PATH` is set to a directory, all compressed and uncompressed log files within the directory will be served to the dashboard. If you only intend to target a single `access.log` file, use a full filepath instead.

### Error Logs

By default, the `NGINX_ANALYTICS_ACCESS_PATH` will be checked for error logs if it is pointing to a directory. If your error logs are stored in a different path, or using a single filepath instead, you can specify the location of your error logs separately using `NGINX_ANALYTICS_ERROR_PATH`.

```env
NGINX_ANALYTICS_ERROR_PATH=/path/to/nginx/error/logs
```
