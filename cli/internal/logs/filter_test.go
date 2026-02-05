package logs

import (
	"strings"
	"testing"
	"time"

	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
)

// Helper functions for creating test data
func createTestLog(ip, method, path string, status int, timestamp time.Time, referrer, userAgent string) nginx.NGINXLog {
	return nginx.NGINXLog{
		IPAddress:  ip,
		Method:     method,
		Path:       path,
		Status:     &status,
		Timestamp:  &timestamp,
		Referrer:   referrer,
		UserAgent:  userAgent,
	}
}

func TestFilterLogs(t *testing.T) {
	now := time.Now()
	oneHourAgo := now.Add(-1 * time.Hour)
	twoDaysAgo := now.Add(-48 * time.Hour)
	oneWeekAgo := now.Add(-7 * 24 * time.Hour)

	logs := []nginx.NGINXLog{
		createTestLog("1.1.1.1", "GET", "/api/v1", 200, now, "ref1", "agent1"),
		createTestLog("2.2.2.2", "POST", "/api/v2", 201, oneHourAgo, "ref2", "agent2"),
		createTestLog("3.3.3.3", "GET", "/api/v3", 200, twoDaysAgo, "ref3", "agent3"),
		createTestLog("4.4.4.4", "DELETE", "/api/v4", 204, oneWeekAgo, "ref4", "agent4"),
	}

	tests := []struct {
		name     string
		period   period.Period
		expected int
	}{
		{
			name:     "24 hours period",
			period:   period.Period24Hours,
			expected: 2, // now and oneHourAgo
		},
		{
			name:     "1 week period",
			period:   period.Period1Week,
			expected: 3, // now, oneHourAgo, twoDaysAgo
		},
		{
			name:     "all time period",
			period:   period.PeriodAllTime,
			expected: 4, // all logs
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := FilterLogs(logs, tt.period)

			if len(result) != tt.expected {
				t.Errorf("FilterLogs() returned %d logs, expected %d", len(result), tt.expected)
			}
		})
	}
}

func TestFilterLogsWithNilTimestamps(t *testing.T) {
	logs := []nginx.NGINXLog{
		{IPAddress: "1.1.1.1", Method: "GET", Path: "/api/v1", Timestamp: nil},
		createTestLog("2.2.2.2", "POST", "/api/v2", 200, time.Now(), "ref", "agent"),
	}

	result := FilterLogs(logs, period.Period24Hours)

	// Should only include logs with non-nil timestamps
	if len(result) != 1 {
		t.Errorf("FilterLogs() should skip nil timestamps, got %d logs", len(result))
	}
}

func TestFilterByEndpoint(t *testing.T) {
	status200 := 200
	status404 := 404

	logs := []nginx.NGINXLog{
		{Method: "GET", Path: "/api/users", Status: &status200},
		{Method: "GET", Path: "/api/users", Status: &status404},
		{Method: "POST", Path: "/api/users", Status: &status200},
		{Method: "GET", Path: "/api/posts", Status: &status200},
	}

	tests := []struct {
		name     string
		filter   *EndpointFilter
		expected int
	}{
		{
			name: "filter by GET /api/users 200",
			filter: &EndpointFilter{
				Path:   "/api/users",
				Method: "GET",
				Status: 200,
			},
			expected: 1,
		},
		{
			name: "filter by GET /api/users 404",
			filter: &EndpointFilter{
				Path:   "/api/users",
				Method: "GET",
				Status: 404,
			},
			expected: 1,
		},
		{
			name: "filter by POST /api/users 200",
			filter: &EndpointFilter{
				Path:   "/api/users",
				Method: "POST",
				Status: 200,
			},
			expected: 1,
		},
		{
			name: "filter with no matches",
			filter: &EndpointFilter{
				Path:   "/api/nonexistent",
				Method: "DELETE",
				Status: 500,
			},
			expected: 0,
		},
		{
			name:     "nil filter returns all logs",
			filter:   nil,
			expected: 4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := FilterByEndpoint(logs, tt.filter)

			if len(result) != tt.expected {
				t.Errorf("FilterByEndpoint() returned %d logs, expected %d", len(result), tt.expected)
			}
		})
	}
}

func TestFilterByReferrer(t *testing.T) {
	logs := []nginx.NGINXLog{
		{Referrer: "https://google.com"},
		{Referrer: "https://facebook.com"},
		{Referrer: "https://google.com"},
		{Referrer: "https://twitter.com"},
	}

	tests := []struct {
		name     string
		filter   *ReferrerFilter
		expected int
	}{
		{
			name: "filter by google.com",
			filter: &ReferrerFilter{
				Referrer: "https://google.com",
			},
			expected: 2,
		},
		{
			name: "filter by facebook.com",
			filter: &ReferrerFilter{
				Referrer: "https://facebook.com",
			},
			expected: 1,
		},
		{
			name: "filter with no matches",
			filter: &ReferrerFilter{
				Referrer: "https://nonexistent.com",
			},
			expected: 0,
		},
		{
			name:     "nil filter returns all logs",
			filter:   nil,
			expected: 4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := FilterByReferrer(logs, tt.filter)

			if len(result) != tt.expected {
				t.Errorf("FilterByReferrer() returned %d logs, expected %d", len(result), tt.expected)
			}
		})
	}
}

