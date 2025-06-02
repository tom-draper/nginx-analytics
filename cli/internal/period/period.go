package period

import "time"

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