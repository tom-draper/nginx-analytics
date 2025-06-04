package cards

import (
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/charmbracelet/lipgloss"
	loc "github.com/tom-draper/nginx-analytics/cli/internal/logs/location"
	n "github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	p "github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

type LocationsCard struct {
	logs   []n.NGINXLog
	period p.Period

	calculated struct {
		locations loc.Locations
	}
}

// Bar characters from bottom to top (8ths)
var barChars = []string{
	" ", // 0/8 - empty
	"▁", // 1/8
	"▂", // 2/8
	"▃", // 3/8
	"▄", // 4/8 - half
	"▅", // 5/8
	"▆", // 6/8
	"▇", // 7/8
	"█", // 8/8 - full
}

func NewLocationsCard(logs []n.NGINXLog, period p.Period) *LocationsCard {
	card := &LocationsCard{logs: logs, period: period}
	card.updateCalculated()
	return card
}

func (r *LocationsCard) UpdateLogs(newLogs []n.NGINXLog, period p.Period) {
	r.logs = newLogs
	r.period = period
	r.updateCalculated()
}

func (r *LocationsCard) updateCalculated() {
	r.calculated.locations.UpdateLocations(r.logs)
}

func (r *LocationsCard) RenderContent(width, height int) string {
	if len(r.calculated.locations.Locations) == 0 || height < 2 {
		return r.renderEmptyState(width)
	}

	locations := r.calculated.locations.Locations
	totalLocations := len(locations)

	// Calculate how many bars we can fit (2 chars per bar: bar + space)
	maxBars := min(totalLocations, width/2)
	if maxBars == 0 {
		return r.renderEmptyState(width)
	}

	topLocations := locations[:maxBars]
	maxCount := r.getMaxCount(topLocations)

	// Reserve one row for labels
	chartHeight := max(height-1, 1)

	// Build the chart
	chart := r.buildChart(topLocations, maxCount, chartHeight, width)

	// Add labels
	labelLine := r.buildLabelLine(topLocations)
	chart = append(chart, labelLine)

	// Add count overlay on first line
	if len(chart) > 0 {
		chart[0] = r.addCountOverlay(chart[0], totalLocations, width)
	}

	// Ensure we have the right number of lines
	return r.padToHeight(chart, height)
}

func (r *LocationsCard) renderEmptyState(width int) string {
	faintStyle := lipgloss.NewStyle().Foreground(styles.LightGray)
	line := "No locations found"
	return r.centerText(line, width, faintStyle)
}

func (r *LocationsCard) centerText(text string, width int, style lipgloss.Style) string {
	displayWidth := lipgloss.Width(text)
	padding := (width - displayWidth) / 2
	if padding > 0 {
		text = strings.Repeat(" ", padding) + text
	}
	return "\n\n\n\n" + style.Render(text)
}

func (r *LocationsCard) getMaxCount(locations []loc.Location) int {
	if len(locations) == 0 {
		return 1
	}
	maxCount := locations[0].Count
	for _, loc := range locations {
		if loc.Count > maxCount {
			maxCount = loc.Count
		}
	}
	return maxCount
}

func (r *LocationsCard) buildChart(locations []loc.Location, maxCount, chartHeight, width int) []string {
	barStyle := lipgloss.NewStyle().Foreground(styles.Green)
	lines := make([]string, chartHeight)

	// Build chart from top to bottom
	for row := range chartHeight {
		line := ""
		for i, loc := range locations {
			if i > 0 {
				line += " " // Space between bars
			}

			// Calculate the target height for this bar (in eighths)
			targetHeightFloat := float64(loc.Count) / float64(maxCount) * float64(chartHeight) * 8
			targetHeight := int(targetHeightFloat)

			// Current position from bottom (in eighths)
			currentPosFromBottom := (chartHeight - 1 - row) * 8

			var char string
			if targetHeight > currentPosFromBottom+8 {
				// Full bar
				char = "█"
			} else if targetHeight > currentPosFromBottom {
				// Partial bar
				partial := min(targetHeight-currentPosFromBottom, 8)
				char = barChars[partial]
			} else {
				// Empty space
				char = " "
			}

			line += char
		}
		lines[row] = barStyle.Render(line)
	}

	return lines
}

func (r *LocationsCard) buildLabelLine(locations []loc.Location) string {
	labelLine := ""
	for _, l := range locations {
		// if i > 0 {
			// labelLine += " " // Space between labels to align with bars
		// }

		// Use first character of location, handling UTF-8 properly
		label := "  "
		if l.Location != "" {
			if firstRune, _ := utf8.DecodeRuneInString(l.Location); firstRune != utf8.RuneError {
				// label = string(firstRune)
				emoji, _ := loc.CountryCodeToEmoji(l.Location)
				label = emoji
			}
		}
		labelLine += label
	}
	return labelLine
}

func (r *LocationsCard) addCountOverlay(line string, totalLocations, width int) string {
	text := fmt.Sprintf("%d locations", totalLocations)
	return r.overlayRight(line, text, width)
}

func (r *LocationsCard) overlayRight(line, text string, maxWidth int) string {
	faintStyle := lipgloss.NewStyle().Foreground(styles.LightGray)

	lineDisplayWidth := len(line)
	textDisplayWidth := lipgloss.Width(text)

	// If the text is too wide, just return the original line
	if textDisplayWidth >= maxWidth {
		return line
	}

	// Calculate where to place the text
	targetStart := maxWidth - textDisplayWidth + 5

	// If the line is shorter than where we want to place the text, pad it
	if lineDisplayWidth < targetStart {
		padding := targetStart - lineDisplayWidth
		line += strings.Repeat(" ", padding)
	} else if lineDisplayWidth > targetStart {
		// Truncate the line to make room for the text
		// This is tricky with styled text, so we'll use a simpler approach
		truncateAt := targetStart
		if truncateAt > 0 {
			// Find a safe truncation point (avoiding cutting styled text)
			runes := []rune(line)
			if len(runes) > truncateAt {
				line = string(runes[:truncateAt])
			}
		}
	}

	return line + faintStyle.Render(text)
}

func (r *LocationsCard) padToHeight(lines []string, targetHeight int) string {
	// Ensure we have exactly the target height
	for len(lines) < targetHeight {
		lines = append(lines, "")
	}
	if len(lines) > targetHeight {
		lines = lines[:targetHeight]
	}

	return strings.Join(lines, "\n")
}

func (r *LocationsCard) GetTitle() string {
	return "Locations"
}
