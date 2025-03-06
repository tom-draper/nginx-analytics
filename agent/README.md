# Nginx Analytics Agent

A lightweight agent to monitor server resources and securely expose log files, written in Go.

## Deployment Guide

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

### Dashboard

If you are using the dashboard, host the dashboard on your favourite platform, ensuring environment variables are set pointing to these public endpoints.

```env
NGINX_ACCESS_URL=http://yourserver.com/logs/access
NGINX_ERROR_URL=http://yourserver.com/logs/error
```

### CLI

Run the CLI
