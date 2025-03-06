# Nginx Analytics

A highly flexible and privacy-focused analytics solution for Nginx.

## Getting Started

### Option 1: Dashboard

Deploy the dashboard on the same server as Nginx.

Follow the <a href="./dashboard/README.md">dashboard deployment guide</a>.

### Option 2: Dashboard + Agent

Deploy the lightweight agent to your server to securely expose your log files to the dashboard, and stream log file content and changes in real-time. 

Best when server resources are tight, or log files are large.

Follow the <a href="./dashboard/README.md">agent deployment guide</a>.

Then, host the dashboard on your favourite platform, ensuring environment variables are set pointing to these public endpoints.

```env
NGINX_ACCESS_URL=http://yourserver.com/logs/access
NGINX_ERROR_URL=http://yourserver.com/logs/error
```

### Option 3: Dashboard + Nginx

Update your Nginx configuration to serve your log files over HTTP as restricted static files.

Best when deployment to the server is restricted or access is limited.

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

### Option 5: CLI

Deploy the CLI to the server, and access via SSH.

### Option 6: CLI + Agent 

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
