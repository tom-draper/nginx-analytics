# NGINX Configuration

Configuration steps to get more out of your analytics.

## Log Rotation

> After making any changes to the log rotate file, you can confirm `logrotate` runs without errors by triggering it manually.
>
> ```bash
> sudo logrotate -fv /etc/logrotate.d/nginx
> ```

### Increase Retention

By default NGINX keeps retains your log files for 14 days. You can increase this number in `/etc/logrotate.d/nginx`.

```nginx
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14  # Number of days to retain logs
    compress
    delaycompress
    notifempty
    create 0640 nginx adm
    sharedscripts
    postrotate
        [ -s /run/nginx.pid ] && kill -USR1 `cat /run/nginx.pid`
    endscript
}
```

### Aggressive Compression

Increase the compression level in `/etc/logrotate.d/nginx`.

```nginx
compresscmd /bin/gzip
compressoptions -9
```

### Date-Based File Names

Enabling `dateext` means NGINX will append a date suffix to rotated log files instead of using `.1`, `.2`, etc.

```
access.log -> access.log-2025-03-31 -> access.log-2025-03-30.gz ...
```

Add the below to `/etc/logrotate.d/nginx`. A preferred date format can be specified.

```nginx
dateext
dateformat -%Y-%m-%d
```

## NGINX

> After making any NGINX config changes, make sure you reload the config for it to take effect.
>
> ```bash
> sudo nginx -t && sudo nginx -s reload
> ```

### Log Format

If NGINX is using a custom format, make sure to set the log format as an environment variable.

```nginx
log_format analytics '$remote_addr - $remote_user [$time_iso8601] '
                     '"$request" $status $body_bytes_sent '
                     'rt=$request_time urt=$upstream_response_time '
                     'uaddr=$upstream_addr '
                     'ref="$http_referer" ua="$http_user_agent" '
                     'xff="$http_x_forwarded_for"';
```

```env
NGINX_ANALYTICS_LOG_FORMAT='$remote_addr - $remote_user [$time_iso8601] "$request" $status $body_bytes_sent rt=$request_time urt=$upstream_response_time uaddr=$upstream_addr ref="$http_referer" ua="$http_user_agent" xff="$http_x_forwarded_for"'
```

### Capture Application Performance

To effectively analyze performance, ensure you are tracking how long NGINX takes to process the request, and how long your upstream application (like Node, Python, or PHP) takes to respond.

* `$request_time`: Total time NGINX spent on the request (in seconds, with millisecond resolution).
* `$upstream_response_time`: Time spent waiting for the backend application to respond.

### Filter Out Health Checks (Reduce Log Noise)

If your servers are behind a load balancer, your logs might be filled with thousands of ping requests. You can exclude specific routes (like `/health`) from your access logs entirely to save storage and processing power.

```nginx
map $request_uri $loggable {
    /health  0;
    /ping    0;
    default  1;
}

# Only log the request if $loggable evaluates to 1
access_log /var/log/nginx/access.log combined if=$loggable;
```

### Optimize Disk I/O with Buffering

For high-throughput environments, writing to the log file synchronously on every request can bottleneck performance. You can instruct NGINX to hold logs in memory and write them in chunks.

```nginx
# Buffer logs up to 32k, or flush to disk every 5 seconds
access_log /var/log/nginx/access.log combined buffer=32k flush=5s;
```

### Capturing Real Client IPs

If your NGINX server sits behind a CDN or Load Balancer, your analytics might show the proxy's IP address instead of the actual visitor's IP. Ensure you are extracting the real IP:

```nginx
# Trust your load balancer's IP (replace with your proxy's IP range)
set_real_ip_from 10.0.0.0/8;
real_ip_header X-Forwarded-For;
```

## NGINX Proxy Manager

NGINX Proxy Manager may use a slightly different log format to default NGINX.

```nginx
log_format combined '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent"';
```

It also stores logs in `/data/logs`.

```env
NGINX_ANALYTICS_LOG_FORMAT='$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"'
NGINX_ANALYTICS_ACCESS_PATH=/data/logs
NGINX_ANALYTICS_ERROR_PATH=/data/logs
```

## Docker

If your NGINX instance runs inside a Docker container, you'll need to mount the log directory to ensure logs are persisted outside of the container.

```yaml
services:
  nginx:
    image: nginx:latest
    container_name: my-nginx
    ports:
      - "80:80"
    volumes:
      - /var/log/nginx:/var/log/nginx    # log volume
```
