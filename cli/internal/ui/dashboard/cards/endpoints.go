package cards

import (
	"fmt"
	"sort"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/logger"
	n "github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	p "github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
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
	logs   []n.NGINXLog // Reference to log entries
	period p.Period

	calculated struct {
		endpoints []endpoint
	}
}

const maxEndpoints = 35 // Maximum number of endpoints to display

func NewEndpointsCard(logs []n.NGINXLog, period p.Period) *EndpointsCard {
	card := &EndpointsCard{logs: logs, period: period}

	card.updateCalculated()
	return card
}

func (p *EndpointsCard) RenderContent(width, height int) string {
	logger.Log.Println(p.calculated.endpoints)
	if len(p.calculated.endpoints) == 0 {
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
	sortedEndpoints := make([]endpoint, len(p.calculated.endpoints))
	copy(sortedEndpoints, p.calculated.endpoints)

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
		logger.Log.Println("Limiting endpoints to max:", maxEndpoints)
		endpoints = sortedEndpoints[:maxEndpoints]
	} else {
		endpoints = sortedEndpoints
	}

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

		// Build the line with green background bars and black text overlay
		var line strings.Builder

		for j := range width {
			if j < len(overlayText) {
				// Text character position
				if j < barLength {
					// Text over green bar - black text on green background
					line.WriteString(fmt.Sprintf("\033[30;42m%c\033[0m", overlayText[j]))
				} else {
					// Text over empty space - normal text
					line.WriteString(fmt.Sprintf("%c", overlayText[j]))
				}
			} else {
				// No text character at this position
				if j < barLength {
					// Green bar space
					line.WriteString("\033[42m \033[0m")
				} else {
					// Empty space
					line.WriteString(" ")
				}
			}
		}

		lines = append(lines, line.String())
	}

	// Fill remaining height with empty lines
	for len(lines) < height {
		lines = append(lines, "")
	}

	return strings.Join(lines[:height], "\n")
}

func (p *EndpointsCard) GetTitle() string {
	return "Endpoints"
}

// UpdateLogs should be called when the log slice content changes
func (r *EndpointsCard) UpdateLogs(newLogs []n.NGINXLog, period p.Period) {
	r.logs = newLogs
	r.period = period
	r.updateCalculated()
}

func (r *EndpointsCard) updateCalculated() {
	endpoints := getEndpoints(r.logs)
	r.calculated.endpoints = endpoints
}

func getEndpoints(logs []n.NGINXLog) []endpoint {
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

	logger.Log.Println("Found endpoints:", len(endpointMap))

	var endpoints []endpoint
	for id, count := range endpointMap {
		endpoints = append(endpoints, endpoint{path: id.path, method: id.method, status: id.status, count: count})
	}

	return endpoints
}

func (r *EndpointsCard) GetRequiredHeight(width int) int {
	if len(r.calculated.endpoints) == 0 {
		return 3 // Minimum height for "No endpoints found" message
	}

	// Each endpoint needs one line, plus some padding
	return min(len(r.calculated.endpoints), maxEndpoints) // +2 for padding/borders
}
