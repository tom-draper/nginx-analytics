# Nginx Analytics

A simple, flexible and privacy-focused analytics solution for Nginx.

## Getting Started

### Option 1: Deploy dashboard

Deploy the dashboard to the same server as Nginx, providing the path to your logs in a `.env` file.

```env
NGINX_ACCESS_PATH=/var/log/nginx/access.log
NGINX_ERROR_PATH=/var/log/nginx/error.log
```

You may need to update your Nginx configuration to make the app publically accessible.

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

### Option 2: Deploy agent

Deploy the lightweight agent to your server to securely expose your log files to the dashboard, and stream log file content and changes in real-time. This option is better suited when server resources are tight, or log files are large.

```bash
go build -o log_agent agent.go
scp log_agent user@yourserver:/usr/local/bin/
ssh user@yourserver
chmod +x /usr/local/bin/log_agent
```

Run it manually to confirm it's publically accessible.

```
/usr/local/bin/log_agent
```

```bash
curl http://yourserver.com/logs/status

> {"status": "ok"}
```

All log data transferred by the agent is encrypted end-to-end, so HTTPS is optional.

Setup a systemd service `/etc/systemd/system/log_agent.service` to run the agent in the background.

```
[Unit]
Description=Nginx Log Agent
After=network.target

[Service]
ExecStart=/usr/local/bin/log_agent
Restart=always
User=nobody
Group=nogroup

[Install]
WantedBy=multi-user.target
```

Enable and start: 

```bash
sudo systemctl daemon-reload
sudo systemctl enable log_agent
sudo systemctl start log_agent
```

Then, host the dashboard on your favourite platform, ensuring environment variables are set pointing to these endpoints.

```env
NGINX_ACCESS_URL=http://yourserver.com/logs/access
NGINX_ERROR_URL=http://yourserver.com/logs/error
```

### Option 3: Expose log files using Nginx

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

Then, host the dashboard on your favourite platform, ensuring environment variables are set pointing to these endpoints.

```env
NGINX_ACCESS_URL=http://yourserver.com/logs/access
NGINX_ERROR_URL=http://yourserver.com/logs/error
```

### Options 4: File Upload

Drag-and-drop your `access.log` and `error.log` directly into the dashboard. Get started straight away on <a href="">our deployment</a>.

## Contributions

Contributions, issues and feature requests are welcome.

- Fork it (https://github.com/tom-draper/nginx-analytics)
- Create your feature branch (`git checkout -b my-new-feature`)
- Commit your changes (`git commit -am 'Add some feature'`)
- Push to the branch (`git push origin my-new-feature`)
- Create a new Pull Request

---

If you find value in my work consider supporting me.

Buy Me a Coffee: https://www.buymeacoffee.com/tomdraper<br>
PayPal: https://www.paypal.com/paypalme/tomdraper
