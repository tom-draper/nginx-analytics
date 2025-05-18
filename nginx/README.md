# NGINX Configuration

NGINX can be configured to get more out of your analytics.

After making any changes to the log rotate file, you can confirm `logrotate` runs without errors by triggering it manually.

```bash
sudo logrotate -fv /etc/logrotate.d/nginx
```

## More Logs

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

## Reduce Storage

Increase the compression level in `/etc/logrotate.d/nginx`.

```nginx
compresscmd /bin/gzip
compressoptions -9
```

## Better Names

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

