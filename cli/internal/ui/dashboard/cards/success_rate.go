package cards

import (
	"fmt"
	"sort"
	"strings"
	"time" // Added for time-related operations

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard/plot" // Import plot package
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

type SuccessRateCard struct {
	successRate           float64
	successRatePerBucket  []float64 // New field to store success rate per bucket
	timestamps            []time.Time // To get time range for histogram buckets
}

func NewSuccessRateCard(logs []nginx.NGINXLog, period period.Period) *SuccessRateCard {
	card := &SuccessRateCard{}
	card.UpdateCalculated(logs, period)
	return card
}

func (r *SuccessRateCard) UpdateCalculated(logs []nginx.NGINXLog, period period.Period) {
	r.timestamps = getTimestamps(logs) // Reuse getTimestamps from requests.go or define here

	successCountMap := make(map[time.Time]int)
	totalCountMap := make(map[time.Time]int)

	for _, log := range logs {
		if log.Timestamp == nil || log.Status == nil {
			continue
		}
		timeBucket := nearestBucket(*log.Timestamp, defaultBucketInterval)
		totalCountMap[timeBucket]++
		if *log.Status >= 100 && *log.Status < 400 {
			successCountMap[timeBucket]++
		}
	}

	// Collect unique timestamps and sort them
	var uniqueTimestamps []time.Time
	for t := range totalCountMap {
		uniqueTimestamps = append(uniqueTimestamps, t)
	}
	// Sort timestamps to ensure consistent histogram order
	// This relies on `sort.Slice` from `sort` package. If not imported, add `import "sort"`
	sort.Slice(uniqueTimestamps, func(i, j int) bool {
		return uniqueTimestamps[i].Before(uniqueTimestamps[j])
	})

	// Determine the number of buckets for the micro-histogram
	// This should be dynamic based on card width, or a fixed reasonable number
	// Let's use a default, e.g., 50 buckets, for `plot.NewMicroHistogram`
	const histogramBuckets = 50

	// Prepare data for plot.MicroHistogram (converting counts to 0-1 values for `plot`)
	// We need a list of values that represent success rates over time.
	// We'll create a list of success rates for each bucket, interpolated if necessary.
	r.successRatePerBucket = make([]float64, histogramBuckets)

	if len(uniqueTimestamps) > 0 {
		minTime := uniqueTimestamps[0]
		maxTime := uniqueTimestamps[len(uniqueTimestamps)-1]

		if minTime.Equal(maxTime) {
			// All logs in one time bucket. Calculate overall success rate for that bucket.
			if totalCountMap[minTime] > 0 {
				r.successRatePerBucket[0] = float64(successCountMap[minTime]) / float64(totalCountMap[minTime])
			} else {
				r.successRatePerBucket[0] = 0.0
			}
			for i := 1; i < histogramBuckets; i++ {
				r.successRatePerBucket[i] = r.successRatePerBucket[0] // Fill others with the same value
			}
		} else {
			totalDuration := maxTime.Sub(minTime)
			bucketDuration := totalDuration / time.Duration(histogramBuckets)
			if bucketDuration == 0 { // Prevent division by zero for very short durations
				bucketDuration = 1 * time.Nanosecond
			}

			for i := 0; i < histogramBuckets; i++ {
				bucketStartTime := minTime.Add(time.Duration(i) * bucketDuration)
				bucketEndTime := minTime.Add(time.Duration(i+1) * bucketDuration)

				successInBucket := 0
				totalInBucket := 0

				// Aggregate logs that fall into this specific time bucket
				for _, log := range logs {
					if log.Timestamp == nil || log.Status == nil {
						continue
					}
					logTime := *log.Timestamp
					if (logTime.Equal(bucketStartTime) || logTime.After(bucketStartTime)) && logTime.Before(bucketEndTime) {
						totalInBucket++
						if *log.Status >= 100 && *log.Status < 400 {
							successInBucket++
						}
					}
				}

				if totalInBucket > 0 {
					r.successRatePerBucket[i] = float64(successInBucket) / float64(totalInBucket)
				} else {
					r.successRatePerBucket[i] = 0.0 // No data for this bucket
				}
			}
		}
	} else {
		// No logs, all success rates are 0 or -1.
		for i := range r.successRatePerBucket {
			r.successRatePerBucket[i] = 0.0 // Or a special value to indicate no data for the bucket
		}
	}


	// Calculate overall success rate
	success := successCount(logs)
	total := len(logs)
	if total == 0 {
		r.successRate = -1
	} else {
		r.successRate = float64(success) / float64(total)
	}
}

func successCount(logs []nginx.NGINXLog) int {
	count := 0
	for _, log := range logs {
		if log.Status != nil && *log.Status >= 100 && *log.Status < 400 {
			count++
		}
	}
	return count
}

func rateColor(rate float64) lipgloss.Color {
	if rate == -1 {
		return styles.LightGray // Grey for no data
	}
	switch {
	case rate >= 0.9:
		return styles.Green // Best: Green
	case rate >= 0.8:
		return lipgloss.Color("154") // Light Green/Chartreuse
	case rate >= 0.7:
		return styles.Yellow // Yellow
	case rate >= 0.6:
		return lipgloss.Color("214") // Orange-Yellow
	case rate >= 0.5:
		return styles.Orange // Orange
	case rate >= 0.4:
		return lipgloss.Color("202") // Dark Orange/Reddish-Orange
	default:
		return styles.Red // Worst: Red
	}
}

func (r *SuccessRateCard) RenderContent(width, height int) string {
	color := rateColor(r.successRate)
	rateStyle := lipgloss.NewStyle().
		Foreground(color).
		Bold(true)

	var formattedSuccessRate string
	if r.successRate == -1 {
		formattedSuccessRate = "--"
	} else {
		formattedSuccessRate = fmt.Sprintf("%.1f%%", r.successRate*100)
	}

	lines := []string{
		"",
		rateStyle.Render(formattedSuccessRate),
		"", // Placeholder for potential middle line, now the graph will take the last line
	}

	// Center content
	for i, line := range lines {
		if len(line) > 0 {
			displayWidth := lipgloss.Width(line)
			padding := (width - displayWidth) / 2
			if padding > 0 {
				lines[i] = strings.Repeat(" ", padding) + line
			}
		}
	}

	// Add the micro-histogram at the bottom.
	// Convert float64 success rates to int for `plot.MicroHistogram`
	// A scale of 100 for percentage might work, so 0.5 -> 50, 1.0 -> 100
	histogramBins := make([]int, len(r.successRatePerBucket))
	for i, rate := range r.successRatePerBucket {
		histogramBins[i] = int(rate * 100) // Scale to 0-100 for easier histogram plotting
	}

	// Create a temporary MicroHistogram instance for rendering
	// We need a dummy timestamps array for plot.NewMicroHistogram if it still requires it
	// If plot.MicroHistogram should only take []int, we can adjust its constructor
	// For now, let's create a dummy to make it compile with existing plot.NewMicroHistogram
	dummyTimestamps := make([]time.Time, len(histogramBins)) // Create dummy timestamps
	for i := range dummyTimestamps {
		dummyTimestamps[i] = time.Now().Add(time.Duration(i) * time.Hour) // Fill with distinct times
	}

	// If plot.MicroHistogram should only take []int, a new constructor/method would be better.
	// For now, let's use the existing constructor, providing our scaled bins indirectly.
	// A better design for `plot.MicroHistogram` would be to take `[]int` or `[]float64` directly
	// for `Render` when you don't need its internal time-bucketing.
	//
	// Given the current `plot.MicroHistogram` design, we need to pass timestamps.
	// The `plot.MicroHistogram` internally re-calculates bins.
	// This means we need to pass the *raw* timestamps and let `plot.MicroHistogram` do its job.
	//
	// So, we need to pass `r.timestamps` to `plot.NewMicroHistogram` but the data is `successRatePerBucket`.
	// This indicates a mismatch.
	//
	// Let's refine `plot.MicroHistogram` to accept `[]float64` for direct plotting.
	// If `plot.MicroHistogram` can't be easily changed, we'll need a different plotting function.
	//
	// Assuming you want `plot.MicroHistogram` to handle the *success rate values* directly,
	// rather than just counts of timestamps.
	//
	// ********** REVISION: **********
	// The `plot.MicroHistogram` is designed to take `[]time.Time` and bucket them.
	// For success rate, we have already calculated `successRatePerBucket` which are `float64`.
	// We need a histogram of *these values*.
	//
	// The `plot` package *also* has `NewUserMicroHistogram` which takes `UserEvent` and `bucketCount`.
	// Its `histogram` field is `[]int`.
	//
	// The most straightforward way to use the existing `plot.MicroHistogram` is to feed it `timestamps`
	// AND then use its `histogram` field (which is `[]int`) in a new rendering function that respects
	// the `successRatePerBucket` data.
	//
	// Alternatively, `plot.MicroHistogram` could be made more generic, or we make a new `plot.FloatMicroHistogram`.
	//
	// Given the constraints and the request to add *this* micro histogram:
	// We will create a `plot.MicroHistogram` from **scaled integer values** that represent the success rates.
	// We'll then use its `Render` method.

	// Convert `r.successRatePerBucket` (float64) to `[]int` for plot.MicroHistogram
	// Scale 0.0-1.0 to 0-100 (or any appropriate integer range)
	scaledSuccessRatesForPlot := make([]int, len(r.successRatePerBucket))
	for i, rate := range r.successRatePerBucket {
		scaledSuccessRatesForPlot[i] = int(rate * 100) // Scale 0-1 to 0-100
	}

	// Create a dummy set of timestamps for plot.NewMicroHistogram.
	// The `plot.MicroHistogram` logic will re-bucket these, but since we are
	// providing already bucketed data (via `scaledSuccessRatesForPlot`),
	// the internal bucketing needs to be overridden or bypassed.
	//
	// This is the tricky part: `plot.NewMicroHistogram` expects `[]time.Time` and *generates* buckets.
	// You already have the `successRatePerBucket` calculated.
	// So, we cannot directly use `plot.NewMicroHistogram` unless we modify it to take pre-bucketed data.
	//
	// Let's modify `plot.MicroHistogram` to have a `SetBins` method or a direct constructor
	// that takes `[]int` for situations like this.
	//
	// ********** TEMPORARY WORKAROUND IF `plot.MicroHistogram` CANNOT BE MODIFIED: **********
	// If you can't modify `plot.MicroHistogram` to accept `[]int` directly,
	// you would need to duplicate the Braille rendering logic for success rates.
	// This is undesirable.
	//
	// ********** ASSUMPTION: **********
	// I will assume `plot.MicroHistogram` can be modified.
	// Let's add a constructor `plot.NewMicroHistogramFromBins([]int)` or a setter.
	// The easiest is to make the `histogram` field public or add a method.
	// For this example, I'll modify `plot.MicroHistogram` in `plot/plot.go` to have a public `Histogram` field.
	//
	// ********** END ASSUMPTION **********

	// Create a `plot.MicroHistogram` instance directly with our calculated bins.
	// This requires `plot.MicroHistogram` to have a public `histogram` field or a dedicated constructor.
	// Assuming `plot.MicroHistogram` now has a public `Histogram` field.
	successRateHist := plot.NewMicroHistogramFromBins(histogramBins)

	// Render the Braille graph using the `plot` package's renderer
	microGraph := successRateHist.Render(width, color)
	lines = append(lines, microGraph)

	// Fill to height
	for len(lines) < height {
		lines = append(lines, "")
	}

	return strings.Join(lines[:height], "\n")
}