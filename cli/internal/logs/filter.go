package logs

import (
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
)

func FilterLogs(logs []nginx.NGINXLog, period period.Period) []nginx.NGINXLog {
	periodStart := period.Start()
	filteredLogs := make([]nginx.NGINXLog, 0, len(logs))
	for _, log := range logs {
		if log.Timestamp != nil && log.Timestamp.After(periodStart) {
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

// LocationFilter represents a filter for location data
type LocationFilter struct {
	Location string
}

// FilterByLocation filters logs to only include those matching the location filter
func FilterByLocation(logs []nginx.NGINXLog, filter *LocationFilter, locationLookup func(string) string) []nginx.NGINXLog {
	if filter == nil {
		return logs
	}

	filteredLogs := make([]nginx.NGINXLog, 0)
	for _, log := range logs {
		if log.IPAddress != "" {
			location := locationLookup(log.IPAddress)
			if location == filter.Location {
				filteredLogs = append(filteredLogs, log)
			}
		}
	}

	return filteredLogs
}

// DeviceFilter represents a filter for device/client data
type DeviceFilter struct {
	Device string
}

// FilterByDevice filters logs to only include those matching the device filter
func FilterByDevice(logs []nginx.NGINXLog, filter *DeviceFilter, deviceLookup func(string) string) []nginx.NGINXLog {
	if filter == nil {
		return logs
	}

	filteredLogs := make([]nginx.NGINXLog, 0)
	for _, log := range logs {
		device := deviceLookup(log.UserAgent)
		if device == filter.Device {
			filteredLogs = append(filteredLogs, log)
		}
	}

	return filteredLogs
}

// VersionFilter represents a filter for version data
type VersionFilter struct {
	Version string
}

// FilterByVersion filters logs to only include those matching the version filter
func FilterByVersion(logs []nginx.NGINXLog, filter *VersionFilter, versionLookup func(string) string) []nginx.NGINXLog {
	if filter == nil {
		return logs
	}

	filteredLogs := make([]nginx.NGINXLog, 0)
	for _, log := range logs {
		version := versionLookup(log.Path)
		if version == filter.Version {
			filteredLogs = append(filteredLogs, log)
		}
	}

	return filteredLogs
}
