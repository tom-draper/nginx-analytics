package filter

import (
	"github.com/tom-draper/nginx-analytics/cli/internal/parse"
	"github.com/tom-draper/nginx-analytics/cli/internal/period"
)

func FilterLogs(logs []parse.NginxLog, period period.Period) []parse.NginxLog {
	periodStart := period.Start()
	filteredLogs := make([]parse.NginxLog, 0)
	for _, log := range logs {
		if log.Timestamp.After(periodStart) {
			filteredLogs = append(filteredLogs, log)
		}
	}

	return filteredLogs
}
