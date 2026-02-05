package period

import (
	"testing"
	"time"

	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
)

func TestPeriodHours(t *testing.T) {
	tests := []struct {
		name     string
		period   Period
		expected int
	}{
		{
			name:     "24 hours",
			period:   Period24Hours,
			expected: 24,
		},
		{
			name:     "1 week",
			period:   Period1Week,
			expected: 7 * 24,
		},
		{
			name:     "30 days",
			period:   Period30Days,
			expected: 30 * 24,
		},
		{
			name:     "6 months",
			period:   Period6Months,
			expected: 6 * 30 * 24,
		},
		{
			name:     "all time",
			period:   PeriodAllTime,
			expected: -1,
		},
		{
			name:     "invalid period",
			period:   Period("invalid"),
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := PeriodHours(tt.period)

			if result != tt.expected {
				t.Errorf("PeriodHours() = %d, expected %d", result, tt.expected)
			}
		})
	}
}

func TestLogRange(t *testing.T) {
	now := time.Now()
	oneHourAgo := now.Add(-1 * time.Hour)
	twoDaysAgo := now.Add(-48 * time.Hour)

	tests := []struct {
		name      string
		logs      []nginx.NGINXLog
		wantStart time.Time
		wantEnd   time.Time
		wantZero  bool
	}{
		{
			name: "valid logs with timestamps",
			logs: []nginx.NGINXLog{
				{Timestamp: &twoDaysAgo},
				{Timestamp: &oneHourAgo},
				{Timestamp: &now},
			},
			wantStart: twoDaysAgo,
			wantEnd:   now,
			wantZero:  false,
		},
		{
			name:     "empty logs",
			logs:     []nginx.NGINXLog{},
			wantZero: true,
		},
		{
			name: "logs with nil timestamps",
			logs: []nginx.NGINXLog{
				{Timestamp: nil},
			},
			wantZero: true,
		},
		{
			name: "single log with valid timestamp",
			logs: []nginx.NGINXLog{
				{Timestamp: &now},
			},
			wantStart: now,
			wantEnd:   now,
			wantZero:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			start, end := LogRange(tt.logs)

			if tt.wantZero {
				if !start.IsZero() || !end.IsZero() {
					t.Errorf("LogRange() = (%v, %v), expected zero times", start, end)
				}
				return
			}

			// Allow for small time differences due to precision
			if !start.Equal(tt.wantStart) {
				t.Errorf("LogRange() start = %v, expected %v", start, tt.wantStart)
			}
			if !end.Equal(tt.wantEnd) {
				t.Errorf("LogRange() end = %v, expected %v", end, tt.wantEnd)
			}
		})
	}
}

func TestLogRangeDuration(t *testing.T) {
	now := time.Now()
	oneHourAgo := now.Add(-1 * time.Hour)
	twoDaysAgo := now.Add(-48 * time.Hour)

	tests := []struct {
		name     string
		logs     []nginx.NGINXLog
		expected time.Duration
	}{
		{
			name: "2 days range",
			logs: []nginx.NGINXLog{
				{Timestamp: &twoDaysAgo},
				{Timestamp: &oneHourAgo},
				{Timestamp: &now},
			},
			expected: 48 * time.Hour,
		},
		{
			name: "1 hour range",
			logs: []nginx.NGINXLog{
				{Timestamp: &oneHourAgo},
				{Timestamp: &now},
			},
			expected: 1 * time.Hour,
		},
		{
			name:     "empty logs",
			logs:     []nginx.NGINXLog{},
			expected: 0,
		},
		{
			name: "logs with nil timestamps",
			logs: []nginx.NGINXLog{
				{Timestamp: nil},
			},
			expected: 0,
		},
		{
			name: "single log",
			logs: []nginx.NGINXLog{
				{Timestamp: &now},
			},
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := LogRangeDuration(tt.logs)

			if result != tt.expected {
				t.Errorf("LogRangeDuration() = %v, expected %v", result, tt.expected)
			}
		})
	}
}

func TestLogRangeHours(t *testing.T) {
	now := time.Now()
	oneHourAgo := now.Add(-1 * time.Hour)
	thirtyMinutesAgo := now.Add(-30 * time.Minute)
	twoDaysAgo := now.Add(-48 * time.Hour)

	tests := []struct {
		name     string
		logs     []nginx.NGINXLog
		expected int
	}{
		{
			name: "48 hours range",
			logs: []nginx.NGINXLog{
				{Timestamp: &twoDaysAgo},
				{Timestamp: &now},
			},
			expected: 48,
		},
		{
			name: "1 hour range",
			logs: []nginx.NGINXLog{
				{Timestamp: &oneHourAgo},
				{Timestamp: &now},
			},
			expected: 1,
		},
		{
			name: "less than 1 hour range",
			logs: []nginx.NGINXLog{
				{Timestamp: &thirtyMinutesAgo},
				{Timestamp: &now},
			},
			expected: 1, // Should return at least 1 hour
		},
		{
			name:     "empty logs",
			logs:     []nginx.NGINXLog{},
			expected: 1, // Should return at least 1 hour
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := LogRangeHours(tt.logs)

			if result != tt.expected {
				t.Errorf("LogRangeHours() = %d, expected %d", result, tt.expected)
			}
		})
	}
}

