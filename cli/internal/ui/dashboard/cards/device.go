package cards

import (
	"fmt"
	"sort"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/useragent"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

type client struct {
	name  string
	count int
}

type DeviceCard struct {
	detector useragent.UserAgentDetector
	clients  map[string]int
}

const maxClients = 35 // Maximum number of clients to display

func NewDeviceCard(logs []nginx.NGINXLog, period period.Period) *DeviceCard {
	card := &DeviceCard{detector: *useragent.NewUserAgentDetector()}
	card.UpdateCalculated(logs, period)
	return card
}

func (p *DeviceCard) RenderContent(width, height int) string {
	if len(p.clients) == 0 {
		faintStyle := lipgloss.NewStyle().
			Foreground(styles.LightGray).
			Bold(true)

		// Show empty message if no clients
		lines := []string{"", faintStyle.Render("No clients found")}

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

	// Convert map to slice and sort by count (descending)
	var sortedClients []client
	for name, count := range p.clients {
		sortedClients = append(sortedClients, client{name: name, count: count})
	}

	sort.Slice(sortedClients, func(i, j int) bool {
		if sortedClients[i].count != sortedClients[j].count {
			return sortedClients[i].count > sortedClients[j].count
		}
		// Tie-breaker: client name
		return sortedClients[i].name < sortedClients[j].name
	})

	// Find max count for scaling bars
	maxCount := sortedClients[0].count

	var clients []client
	if len(sortedClients) > maxClients {
		// Limit to maxClients if more than allowed
		clients = sortedClients[:maxClients]
	} else {
		clients = sortedClients
	}

	normalTextStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("15")) // White/default text

	// Define bar style (using blue for devices/clients)
	barStyle := lipgloss.NewStyle().
		Background(styles.Green).   // Blue background
		Foreground(styles.Black)   // Black text

	var lines []string

	// Render each client as a horizontal bar with overlaid text
	for i, cl := range clients {
		if i >= height {
			break // Don't exceed available height
		}

		// Calculate bar length proportional to count, using full width
		barLength := 0
		if maxCount > 0 {
			barLength = (cl.count * width) / maxCount
			if barLength == 0 && cl.count > 0 {
				barLength = 1 // Ensure non-zero counts show at least one bar
			}
		}

		// Create the text to overlay: "count client_name"
		overlayText := fmt.Sprintf("%d %s", cl.count, cl.name)

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
					// Text over blue bar - use bar style
					lineParts = append(lineParts, barStyle.Render(char))
				} else {
					// Text over empty space - use normal text style
					lineParts = append(lineParts, normalTextStyle.Render(char))
				}
			} else {
				// No text character at this position
				if j < barLength {
					// Blue bar space
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

func (c *DeviceCard) UpdateCalculated(logs []nginx.NGINXLog, period period.Period) {
	c.clients = c.getClients(logs)
}

func (c *DeviceCard) getClients(logs []nginx.NGINXLog) map[string]int {
	clients := make(map[string]int)
	for _, log := range logs {
		v := c.detector.GetClient(log.Path)
		if v != "" {
			clients[v]++
		}
	}
	return clients
}

func (c *DeviceCard) GetRequiredHeight(width int) int {
	if len(c.clients) == 0 {
		return 3 // Minimum height for "No clients found" message
	}

	// Each client needs one line
	return min(len(c.clients), maxClients)
}