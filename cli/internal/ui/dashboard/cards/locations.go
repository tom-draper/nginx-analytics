package cards

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	loc "github.com/tom-draper/nginx-analytics/cli/internal/logs/location"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard/plot"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

type LocationsCard struct {
	locations loc.Locations
	serverURL string
	authToken string
}

func NewLocationsCard(logs []nginx.NGINXLog, period period.Period, serverURL string, authToken string) *LocationsCard {
	card := &LocationsCard{serverURL: serverURL, authToken: authToken}
	card.UpdateCalculated(logs, period)
	return card
}

func (r *LocationsCard) UpdateCalculated(logs []nginx.NGINXLog, period period.Period) {
	r.locations.UpdateLocations(logs, r.serverURL, r.authToken)
}

func (r *LocationsCard) RenderContent(width, height int) string {
	if len(r.locations.Locations) == 0 || height < 2 {
		return r.renderEmptyState(width)
	}

	locations := r.locations.Locations
	totalLocations := len(locations)

	// Calculate how many bars we can fit
	// Each bar needs 2 chars, plus 1 space between bars (except the last one)
	// So for n bars: 2*n + (n-1) = 3*n - 1 characters needed
	// Solving for n: n = (width + 1) / 3
	maxBars := min(totalLocations, (width+1)/3)
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
				char = "██" // Two characters wide
			} else if targetHeight > currentPosFromBottom {
				// Partial bar
				partial := min(targetHeight-currentPosFromBottom, 8)
				char = plot.BarChars[partial] + plot.BarChars[partial] // Two characters wide
			} else {
				// Empty space
				char = "  " // Two spaces
			}

			line += char
		}
		lines[row] = barStyle.Render(line)
	}

	return lines
}

func (r *LocationsCard) buildLabelLine(locations []loc.Location) string {
	labelLine := ""
	for i, l := range locations {
		var displayStr string
		if len(l.Location) >= 2 {
			displayStr = l.Location[:2]
		} else if l.Location != "" {
			displayStr = l.Location + " "
		} else {
			displayStr = "??"
		}

		labelLine += displayStr

		if i < len(locations)-1 {
			labelLine += " "
		}
	}
	return labelLine
}

func (r *LocationsCard) addCountOverlay(line string, totalLocations, width int) string {
	text := fmt.Sprintf("%d locations", totalLocations)
	return r.overlayRight(line, text, width)
}

func (r *LocationsCard) overlayRight(line, text string, maxWidth int) string {
	faintStyle := lipgloss.NewStyle().Foreground(styles.LightGray)
	
	// Use lipgloss.Width for consistent display width calculations
	lineDisplayWidth := lipgloss.Width(line)
	textDisplayWidth := lipgloss.Width(text)
	
	// If the text is too wide, just return the original line
	if textDisplayWidth >= maxWidth {
		return line
	}
	
	// Calculate where to place the text
	targetStart := maxWidth - textDisplayWidth
	
	// If the line is shorter than where we want to place the text, pad it
	if lineDisplayWidth < targetStart {
		padding := targetStart - lineDisplayWidth
		line += strings.Repeat(" ", padding)
	} else if lineDisplayWidth > targetStart {
		// Truncate the line using lipgloss.Truncate to handle styled text properly
		line = lipgloss.NewStyle().Width(targetStart).Render(line)
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
