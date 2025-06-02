package user

import "github.com/tom-draper/nginx-analytics/cli/internal/parse"

const deliminer = "::"

func UserID(log parse.NginxLog) string {
	return log.IPAddress + deliminer + log.UserAgent
}