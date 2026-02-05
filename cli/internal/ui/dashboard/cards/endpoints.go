package cards

import (
	"fmt"
	"sort"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

type endpoint struct {
	path   string
	status int
	method string
	count  int
}

type endpointID struct {
	path   string
	method string
	status int
}

type EndpointsCard struct {
	endpoints     []endpoint
	drillMode     bool
	selectedIndex int
}

const maxEndpoints = 35 // Maximum number of endpoints to display

func NewEndpointsCard(logs []nginx.NGINXLog, period period.Period) *EndpointsCard {
	card := &EndpointsCard{}
	card.UpdateCalculated(logs, period)
	return card
}

func (p *EndpointsCard) RenderContent(width, height int) string {
	if len(p.endpoints) == 0 {
		faintStyle := lipgloss.NewStyle().
			Foreground(styles.LightGray).
			Bold(true)

		// Show empty message if no endpoints
		lines := []string{"", faintStyle.Render("No endpoints found")}

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

	// Sort endpoints by count (descending)
	sortedEndpoints := make([]endpoint, len(p.endpoints))
	copy(sortedEndpoints, p.endpoints)

	sort.Slice(sortedEndpoints, func(i, j int) bool {
		if sortedEndpoints[i].count != sortedEndpoints[j].count {
			return sortedEndpoints[i].count > sortedEndpoints[j].count
		}
		// Tie-breaker 1: path
		if sortedEndpoints[i].path != sortedEndpoints[j].path {
			return sortedEndpoints[i].path < sortedEndpoints[j].path
		}
		// Tie-breaker 2: method
		if sortedEndpoints[i].method != sortedEndpoints[j].method {
			return sortedEndpoints[i].method < sortedEndpoints[j].method
		}
		// Tie-breaker 3: status
		return sortedEndpoints[i].status < sortedEndpoints[j].status
	})

	// Find max count for scaling bars
	maxCount := sortedEndpoints[0].count

	var endpoints []endpoint
	if len(sortedEndpoints) > maxEndpoints {
		// Limit to maxEndpoints if more than allowed
		endpoints = sortedEndpoints[:maxEndpoints]
	} else {
		endpoints = sortedEndpoints
	}



	normalTextStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("15")) // White/default text

	// Style for selected row in drill mode
	selectedBarStyle := lipgloss.NewStyle().
		Background(lipgloss.Color("15")). // White
		Foreground(styles.Black).
		Bold(true)

	selectedTextStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("15")). // White
		Bold(true)

	var lines []string

	// Render each endpoint as a horizontal bar with overlaid text
	for i, ep := range endpoints {
		if i >= height {
			break // Don't exceed available height
		}

		isSelected := p.drillMode && i == p.selectedIndex

		// Calculate bar length proportional to count, using full width
		barLength := 0
		if maxCount > 0 {
			barLength = (ep.count * width) / maxCount
			if barLength == 0 && ep.count > 0 {
				barLength = 1 // Ensure non-zero counts show at least one bar
			}
		}

		// Create the text to overlay: "count path"
		var overlayText string
		if isSelected {
			prefix := fmt.Sprintf("> %d %s", ep.count, ep.path)
			suffix := fmt.Sprintf(" %d", ep.status)
			gap := width - len(prefix) - len(suffix)
			if gap >= 1 {
				overlayText = prefix + strings.Repeat(" ", gap) + suffix
			} else {
				// Not enough room for the status code, truncate the path
				maxPrefix := width - len(suffix) - 4 // 4 for "..."  + 1 space
				if maxPrefix > 0 {
					overlayText = prefix[:maxPrefix] + "..." + suffix
				} else {
					overlayText = prefix
				}
			}
		} else {
			overlayText = fmt.Sprintf("%d %s", ep.count, ep.path)
		}

		// Truncate overlay text if it's longer than the card width
		if len(overlayText) > width {
			if width > 3 {
				overlayText = overlayText[:width-3] + "..."
			} else {
				overlayText = overlayText[:width]
			}
		}

		var barStyle lipgloss.Style
		if isSelected {
			// Use highlight style for selected row
			barStyle = selectedBarStyle
		} else if ep.status >= 100 && ep.status <= 199 {
			barStyle = lipgloss.NewStyle().
				Background(styles.Cyan).
				Foreground(styles.Black)
		} else if ep.status >= 200 && ep.status <= 299 {
			barStyle = lipgloss.NewStyle().
				Background(styles.Green).
				Foreground(styles.Black)
		} else if ep.status >= 300 && ep.status <= 399 {
			barStyle = lipgloss.NewStyle().
				Background(styles.Blue).
				Foreground(styles.Black)
		} else if ep.status >= 400 && ep.status <= 499 {
			barStyle = lipgloss.NewStyle().
				Background(styles.Yellow).
				Foreground(styles.Black)
		} else if ep.status >= 500 && ep.status <= 599 {
			barStyle = lipgloss.NewStyle().
				Background(styles.Red).
				Foreground(styles.Black)
		} else {
			barStyle = lipgloss.NewStyle().
				Background(styles.Gray).
				Foreground(styles.Black)
		}

		// Build the line using lipgloss styles
		var lineParts []string

		// Use different text style for selected row
		textStyle := normalTextStyle
		if isSelected {
			textStyle = selectedTextStyle
		}

		for j := range width {
			if j < len(overlayText) {
				// Text character position
				char := string(overlayText[j])
				if j < barLength || isSelected {
					// Text over bar - use bar style (full width highlight when selected)
					lineParts = append(lineParts, barStyle.Render(char))
				} else {
					// Text over empty space - use normal text style
					lineParts = append(lineParts, textStyle.Render(char))
				}
			} else {
				// No text character at this position
				if j < barLength || isSelected {
					// Bar space (full width highlight when selected)
					lineParts = append(lineParts, barStyle.Render(" "))
				} else {
					// Empty space
					lineParts = append(lineParts, " ")
				}
			}
		}

		lines = append(lines, strings.Join(lineParts, ""))
	}

	// Fill remaining height with empty lines
	for len(lines) < height {
		lines = append(lines, "")
	}

	return strings.Join(lines[:height], "\n")
}