func TestFilterByLocation(t *testing.T) {
	logs := []nginx.NGINXLog{
		{IPAddress: "1.1.1.1"},  // US
		{IPAddress: "2.2.2.2"},  // UK
		{IPAddress: "3.3.3.3"},  // US
		{IPAddress: ""},         // Empty IP
	}

	// Mock location lookup function
	locationLookup := func(ip string) string {
		switch ip {
		case "1.1.1.1", "3.3.3.3":
			return "US"
		case "2.2.2.2":
			return "UK"
		default:
			return ""
		}
	}

	tests := []struct {
		name     string
		filter   *LocationFilter
		expected int
	}{
		{
			name: "filter by US",
			filter: &LocationFilter{
				Location: "US",
			},
			expected: 2,
		},
		{
			name: "filter by UK",
			filter: &LocationFilter{
				Location: "UK",
			},
			expected: 1,
		},
		{
			name: "filter with no matches",
			filter: &LocationFilter{
				Location: "FR",
			},
			expected: 0,
		},
		{
			name:     "nil filter returns all logs",
			filter:   nil,
			expected: 4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := FilterByLocation(logs, tt.filter, locationLookup)

			if len(result) != tt.expected {
				t.Errorf("FilterByLocation() returned %d logs, expected %d", len(result), tt.expected)
			}
		})
	}
}

func TestFilterByDevice(t *testing.T) {
	logs := []nginx.NGINXLog{
		{UserAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"},
		{UserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
		{UserAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"},
		{UserAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"},
	}

	// Mock device lookup function using strings.Contains
	deviceLookup := func(userAgent string) string {
		if strings.Contains(userAgent, "(iPhone;") {
			return "iPhone"
		}
		if strings.Contains(userAgent, "(Windows NT") {
			return "Windows"
		}
		if strings.Contains(userAgent, "(Macintosh;") {
			return "Mac"
		}
		return "Unknown"
	}

	tests := []struct {
		name     string
		filter   *DeviceFilter
		expected int
	}{
		{
			name: "filter by iPhone",
			filter: &DeviceFilter{
				Device: "iPhone",
			},
			expected: 2,
		},
		{
			name: "filter by Windows",
			filter: &DeviceFilter{
				Device: "Windows",
			},
			expected: 1,
		},
		{
			name: "filter by Mac",
			filter: &DeviceFilter{
				Device: "Mac",
			},
			expected: 1,
		},
		{
			name:     "nil filter returns all logs",
			filter:   nil,
			expected: 4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := FilterByDevice(logs, tt.filter, deviceLookup)

			if len(result) != tt.expected {
				t.Errorf("FilterByDevice() returned %d logs, expected %d", len(result), tt.expected)
			}
		})
	}
}

func TestFilterByVersion(t *testing.T) {
	logs := []nginx.NGINXLog{
		{Path: "/api/v1/users"},
		{Path: "/api/v2/users"},
		{Path: "/api/v1/posts"},
		{Path: "/api/v3/data"},
	}

	// Mock version lookup function
	versionLookup := func(path string) string {
		if len(path) > 6 {
			if path[5:7] == "v1" {
				return "v1"
			} else if path[5:7] == "v2" {
				return "v2"
			} else if path[5:7] == "v3" {
				return "v3"
			}
		}
		return ""
	}

	tests := []struct {
		name     string
		filter   *VersionFilter
		expected int
	}{
		{
			name: "filter by v1",
			filter: &VersionFilter{
				Version: "v1",
			},
			expected: 2,
		},
		{
			name: "filter by v2",
			filter: &VersionFilter{
				Version: "v2",
			},
			expected: 1,
		},
		{
			name: "filter by v3",
			filter: &VersionFilter{
				Version: "v3",
			},
			expected: 1,
		},
		{
			name:     "nil filter returns all logs",
			filter:   nil,
			expected: 4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := FilterByVersion(logs, tt.filter, versionLookup)

			if len(result) != tt.expected {
				t.Errorf("FilterByVersion() returned %d logs, expected %d", len(result), tt.expected)
			}
		})
	}
}

// Benchmark tests
func BenchmarkFilterLogs(b *testing.B) {
	now := time.Now()
	logs := make([]nginx.NGINXLog, 1000)
	for i := range logs {
		timestamp := now.Add(-time.Duration(i) * time.Hour)
		logs[i] = createTestLog("1.1.1.1", "GET", "/api/test", 200, timestamp, "ref", "agent")
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		FilterLogs(logs, period.Period1Week)
	}
}

func BenchmarkFilterByEndpoint(b *testing.B) {
	status200 := 200
	logs := make([]nginx.NGINXLog, 1000)
	for i := range logs {
		logs[i] = nginx.NGINXLog{
			Method: "GET",
			Path:   "/api/users",
			Status: &status200,
		}
	}

	filter := &EndpointFilter{
		Path:   "/api/users",
		Method: "GET",
		Status: 200,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		FilterByEndpoint(logs, filter)
	}
}
