package cards

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/logger"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	p "github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard/plot"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

// RequestsCard displays request count and rate
type RequestsCard struct {
	count     int                 // Total request count (cached)
	rate      float64             // Requests per hour (cached)
	histogram plot.MicroHistogram // Request counts per time bucket (cached)
}

func NewRequestsCard(logs []nginx.NGINXLog, period p.Period) *RequestsCard {
	card := &RequestsCard{}
	card.UpdateCalculated(logs, period)
	return card
}

// updateCalculated recalculates Count, Rate, and Histogram only if logs have changed
func (r *RequestsCard) UpdateCalculated(logs []nginx.NGINXLog, period p.Period) {
	r.count = len(logs)
	r.rate = float64(r.count) / float64(p.LogRangePeriodHours(logs, period))
	timestamps := getTimestamps(logs)
	r.histogram = plot.NewMicroHistogram(timestamps, 50) // Use default width, will be scaled in render
	logger.Log.Println(r.histogram)
}

func getTimestamps(logs []nginx.NGINXLog) []time.Time {
	timestamps := make([]time.Time, 0)
	for _, log := range logs {
		timestamps = append(timestamps, *log.Timestamp)
	}

	return timestamps
}

func (r *RequestsCard) RenderContent(width, height int) string {
	countStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#ffffff")).
		Bold(true)

	rateStyle := lipgloss.NewStyle().
		Foreground(styles.LightGray)

	lines := []string{
		"",
		countStyle.Render(r.formatCount()),
		rateStyle.Render(fmt.Sprintf("%.1f/h", r.rate)),
	}

	// Center content (except histogram)
	for i, line := range lines {
		if len(line) > 0 {
			displayWidth := lipgloss.Width(line)
			padding := (width - displayWidth) / 2
			if padding > 0 {
				lines[i] = strings.Repeat(" ", padding) + line
			}
		}
	}

	// Add histogram at the bottom
	if height > len(lines) {
		// Fill remaining space except last row for histogram
		for len(lines) < height-1 {
			lines = append(lines, "")
		}
		// Add histogram as last row
		lines = append(lines, r.histogram.Render(width))
	} else {
		// Fill to height
		for len(lines) < height {
			lines = append(lines, "")
		}
	}

	return strings.Join(lines[:height], "\n")
}

func (r *RequestsCard) formatCount() string {
	if r.count >= 1000000 {
		return fmt.Sprintf("%.1fM", float64(r.count)/1000000)
	} else if r.count >= 1000 {
		return fmt.Sprintf("%.1fK", float64(r.count)/1000)
	}
	return fmt.Sprintf("%d", r.count)
}

// min helper function (for Go versions < 1.21)
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
