package logs

import "github.com/tom-draper/nginx-analytics/cli/internal/logs/period"

func FilterLogs(logs []NginxLog, period period.Period) []NginxLog {
	periodStart := period.Start()
	filteredLogs := make([]NginxLog, 0)
	for _, log := range logs {
		if log.Timestamp.After(periodStart) {
			filteredLogs = append(filteredLogs, log)
		}
	}

	return filteredLogs
}
