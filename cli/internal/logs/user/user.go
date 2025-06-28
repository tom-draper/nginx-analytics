package user

import "github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"

const deliminer = "::"

func UserID(log nginx.NGINXLog) string {
	return log.IPAddress + deliminer + log.UserAgent
}