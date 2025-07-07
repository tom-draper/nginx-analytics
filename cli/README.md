# NGINX Analytics CLI

A log analytics dashboard TUI app, built with Go.

## Deployment Guide

```bash
git clone https://github.com/tom-draper/nginx-analytics.git
cd nginx-analytics/cli

make
# or...
go build -o bin/nginx-analytics ./cmd/nginx-analytics

scp bin/nginx-analytics user@yourserver:/usr/local/bin/
ssh user@yourserver
chmod +x /usr/local/bin/nginx-analytics
```

> If your NGINX log path is different from the default `/var/log/nginx`, set the correct path as an environment variable within a `.env` file.
>
> ```env
> NGINX_ANALYTICS_ACCESS_PATH=/path/to/access/logs
> NGINX_ANALYTICS_ERROR_PATH=/path/to/error/logs
> ```

### Access Logs

By default, when `NGINX_ANALYTICS_ACCESS_PATH` is set to a directory, all compressed (.gz) and uncompressed (.log) log files within the directory will be included. If you only intend to target a single `access.log` file, use a full filepath instead.

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

IP-location inference can be set up quickly, utilising <a href="https://www.maxmind.com/en/home">MaxMind's free GeoLite2 database</a>. Simply drop the `GeoLite2-Country.mmdb` or `GeoLite2-City.mmdb` file in the same folder as the executable.

### System Monitoring

By default, system monitoring is disabled. To enable it, set the `NGINX_ANALYTICS_SYSTEM_MONITORING` environment variable to `true`.

```env
NGINX_ANALYTICS_SYSTEM_MONITORING=true
```

You can control how often resource usage is polled by adjusting `NGINX_ANALYTICS_MONITOR_INTERVAL`.

```env
NGINX_ANALYTICS_SYSTEM_MONITORING=2000  # 2s interval (default)
```
