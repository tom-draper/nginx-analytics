package user

import n "github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"

const deliminer = "::"

func UserID(log n.NGINXLog) string {
	return log.IPAddress + deliminer + log.UserAgent
}