package user

import l "github.com/tom-draper/nginx-analytics/cli/internal/logs"

const deliminer = "::"

func UserID(log l.NginxLog) string {
	return log.IPAddress + deliminer + log.UserAgent
}