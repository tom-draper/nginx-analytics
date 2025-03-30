# Nginx Analytics

A modern, flexible and privacy-focused analytics solution for Nginx.

![Nginx Analytics](https://github.com/user-attachments/assets/b0fc1334-22e0-4d2c-9219-29d69a86a679)

<p align="center">
  <a href="https://nginx-analytics.vercel.app/dashboard/demo">Demo</a>
</p>

## Getting Started

### Dashboard

#### Option 1: Dashboard

Deploy the dashboard to the same server as Nginx.

Follow the <a href="./dashboard/README.md">dashboard deployment guide</a>.

#### Option 2: Dashboard + Agent

Deploy the lightweight agent to your server to securely expose your log files to the dashboard, and stream log file content and changes in real-time. Deploy the dashboard anywhere. 

Best when server resources are tight, or log files are large.

Follow the <a href="./agent/README.md">agent deployment guide</a>.

#### Option 3: Dashboard + Nginx

Update your Nginx configuration to serve your log files over HTTP as restricted static files. Deploy the dashboard anywhere.

Limited functionality; best if you want to avoid further deployments to your server.

Follow the <a href="./dashboard/nginx/README.md">Nginx configuration guide</a>.

#### Options 4: File Upload

Drag-and-drop your `access.log` and `error.log` directly into the dashboard. Get started straight away on <a href="https://nginx-analytics.vercel.app/dashboard">our deployment</a>.

<!-- ### CLI

If you prefer to work in the terminal, a CLI is available as an alternative to the dashboard. 

#### Option 1: CLI

Deploy the CLI to the server running Nginx, and access via SSH.

Follow the <a href="./cli/README.md">CLI deployment guide</a>.

#### Option 2: CLI + Agent 

Deploy the agent to the server, and run the CLI from anywhere.

Follow the <a href="./agent/README.md">agent deployment guide</a>. -->

### Configuration

#### Locations

IP-location inference can be set up quickly, utilising <a href="https://www.maxmind.com/en/home">MaxMind's free GeoLite2 database</a>. Simply drop the `GeoLite2-Country.mmdb` or `GeoLite2-City.mmdb` file in the root folder of the agent or dashboard deployment.

#### System Monitoring

System resource monitoring for CPU, memory and storage usage is disabled by default. Enable it by setting `NGINX_ANALYTICS_SYSTEM_MONITORING=true` in the environment variables of your agent or dashboard deployment.

#### Authentication

When using the agent, it's recommended to use an auth token, by setting the same private environment variable `NGINX_ANALYTICS_AUTH_TOKEN` for both the agent (server) and the dashboard/CLI (client) deployment.

The agent will check that the auth token provided by the client matches the value it has stored locally before granting access to the logs.

#### Password Protection

If your dashboard is publically accessible, set up password protection by assigning a value to the `NGINX_ANALYTICS_PASSWORD` environment variable for the dashboard deployment.

#### HTTPS

Deploying with HTTPS is always recommended. Without this, you risk exposing any personal information within your log files such as IP addresses.

## Contributions

Contributions, issues and feature requests are welcome.

- Fork it (https://github.com/tom-draper/nginx-analytics)
- Create your feature branch (`git checkout -b my-new-feature`)
- Commit your changes (`git commit -am 'Add some feature'`)
- Push to the branch (`git push origin my-new-feature`)
- Create a new Pull Request

---

If you find value in my work, consider supporting me.

Buy Me a Coffee: https://www.buymeacoffee.com/tomdraper<br>
PayPal: https://www.paypal.com/paypalme/tomdraper