func (r *EndpointsCard) UpdateCalculated(logs []nginx.NGINXLog, period period.Period) {
	r.endpoints = getEndpoints(logs)
}

func getEndpoints(logs []nginx.NGINXLog) []endpoint {
	endpointMap := make(map[endpointID]int)

	for _, log := range logs {
		if log.Path == "" {
			continue
		}
		id := endpointID{
			path:   log.Path,
			method: log.Method,
			status: *log.Status,
		}
		endpointMap[id]++
	}

	var endpoints []endpoint
	for id, count := range endpointMap {
		endpoints = append(endpoints, endpoint{path: id.path, method: id.method, status: id.status, count: count})
	}

	return endpoints
}

func (r *EndpointsCard) GetRequiredHeight(width int) int {
	if len(r.endpoints) == 0 {
		return 3 // Minimum height for "No endpoints found" message
	}

	// Each endpoint needs one line, plus some padding
	return min(len(r.endpoints), maxEndpoints) // +2 for padding/borders
}

// DrillableCard interface implementation

func (r *EndpointsCard) EnterDrillMode() {
	r.drillMode = true
	r.selectedIndex = 0
}

func (r *EndpointsCard) ExitDrillMode() {
	r.drillMode = false
}

func (r *EndpointsCard) IsInDrillMode() bool {
	return r.drillMode
}

func (r *EndpointsCard) SelectUp() {
	if r.selectedIndex > 0 {
		r.selectedIndex--
	}
}

func (r *EndpointsCard) SelectDown() {
	maxIndex := min(len(r.endpoints), maxEndpoints) - 1
	if r.selectedIndex < maxIndex {
		r.selectedIndex++
	}
}

func (r *EndpointsCard) HasSelection() bool {
	return r.drillMode && r.selectedIndex >= 0 && r.selectedIndex < len(r.endpoints)
}

func (r *EndpointsCard) ClearSelection() {
	r.selectedIndex = 0
	r.drillMode = false
}

// GetSelectedEndpoint returns the currently selected endpoint filter, or nil if none selected
func (r *EndpointsCard) GetSelectedEndpoint() *EndpointFilter {
	if !r.HasSelection() {
		return nil
	}

	// Get sorted endpoints (same as in RenderContent)
	sortedEndpoints := make([]endpoint, len(r.endpoints))
	copy(sortedEndpoints, r.endpoints)

	sort.Slice(sortedEndpoints, func(i, j int) bool {
		if sortedEndpoints[i].count != sortedEndpoints[j].count {
			return sortedEndpoints[i].count > sortedEndpoints[j].count
		}
		if sortedEndpoints[i].path != sortedEndpoints[j].path {
			return sortedEndpoints[i].path < sortedEndpoints[j].path
		}
		if sortedEndpoints[i].method != sortedEndpoints[j].method {
			return sortedEndpoints[i].method < sortedEndpoints[j].method
		}
		return sortedEndpoints[i].status < sortedEndpoints[j].status
	})

	if r.selectedIndex >= len(sortedEndpoints) {
		return nil
	}

	ep := sortedEndpoints[r.selectedIndex]
	return &EndpointFilter{
		Path:   ep.path,
		Method: ep.method,
		Status: ep.status,
	}
}
