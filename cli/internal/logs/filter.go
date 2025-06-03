package logs

import (
	n "github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
)

func FilterLogs(logs []n.NGINXLog, period period.Period) []n.NGINXLog {
	periodStart := period.Start()
	filteredLogs := make([]n.NGINXLog, 0)
	for _, log := range logs {
		if log.Timestamp.After(periodStart) {
			filteredLogs = append(filteredLogs, log)
		}
	}

	return filteredLogs
}
