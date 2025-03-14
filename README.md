# Nginx Analytics

A modern, flexible and privacy-focused analytics solution for Nginx.

![Nginx Analytics](https://github.com/user-attachments/assets/fecbce07-a70e-439a-87b2-bdd5218645d7)

## Getting Started

### Option 1: Dashboard

Deploy the dashboard to the same server as Nginx.

Follow the <a href="./dashboard/README.md">dashboard deployment guide</a>.

### Option 2: Dashboard + Agent

Deploy the lightweight agent to your server to securely expose your log files to the dashboard, and stream log file content and changes in real-time. Deploy the dashboard anywhere. 

Best when server resources are tight, or log files are large.

Follow the <a href="./agent/README.md">agent deployment guide</a>.

### Option 3: Dashboard + Nginx

Update your Nginx configuration to serve your log files over HTTP as restricted static files. Deploy the dashboard anywhere.

Limited functionality; best if you want to avoid further deployments to your server.

Follow the <a href="./dashboard/nginx/README.md">Nginx configuration guide</a>.

### Options 4: File Upload

Drag-and-drop your `access.log` and `error.log` directly into the dashboard. Get started straight away on <a href="">our deployment</a>.

### Option 5: CLI

Deploy the CLI to the same server as Nginx, and access via SSH.

### Option 6: CLI + Agent 

Deploy the agent to the server, and run the CLI from anywhere.

Follow the <a href="./agent/README.md">agent deployment guide</a>.

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
