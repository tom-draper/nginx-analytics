package cards

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/logger"
	n "github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	p "github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/user"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard/plot"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

// RequestsCard displays request count and rate
type UsersCard struct {
	count     int     // Total request count (cached)
	rate      float64 // Requests per hour (cached)
	histogram plot.MicroHistogram
}

func NewUsersCard(logs []n.NGINXLog, period p.Period) *UsersCard {
	card := &UsersCard{}
	card.UpdateCalculated(logs, period)
	return card
}

func (r *UsersCard) UpdateCalculated(logs []n.NGINXLog, period p.Period) {
	r.count = userCount(logs)
	r.rate = float64(r.count) / float64(p.LogRangePeriodHours(logs, period))
	timestamps := getUserEvents(logs)
	r.histogram = plot.NewUserMicroHistogram(timestamps, 50) // Use default width, will be scaled in render
	logger.Log.Println(r.histogram)
}

func getUserEvents(logs []n.NGINXLog) []plot.UserEvent {
	events := make([]plot.UserEvent, 0)
	for _, log := range logs {
		if log.Timestamp.IsZero() {
			continue
		}
		userID := user.UserID(log)
		events = append(events, plot.UserEvent{Timestamp: *log.Timestamp, UserID: userID})
	}

	return events
}

func userCount(logs []n.NGINXLog) int {
	userSet := make(map[string]struct{})
	for _, log := range logs {
		userID := user.UserID(log)
		userSet[userID] = struct{}{}
	}
	return len(userSet)
}

func (r *UsersCard) RenderContent(width, height int) string {
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

func (r *UsersCard) formatCount() string {
	if r.count >= 1000000 {
		return fmt.Sprintf("%.1fM", float64(r.count)/1000000)
	} else if r.count >= 1000 {
		return fmt.Sprintf("%.1fK", float64(r.count)/1000)
	}
	return fmt.Sprintf("%d", r.count)
}
