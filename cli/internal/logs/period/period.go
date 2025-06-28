package period

import (
	"time"

	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
)

// Period represents time period options
type Period string

const (
	Period24Hours Period = "24 hours"
	Period1Week   Period = "1 week"
	Period30Days  Period = "30 days"
	Period6Months Period = "6 months"
	PeriodAllTime Period = "all time"
)

func PeriodHours(period Period) int {
	switch period {
	case Period24Hours:
		return 24
	case Period1Week:
		return 7 * 24
	case Period30Days:
		return 30 * 24
	case Period6Months:
		return 6 * 30 * 24 // Approximation
	case PeriodAllTime:
		return -1 // No limit
	default:
		return 0 // Invalid period
	}
}

func LogRange(logs []nginx.NGINXLog) time.Duration {
	if len(logs) == 0 {
		return 0
	}
	start := logs[0].Timestamp
	end := logs[len(logs)-1].Timestamp

	return end.Sub(*start)
}

func LogRangePeriodHours(logs []nginx.NGINXLog, period Period) int {
	if period != PeriodAllTime && len(logs) > 0 {
		return PeriodHours(period)
	}

	logRange := LogRange(logs)
	if logRange == 0 {
		return 1 // No logs to calculate range
	}

	hours := int(logRange.Hours())
	if hours < 1 {
		return 1 // At least 1 hour
	}

	return hours
}

func (p Period) TimeAgo() time.Duration {
	switch p {
	case Period24Hours:
		return 24 * time.Hour
	case Period1Week:
		return 7 * 24 * time.Hour
	case Period30Days:
		return 30 * 24 * time.Hour
	case Period6Months:
		return 6 * 30 * 24 * time.Hour // Approximation
	case PeriodAllTime:
		return 0 // No limit
	default:
		return 0 // Invalid period
	}
}

func (p Period) Start() time.Time {
	if p == PeriodAllTime {
		return time.Time{} // Zero time for all time
	}

	return time.Now().Add(-p.TimeAgo())
}
