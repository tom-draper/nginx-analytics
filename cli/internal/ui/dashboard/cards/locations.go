package cards

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/location"
	n "github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	p "github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

type LocationsCard struct {
	logs   []n.NGINXLog // Reference to log entries
	period p.Period

	calculated struct {
		locations location.Locations
	}
}

func NewLocationsCard(logs []n.NGINXLog, period p.Period) *LocationsCard {
	card := &LocationsCard{logs: logs, period: period}

	// Initial calculation
	card.updateCalculated()
	return card
}

// UpdateLogs should be called when the log slice content changes
func (r *LocationsCard) UpdateLogs(newLogs []n.NGINXLog, period p.Period) {
	r.logs = newLogs
	r.period = period
	r.updateCalculated()
}

// updateCalculated recalculates Count and Rate only if logs have changed
func (r *LocationsCard) updateCalculated() {
	r.calculated.locations.UpdateLocations(r.logs)
}

func (r *LocationsCard) RenderContent(width, height int) string {
	if len(r.calculated.locations.Locations) == 0 || height < 2 {
		return ""
	}

	locations := r.calculated.locations.Locations
	totalLocations := len(locations)

	maxBars := min(totalLocations, (width+1)/2)
	topLocations := locations[:maxBars]

	maxCount := topLocations[0].Count
	for _, loc := range topLocations {
		if loc.Count > maxCount {
			maxCount = loc.Count
		}
	}

	// One row reserved for labels at the bottom
	chartHeight := max(height-1, 1)

	// Build vertical bars
	bars := make([]string, maxBars)
	for i, loc := range topLocations {
		barHeight := int(float64(loc.Count) / float64(maxCount) * float64(chartHeight))
		bars[i] = strings.Repeat("█", barHeight)
	}

	barStyle := lipgloss.NewStyle().Foreground(styles.Green)

	// Build bar chart from top to bottom (tallest bar reaches row 0)
	lines := make([]string, chartHeight)
	for row := chartHeight - 1; row >= 0; row-- {
		line := ""
		for _, bar := range bars {
			if len(bar) > row {
				line += "█ "
			} else {
				line += "  "
			}
		}
		lines[chartHeight-1-row] = barStyle.Render(line)
	}

	// Label line (e.g., country flag or first letter)
	labelLine := ""
	for _, loc := range topLocations {
		label := string([]rune(loc.Location)[0])
		labelLine += label + " "
	}
	lines = append(lines, labelLine)

	// Overlay "X locations" right-aligned on the first row (top of chart)
	lines[0] = overwriteRight(lines[0], fmt.Sprintf("%d locations", totalLocations), width)

	// Pad if needed
	for len(lines) < height {
		lines = append(lines, "")
	}

	return strings.Join(lines[:height], "\n")
}

func overwriteRight(line, text string, width int) string {
	padding := width - lipgloss.Width(text)
	if padding < 0 {
		return text
	}
	if len(line) > padding {
		return line[:padding] + text
	}
	return strings.Repeat(" ", padding) + text
}

func (p *LocationsCard) GetTitle() string {
	return "Locations"
}
