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
	sorted        []endpoint
	selectMode     bool
	selectedIndex int
}

const maxEndpoints = 35 // Maximum number of endpoints to display

func NewEndpointsCard(logs []nginx.NGINXLog, period period.Period) *EndpointsCard {
	card := &EndpointsCard{}
	card.UpdateCalculated(logs, period)
	return card
}

func (p *EndpointsCard) RenderContent(width, height int) string {
	if len(p.sorted) == 0 {
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

	endpoints := p.sorted

	// Find max count for scaling bars
	maxCount := endpoints[0].count



	normalTextStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("15")) // White/default text

	// Style for selected row in select mode
	selectedBarStyle := lipgloss.NewStyle().
		Background(lipgloss.Color("15")). // White
		Foreground(styles.Black).
		Bold(true)

	selectedTextStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("15")). // White
		Bold(true)

	var buf strings.Builder

	// Render each endpoint as a horizontal bar with overlaid text
	for i, ep := range endpoints {
		if i >= height {
			break // Don't exceed available height
		}

		if i > 0 {
			buf.WriteByte('\n')
		}

		isSelected := p.selectMode && i == p.selectedIndex

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

		textStyle := normalTextStyle
		if isSelected {
			textStyle = selectedTextStyle
		}

		for j := range width {
			if j < len(overlayText) {
				char := overlayText[j : j+1]
				if j < barLength || isSelected {
					buf.WriteString(barStyle.Render(char))
				} else {
					buf.WriteString(textStyle.Render(char))
				}
			} else {
				if j < barLength || isSelected {
					buf.WriteString(barStyle.Render(" "))
				} else {
					buf.WriteByte(' ')
				}
			}
		}
	}

	// Fill remaining height with empty lines
	for i := min(len(endpoints), height); i < height; i++ {
		buf.WriteByte('\n')
	}

	return buf.String()
}

func (r *EndpointsCard) UpdateCalculated(logs []nginx.NGINXLog, period period.Period) {
	r.endpoints = getEndpoints(logs)
	r.sorted = r.sortEndpoints()
}

func (r *EndpointsCard) sortEndpoints() []endpoint {
	sorted := make([]endpoint, len(r.endpoints))
	copy(sorted, r.endpoints)
	sort.Slice(sorted, func(i, j int) bool {
		if sorted[i].count != sorted[j].count {
			return sorted[i].count > sorted[j].count
		}
		if sorted[i].path != sorted[j].path {
			return sorted[i].path < sorted[j].path
		}
		if sorted[i].method != sorted[j].method {
			return sorted[i].method < sorted[j].method
		}
		return sorted[i].status < sorted[j].status
	})
	if len(sorted) > maxEndpoints {
		sorted = sorted[:maxEndpoints]
	}
	return sorted
}

func getEndpoints(logs []nginx.NGINXLog) []endpoint {
	endpointMap := make(map[endpointID]int)

	for _, log := range logs {
		if log.Path == "" || log.Status == nil {
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
	if len(r.sorted) == 0 {
		return 3 // Minimum height for "No endpoints found" message
	}

	// Each endpoint needs one line
	return len(r.sorted)
}

// SelectableCard interface implementation

func (r *EndpointsCard) EnterSelectMode() {
	r.selectMode = true
	r.selectedIndex = 0
}

func (r *EndpointsCard) ExitSelectMode() {
	r.selectMode = false
}

func (r *EndpointsCard) IsInSelectMode() bool {
	return r.selectMode
}

func (r *EndpointsCard) SelectUp() {
	if r.selectedIndex > 0 {
		r.selectedIndex--
	}
}

func (r *EndpointsCard) SelectDown() {
	if r.selectedIndex < len(r.sorted)-1 {
		r.selectedIndex++
	}
}

func (r *EndpointsCard) SelectLeft() {
	// No-op for endpoints card - uses up/down navigation
}

func (r *EndpointsCard) SelectRight() {
	// No-op for endpoints card - uses up/down navigation
}

func (r *EndpointsCard) HasSelection() bool {
	_, ok := selectedItem(r.selectMode, r.selectedIndex, r.sorted)
	return ok
}

func (r *EndpointsCard) ClearSelection() {
	r.selectedIndex = 0
	r.selectMode = false
}

// GetSelectedEndpoint returns the currently selected endpoint filter, or nil if none selected
func (r *EndpointsCard) GetSelectedEndpoint() *EndpointFilter {
	ep, ok := selectedItem(r.selectMode, r.selectedIndex, r.sorted)
	if !ok {
		return nil
	}
	return &EndpointFilter{
		Path:   ep.path,
		Method: ep.method,
		Status: ep.status,
	}
}
