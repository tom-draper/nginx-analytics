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
	locations     loc.Locations
	serverURL     string
	drillMode     bool
	selectedIndex int
}

func NewLocationsCard(logs []nginx.NGINXLog, period period.Period, serverURL string) *LocationsCard {
	card := &LocationsCard{serverURL: serverURL}
	card.UpdateCalculated(logs, period)
	return card
}

func (r *LocationsCard) UpdateCalculated(logs []nginx.NGINXLog, period period.Period) {
	r.locations.UpdateLocations(logs, r.serverURL)
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
	selectedBarStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("15")).Bold(true)
	lines := make([]string, chartHeight)

	// Build chart from top to bottom
	for row := range chartHeight {
		line := ""
		for i, loc := range locations {
			if i > 0 {
				line += " " // Space between bars
			}

			isSelected := r.drillMode && i == r.selectedIndex

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

			if isSelected {
				line += selectedBarStyle.Render(char)
			} else {
				line += barStyle.Render(char)
			}
		}
		lines[row] = line
	}

	return lines
}

func (r *LocationsCard) buildLabelLine(locations []loc.Location) string {
	normalStyle := lipgloss.NewStyle()
	selectedStyle := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("15"))

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

		isSelected := r.drillMode && i == r.selectedIndex

		// Add separator or selection indicator between bars
		if i > 0 {
			if isSelected {
				labelLine += selectedStyle.Render(">")
			} else {
				labelLine += " "
			}
		}

		if isSelected {
			labelLine += selectedStyle.Render(displayStr)
		} else {
			labelLine += normalStyle.Render(displayStr)
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

// DrillableCard interface implementation

func (r *LocationsCard) EnterDrillMode() {
	r.drillMode = true
	r.selectedIndex = 0
}

func (r *LocationsCard) ExitDrillMode() {
	r.drillMode = false
}

func (r *LocationsCard) IsInDrillMode() bool {
	return r.drillMode
}

func (r *LocationsCard) SelectUp() {
	// For locations, left/right makes more sense, but up can work as left
	if r.selectedIndex > 0 {
		r.selectedIndex--
	}
}

func (r *LocationsCard) SelectDown() {
	// For locations, left/right makes more sense, but down can work as right
	maxIndex := len(r.locations.Locations) - 1
	if r.selectedIndex < maxIndex {
		r.selectedIndex++
	}
}

func (r *LocationsCard) HasSelection() bool {
	return r.drillMode && r.selectedIndex >= 0 && r.selectedIndex < len(r.locations.Locations)
}

func (r *LocationsCard) ClearSelection() {
	r.selectedIndex = 0
	r.drillMode = false
}

// GetSelectedLocation returns the currently selected location filter
func (r *LocationsCard) GetSelectedLocation() *LocationFilter {
	if !r.HasSelection() {
		return nil
	}

	if r.selectedIndex >= len(r.locations.Locations) {
		return nil
	}

	return &LocationFilter{
		Location: r.locations.Locations[r.selectedIndex].Location,
	}
}

// GetLocationLookup returns the location lookup function for filtering
func (r *LocationsCard) GetLocationLookup() func(string) string {
	return r.locations.GetLocationForIP
}
