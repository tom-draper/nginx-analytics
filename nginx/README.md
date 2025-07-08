# NGINX Tips & Tricks

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

<!-- ## Better Errors

```nginx
error_log /var/log/nginx/error.log warn;  # Levels: debug, info, notice, warn, error, crit, alert, emerg
``` -->

<!-- ## Better Logs -->

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