func TestLogRangePeriodHours(t *testing.T) {
	now := time.Now()
	twoDaysAgo := now.Add(-48 * time.Hour)

	tests := []struct {
		name     string
		logs     []nginx.NGINXLog
		period   Period
		expected int
	}{
		{
			name: "24 hours period with logs",
			logs: []nginx.NGINXLog{
				{Timestamp: &twoDaysAgo},
				{Timestamp: &now},
			},
			period:   Period24Hours,
			expected: 24,
		},
		{
			name: "all time period with logs",
			logs: []nginx.NGINXLog{
				{Timestamp: &twoDaysAgo},
				{Timestamp: &now},
			},
			period:   PeriodAllTime,
			expected: 48,
		},
		{
			name:     "all time period with empty logs",
			logs:     []nginx.NGINXLog{},
			period:   PeriodAllTime,
			expected: 1, // Returns at least 1 hour
		},
		{
			name: "1 week period",
			logs: []nginx.NGINXLog{
				{Timestamp: &twoDaysAgo},
			},
			period:   Period1Week,
			expected: 7 * 24,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := LogRangePeriodHours(tt.logs, tt.period)

			if result != tt.expected {
				t.Errorf("LogRangePeriodHours() = %d, expected %d", result, tt.expected)
			}
		})
	}
}

func TestPeriodTimeAgo(t *testing.T) {
	tests := []struct {
		name     string
		period   Period
		expected time.Duration
	}{
		{
			name:     "24 hours",
			period:   Period24Hours,
			expected: 24 * time.Hour,
		},
		{
			name:     "1 week",
			period:   Period1Week,
			expected: 7 * 24 * time.Hour,
		},
		{
			name:     "30 days",
			period:   Period30Days,
			expected: 30 * 24 * time.Hour,
		},
		{
			name:     "6 months",
			period:   Period6Months,
			expected: 6 * 30 * 24 * time.Hour,
		},
		{
			name:     "all time",
			period:   PeriodAllTime,
			expected: 0,
		},
		{
			name:     "invalid period",
			period:   Period("invalid"),
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.period.TimeAgo()

			if result != tt.expected {
				t.Errorf("TimeAgo() = %v, expected %v", result, tt.expected)
			}
		})
	}
}

func TestPeriodStart(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name       string
		period     Period
		wantZero   bool
		wantWithin time.Duration // How close to expected time
	}{
		{
			name:       "24 hours",
			period:     Period24Hours,
			wantZero:   false,
			wantWithin: 1 * time.Second,
		},
		{
			name:       "1 week",
			period:     Period1Week,
			wantZero:   false,
			wantWithin: 1 * time.Second,
		},
		{
			name:       "30 days",
			period:     Period30Days,
			wantZero:   false,
			wantWithin: 1 * time.Second,
		},
		{
			name:     "all time",
			period:   PeriodAllTime,
			wantZero: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.period.Start()

			if tt.wantZero {
				if !result.IsZero() {
					t.Errorf("Start() = %v, expected zero time", result)
				}
				return
			}

			expectedStart := now.Add(-tt.period.TimeAgo())
			diff := result.Sub(expectedStart)
			if diff < 0 {
				diff = -diff
			}

			if diff > tt.wantWithin {
				t.Errorf("Start() = %v, expected within %v of %v (diff: %v)", result, tt.wantWithin, expectedStart, diff)
			}
		})
	}
}

// Benchmark tests
func BenchmarkLogRange(b *testing.B) {
	now := time.Now()
	logs := make([]nginx.NGINXLog, 1000)
	for i := range logs {
		timestamp := now.Add(-time.Duration(i) * time.Hour)
		logs[i] = nginx.NGINXLog{Timestamp: &timestamp}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		LogRange(logs)
	}
}

func BenchmarkLogRangeDuration(b *testing.B) {
	now := time.Now()
	logs := make([]nginx.NGINXLog, 1000)
	for i := range logs {
		timestamp := now.Add(-time.Duration(i) * time.Hour)
		logs[i] = nginx.NGINXLog{Timestamp: &timestamp}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		LogRangeDuration(logs)
	}
}

func BenchmarkLogRangePeriodHours(b *testing.B) {
	now := time.Now()
	logs := make([]nginx.NGINXLog, 1000)
	for i := range logs {
		timestamp := now.Add(-time.Duration(i) * time.Hour)
		logs[i] = nginx.NGINXLog{Timestamp: &timestamp}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		LogRangePeriodHours(logs, Period1Week)
	}
}
