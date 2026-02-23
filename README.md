# NGINX Analytics

Transform your existing NGINX logs into an interactive real-time analytics dashboard.

![NGINX Analytics](https://github.com/user-attachments/assets/b0fc1334-22e0-4d2c-9219-29d69a86a679)

<p align="center">
  <a href="https://nginx.apianalytics.dev/dashboard/demo">Try the demo</a>
</p>

## Getting Started

### Dashboard

#### Option 1: Dashboard

Deploy a single Next.js dashboard to the same server as NGINX.

Follow the <a href="./dashboard/README.md">dashboard deployment guide</a>.

#### Option 2: Dashboard + Agent

> Best if server resources are tight, or log files are large.

Deploy the lightweight agent to your server to securely expose your log files to the dashboard, and stream log file content and changes in real-time. Deploy the Next.js dashboard anywhere. 

Follow the <a href="./agent/README.md">agent deployment guide</a>.

#### Option 3: Dashboard + NGINX

> Limited functionality; best if you want to avoid further deployments to your server.

Update your existing NGINX configuration to serve your log files as restricted static files. Deploy the Next.js dashboard anywhere.

Follow the <a href="./dashboard/nginx/README.md">NGINX configuration guide</a>.

#### Options 4: File Upload

Drag-and-drop your `access.log` and `error.log` directly into the dashboard. Get started straight away on <a href="https://nginx.apianalytics.dev/dashboard">our deployment</a>.

### Command-Line Interface

If you prefer to work in the terminal, a CLI is available as an alternative to the dashboard. 

![Screenshot 2025-07-07 152340](https://github.com/user-attachments/assets/a9b4bdd7-0773-46da-8811-9bd47046a22c)

#### Option 1: CLI

Deploy the CLI to the server running NGINX. Access via SSH.

Follow the <a href="./cli/README.md">CLI deployment guide</a>.

#### Option 2: CLI + Agent 

Deploy the agent to the server. Run the CLI from anywhere.

Follow the <a href="./agent/README.md">agent deployment guide</a>.

### Configuration

#### Locations

Geolocation by IP address can be set up easily, utilising <a href="https://www.maxmind.com/en/home">MaxMind's free GeoLite2 database</a>. Simply drop the `GeoLite2-City.mmdb` or `GeoLite2-Country.mmdb` file in the root folder of the agent or dashboard deployment on your server.

#### System Monitoring

Monitoring of system resources (CPU, memory, and storage) is supported but disabled by default. Enable it by setting `NGINX_ANALYTICS_SYSTEM_MONITORING=true` in the environment variables of the agent or dashboard deployment on your server.

#### Authentication

When using the agent, it's recommended to set an authentication token. Set the private environment variable `NGINX_ANALYTICS_AUTH_TOKEN` to the same value for both the agent (server) and the dashboard (client) deployment.

The agent will verify that the auth token sent by the client matches the locally stored value before allowing access to the logs.

#### Password Protection

If your dashboard is publically accessible, set up password protection by assigning a value to the `NGINX_ANALYTICS_PASSWORD` environment variable for the dashboard deployment.

#### HTTPS

Deploying with HTTPS is always recommended. Without this, you risk exposing any personal information within your log files such as IP addresses.

#### NGINX

By default, the standard NGINX combined log format is supported. If you use a custom log format, set `NGINX_ANALYTICS_LOG_FORMAT` to match the `log_format` directive in your NGINX config.

```env
NGINX_ANALYTICS_LOG_FORMAT=$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
```

**Nginx Proxy Manager** uses the `vcombined` format, which prepends `$host:$server_port` to each line. Set the following on your agent (or dashboard):

```env
NGINX_ANALYTICS_LOG_FORMAT=$host:$server_port $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
```

> [!NOTE]
> Nginx Proxy Manager stores logs under `/data/logs/` (e.g. `proxy-host-1_access.log`), not `/var/log/nginx/`. Mount and point `NGINX_ANALYTICS_ACCESS_PATH` accordingly.

To better configure NGINX to get the most out of your analytics, take a look at the <a href="./nginx/README.md">NGINX configuration guide</a>.

## Contributions

Contributions, issues and feature requests are welcome.

- Fork it (https://github.com/tom-draper/nginx-analytics)
- Create your feature branch (`git checkout -b my-new-feature`)
- Commit your changes (`git commit -am 'Add some feature'`)
- Push to the branch (`git push origin my-new-feature`)
- Create a new Pull Request

<br>

> **Disclaimer**
>
> This project is not affiliated with, sponsored by, or endorsed by F5, Inc. or the official NGINX project.
> NGINX is a registered trademark of F5, Inc. This is an independent project created by Tom Draper.

<br>

If you find value in my work, consider supporting me.

Buy Me a Coffee: https://www.buymeacoffee.com/tomdraper<br>
PayPal: https://www.paypal.com/paypalme/tomdraper
