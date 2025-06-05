package plot

import (
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/logger"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

type MicroHistogram struct {
	histogram []int
}

// MicroHistogram creates histogram buckets from a slice of timestamps and returns a slice of bucket counts.
func NewMicroHistogram(timestamps []time.Time, bucketCount int) MicroHistogram {
	if len(timestamps) == 0 || bucketCount <= 0 {
		return MicroHistogram{histogram: make([]int, bucketCount)}
	}

	// Find min and max times
	minTime := timestamps[0]
	maxTime := timestamps[0]
	for _, t := range timestamps {
		if t.Before(minTime) {
			minTime = t
		}
		if t.After(maxTime) {
			maxTime = t
		}
	}

	// If all timestamps are the same, put everything into one bucket
	if minTime.Equal(maxTime) {
		histogram := make([]int, bucketCount)
		histogram[0] = len(timestamps)
		return MicroHistogram{histogram: histogram}
	}

	// Calculate bucket duration
	totalDuration := maxTime.Sub(minTime)
	bucketDuration := totalDuration / time.Duration(bucketCount)

	// Create histogram
	histogram := make([]int, bucketCount)
	for _, t := range timestamps {
		bucketIndex := int(t.Sub(minTime) / bucketDuration)
		if bucketIndex >= bucketCount {
			bucketIndex = bucketCount - 1 // edge case where t == maxTime
		}
		histogram[bucketIndex]++
	}

	return MicroHistogram{histogram: histogram}
}

type UserEvent struct {
	Timestamp time.Time
	UserID    string
}

func NewUserMicroHistogram(events []UserEvent, bucketCount int) MicroHistogram {
	if len(events) == 0 || bucketCount <= 0 {
		return MicroHistogram{histogram: make([]int, bucketCount)}
	}

	// Find min and max times
	minTime := events[0].Timestamp
	maxTime := events[0].Timestamp
	for _, e := range events {
		if e.Timestamp.Before(minTime) {
			minTime = e.Timestamp
		}
		if e.Timestamp.After(maxTime) {
			maxTime = e.Timestamp
		}
	}
	logger.Log.Println(minTime, maxTime)

	if minTime.Equal(maxTime) {
		buckets := make([]map[string]struct{}, bucketCount)
		for i := range buckets {
			buckets[i] = make(map[string]struct{})
		}
		for _, e := range events {
			buckets[0][e.UserID] = struct{}{}
		}
		histogram := make([]int, bucketCount)
		for i, m := range buckets {
			histogram[i] = len(m)
		}
		return MicroHistogram{histogram: histogram}
	}

	// Calculate bucket duration
	totalDuration := maxTime.Sub(minTime)
	bucketDuration := totalDuration / time.Duration(bucketCount)

	// Track unique users in each bucket
	buckets := make([]map[string]struct{}, bucketCount)
	for i := range buckets {
		buckets[i] = make(map[string]struct{})
	}

	for _, e := range events {
		bucketIndex := int(e.Timestamp.Sub(minTime) / bucketDuration)
		if bucketIndex >= bucketCount {
			bucketIndex = bucketCount - 1
		}
		buckets[bucketIndex][e.UserID] = struct{}{}
	}

	// Convert to histogram
	histogram := make([]int, bucketCount)
	for i, m := range buckets {
		histogram[i] = len(m)
	}

	return MicroHistogram{histogram: histogram}
}

func (h MicroHistogram) Render(width int) string {
	if len(h.histogram) == 0 {
		return strings.Repeat(" ", width)
	}

	// Find max value for scaling
	maxVal := 0
	for _, val := range h.histogram {
		if val > maxVal {
			maxVal = val
		}
	}

	if maxVal == 0 {
		return strings.Repeat(" ", width)
	}

	// Scale histogram to width
	scaledHistogram := scaleHistogramToWidth(h.histogram, width)

	// Create histogram string
	var result strings.Builder

	for _, val := range scaledHistogram {
		scaledVal := float64(val) / float64(maxVal) * 8
		barIndex := min(int(scaledVal+0.5), 8)
		result.WriteString(BarChars[barIndex])
	}

	barStyle := lipgloss.NewStyle().Foreground(styles.Green)
	return barStyle.Render(result.String())
}

func scaleHistogramToWidth(histogram []int, width int) []int {
	if len(histogram) == 0 || width <= 0 {
		return make([]int, width)
	}

	scaled := make([]int, width)
	for i, val := range histogram {
		scaledIndex := i * width / len(histogram)
		if scaledIndex < width {
			scaled[scaledIndex] += val
		}
	}
	return scaled
}
