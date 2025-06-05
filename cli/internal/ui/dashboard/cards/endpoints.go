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
	endpoints []endpoint
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

	// Define lipgloss styles for the bars
	barStyle := lipgloss.NewStyle().
		Background(styles.Green). // Green background
		Foreground(styles.Black)  // Black text

	normalTextStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("15")) // White/default text

	var lines []string

	// Render each endpoint as a horizontal bar with overlaid text
	for i, ep := range endpoints {
		if i >= height {
			break // Don't exceed available height
		}

		// Calculate bar length proportional to count, using full width
		barLength := 0
		if maxCount > 0 {
			barLength = (ep.count * width) / maxCount
			if barLength == 0 && ep.count > 0 {
				barLength = 1 // Ensure non-zero counts show at least one bar
			}
		}

		// Create the text to overlay: "count path"
		overlayText := fmt.Sprintf("%d %s", ep.count, ep.path)

		// Truncate overlay text if it's longer than the card width
		if len(overlayText) > width {
			if width > 3 {
				overlayText = overlayText[:width-3] + "..."
			} else {
				overlayText = overlayText[:width]
			}
		}

		// Build the line using lipgloss styles
		var lineParts []string

		for j := range width {
			if j < len(overlayText) {
				// Text character position
				char := string(overlayText[j])
				if j < barLength {
					// Text over green bar - use bar style
					lineParts = append(lineParts, barStyle.Render(char))
				} else {
					// Text over empty space - use normal text style
					lineParts = append(lineParts, normalTextStyle.Render(char))
				}
			} else {
				// No text character at this position
				if j < barLength {
					// Green bar space
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
