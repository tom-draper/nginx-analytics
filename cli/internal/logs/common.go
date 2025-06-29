package logs

import (
	"time"
)

type point[T ~int | ~float32 | ~float64] struct {
	timestamp time.Time
	value     T
}

func NearestHour(timestamp time.Time) time.Time {
	return timestamp.Truncate(time.Hour)
}
