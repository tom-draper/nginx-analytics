package cards

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	n "github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	p "github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

// RequestsCard displays request count and rate
type RequestsCard struct {
	count int     // Total request count (cached)
	rate  float64 // Requests per hour (cached)
}

func NewRequestsCard(logs []n.NGINXLog, period p.Period) *RequestsCard {
	card := &RequestsCard{}
	card.UpdateCalculated(logs, period)
	return card
}

// updateCalculated recalculates Count and Rate only if logs have changed
func (r *RequestsCard) UpdateCalculated(logs []n.NGINXLog, period p.Period) {
	r.count = len(logs)
	r.rate = float64(r.count) / float64(p.LogRangePeriodHours(logs, period))
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
		"",
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

	// Fill to height
	for len(lines) < height {
		lines = append(lines, "")
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

func (r *RequestsCard) GetTitle() string {
	return "Requests"
}
