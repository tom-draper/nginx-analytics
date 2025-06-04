package cards

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/guptarohit/asciigraph"
	"github.com/tom-draper/nginx-analytics/cli/internal/logger"
	n "github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	p "github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	u "github.com/tom-draper/nginx-analytics/cli/internal/logs/user"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

type ActivityCard struct {
	requests    []point[int]
	users       []point[int]
	successRate []point[float64]
}

func NewActivityCard(logs []n.NGINXLog, period p.Period) *ActivityCard {
	card := &ActivityCard{}
	card.UpdateCalculated(logs, period)
	return card
}

func (p *ActivityCard) RenderContent(width, height int) string {
	if len(p.requests) == 0 {
		faintStyle := lipgloss.NewStyle().Foreground(styles.LightGray)
		lines := []string{
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			faintStyle.Render("No activity data available"),
		}

		// Center content (use usableWidth for centering)
		usableWidth := width - 2
		for i, line := range lines {
			if len(line) > 0 {
				displayWidth := lipgloss.Width(line)
				padding := (usableWidth - displayWidth) / 2
				if padding > 0 {
					lines[i] = strings.Repeat(" ", padding) + line
				}
			}
		}

		// Fill to height
		for len(lines) < height {
			lines = append(lines, "")
		}

		return strings.Join(lines[:height], "\n")
	}

	// Sort requests by timestamp
	sortedRequests := make([]point[int], len(p.requests))
	copy(sortedRequests, p.requests)
	sort.Slice(sortedRequests, func(i, j int) bool {
		return sortedRequests[i].timestamp.Before(sortedRequests[j].timestamp)
	})

	// Extract data for chart
	data := make([]float64, len(sortedRequests))
	for i, req := range sortedRequests {
		data[i] = float64(req.value)
	}

	// Calculate chart dimensions (be very conservative with width)
	// Width includes borders, so usable width is width - 2
	usableWidth := width - 2
	chartHeight := max(height-2, 3)
	// Be very conservative with chart width - asciigraph seems to exceed the specified width
	chartWidth := max(usableWidth-8, 15)

	// Generate ASCII chart without caption to save space
	chart := asciigraph.Plot(data,
		asciigraph.Height(chartHeight),
		asciigraph.Width(chartWidth))

	logger.Log.Println(chart)

	// Split chart into lines and aggressively truncate
	chartLines := strings.Split(chart, "\n")

	// Aggressively truncate lines that are too long
	maxLineWidth := usableWidth - 2 // Leave some margin
	logger.Log.Println("max liene width", maxLineWidth)
	for i, line := range chartLines {
		logger.Log.Println("width", len(line), lipgloss.Width(line))
		logger.Log.Println(line)

		if lipgloss.Width(line) > maxLineWidth {
			chartLines[i] = line[:maxLineWidth]
		}
	}

	// Add chart lines with empty line at top for padding
	lines := []string{}
	lines = append(lines, chartLines...)

	// Add time range info if we have data (very compact)
	if len(sortedRequests) > 0 {
		timeRange := fmt.Sprintf("%s→%s",
			sortedRequests[0].timestamp.Format("15:04"),
			sortedRequests[len(sortedRequests)-1].timestamp.Format("15:04"))
		// Ensure time range fits within our width constraints
		if len(timeRange) > maxLineWidth {
			timeRange = timeRange[:maxLineWidth]
		}
		lines = append(lines, timeRange)
	}

	// Center all lines (use usableWidth for centering)
	// for i, line := range lines {
	// 	if len(line) > 0 {
	// 		displayWidth := lipgloss.Width(line)
	// 		padding := (usableWidth - displayWidth) / 2
	// 		if padding > 0 {
	// 			lines[i] = strings.Repeat(" ", padding) + line
	// 		}
	// 	}
	// }

	// Fill to height or trim if necessary
	for len(lines) < height {
		lines = append(lines, "")
	}
	if len(lines) > height {
		lines = lines[:height]
	}

	return strings.Join(lines, "\n")
}

func (p *ActivityCard) GetTitle() string {
	return "Activity"
}

func (r *ActivityCard) UpdateCalculated(logs []n.NGINXLog, period p.Period) {
	r.requests = getRequests(logs, period)
}

type point[T ~int | ~float32 | ~float64] struct {
	timestamp time.Time
	value     T
}

func getRequests(logs []n.NGINXLog, period p.Period) []point[int] {
	requestBuckets := make(map[time.Time]int, 0)
	for _, log := range logs {
		timeBucket := nearestHour(*log.Timestamp)
		requestBuckets[timeBucket]++
	}

	requests := make([]point[int], 0)
	for timestamp, count := range requestBuckets {
		requests = append(requests, point[int]{value: count, timestamp: timestamp})
	}

	return requests
}

func getUsers(logs []n.NGINXLog, period p.Period) []point[int] {
	userBuckets := make(map[time.Time]map[string]struct{}, 0)
	for _, log := range logs {
		timeBucket := nearestHour(*log.Timestamp)
		userID := u.UserID(log)
		userBuckets[timeBucket][userID] = struct{}{}
	}

	users := make([]point[int], 0)
	for timestamp, unique := range userBuckets {
		count := len(unique)
		users = append(users, point[int]{value: count, timestamp: timestamp})
	}

	return users
}

func getSuccessRates(logs []n.NGINXLog, period p.Period) []point[float64] {
	successRateBuckets := make(map[time.Time]struct {
		success int
		total   int
	})

	for _, log := range logs {
		t := nearestHour(*log.Timestamp)
		bucket := successRateBuckets[t]

		success := *log.Status >= 200 && *log.Status < 400
		if success {
			bucket.success++
		}
		bucket.total++

		successRateBuckets[t] = bucket
	}

	successRates := make([]point[float64], 0, len(successRateBuckets))
	for timestamp, counts := range successRateBuckets {
		rate := 0.0
		if counts.total > 0 {
			rate = float64(counts.success) / float64(counts.total)
		}
		successRates = append(successRates, point[float64]{
			timestamp: timestamp,
			value:     rate,
		})
	}

	return successRates
}

func nearestHour(timestamp time.Time) time.Time {
	return timestamp.Truncate(time.Hour)
}
