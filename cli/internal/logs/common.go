package logs

import (
	"time"
)

func NearestHour(timestamp time.Time) time.Time {
	return timestamp.Truncate(time.Hour)
}
