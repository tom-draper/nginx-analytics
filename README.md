# Nginx Analytics

A modern, flexible and privacy-focused analytics solution for Nginx.

![Nginx Analytics](https://github.com/user-attachments/assets/b0fc1334-22e0-4d2c-9219-29d69a86a679)

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

Drag-and-drop your `access.log` and `error.log` directly into the dashboard. Get started straight away on <a href="">our deployment</a>.

### CLI

If you prefer to work in the terminal, a CLI is available as an alternative to the dashboard. 

#### Option 1: CLI

Deploy the CLI to the same server as Nginx, and access via SSH.

Follow the <a href="./cli/README.md">CLI deployment guide</a>.

#### Option 2: CLI + Agent 

Deploy the agent to the server, and run the CLI from anywhere.

Follow the <a href="./agent/README.md">agent deployment guide</a>.

### Configuration

#### Locations

IP-location inference can be quickly set up, utilising MaxMind's free GeoLite database. Simply drop the `.mmdb` file in the root folder of the dashboard or agent deployment.

#### Auth Token

When using the agent, it's recommended to set a private auth token, by assigning a value to the `NGINX_ANALYTICS_AUTH_TOKEN` environment variable for both the agent and the dashboard/CLI deployment. When a request in made to the agent but the dashboard/CLI, the client will provide this auth token, and the agent will check that it matches the expected value. This will stop attackers from being able to access your log files by making requests to the agent.

#### Password Protection

If your dashboard is publically accessible, password protection can be set up by assigning a password under the `NGINX_ANALYTICS_PASSWORD` in the environment variables of the dashboard deployment.

#### HTTPS

Deploying with HTTPS is always recommended. Without this, you risk exposing sensitive personal information such as IP addresses.

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
