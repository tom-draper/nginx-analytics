package logs

import (
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
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

// EndpointFilter represents a filter for endpoint data
type EndpointFilter struct {
	Path   string
	Method string
	Status int
}

// FilterByEndpoint filters logs to only include those matching the endpoint filter
func FilterByEndpoint(logs []nginx.NGINXLog, filter *EndpointFilter) []nginx.NGINXLog {
	if filter == nil {
		return logs
	}

	filteredLogs := make([]nginx.NGINXLog, 0)
	for _, log := range logs {
		if log.Path == filter.Path &&
			log.Method == filter.Method &&
			log.Status != nil && *log.Status == filter.Status {
			filteredLogs = append(filteredLogs, log)
		}
	}

	return filteredLogs
}

// ReferrerFilter represents a filter for referrer data
type ReferrerFilter struct {
	Referrer string
}

// FilterByReferrer filters logs to only include those matching the referrer filter
func FilterByReferrer(logs []nginx.NGINXLog, filter *ReferrerFilter) []nginx.NGINXLog {
	if filter == nil {
		return logs
	}

	filteredLogs := make([]nginx.NGINXLog, 0)
	for _, log := range logs {
		if log.Referrer == filter.Referrer {
			filteredLogs = append(filteredLogs, log)
		}
	}

	return filteredLogs
}
