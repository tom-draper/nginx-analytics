package logs

import (
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
)

func FilterLogs(logs []nginx.NGINXLog, period period.Period) []nginx.NGINXLog {
	periodStart := period.Start()
	filteredLogs := make([]nginx.NGINXLog, 0)
	for _, log := range logs {
		if log.Timestamp.After(periodStart) {
			filteredLogs = append(filteredLogs, log)
		}
	}

	return filteredLogs
}
