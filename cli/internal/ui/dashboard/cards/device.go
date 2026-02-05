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

type DeviceMode int

const (
	ModeClient DeviceMode = iota
	ModeOS
	ModeDevice
)

type DeviceCard struct {
	detector      useragent.UserAgentDetector
	clients       map[string]int
	selectMode     bool
	selectedIndex int
	mode          DeviceMode
	logs          []nginx.NGINXLog
}

const maxClients = 35 // Maximum number of clients to display

func NewDeviceCard(logs []nginx.NGINXLog, period period.Period) *DeviceCard {
	card := &DeviceCard{detector: *useragent.NewUserAgentDetector(), mode: ModeClient}
	card.UpdateCalculated(logs, period)
	return card
}

func (p *DeviceCard) RenderContent(width, height int) string {
	if len(p.clients) == 0 {
		faintStyle := lipgloss.NewStyle().
			Foreground(styles.LightGray).
			Bold(true)

		// Show empty message if no clients
		lines := []string{"", "", "", "", faintStyle.Render("No clients found")}

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

	barStyle := lipgloss.NewStyle().
		Background(styles.Green).
		Foreground(styles.Black)

	selectedBarStyle := lipgloss.NewStyle().
		Background(lipgloss.Color("15")).
		Foreground(styles.Black).
		Bold(true)

	selectedTextStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("15")).
		Bold(true)

	var lines []string

	// Render each client as a horizontal bar with overlaid text
	for i, cl := range clients {
		if i >= height {
			break // Don't exceed available height
		}

		isSelected := p.selectMode && i == p.selectedIndex

		// Calculate bar length proportional to count, using full width
		barLength := 0
		if maxCount > 0 {
			barLength = (cl.count * width) / maxCount
			if barLength == 0 && cl.count > 0 {
				barLength = 1 // Ensure non-zero counts show at least one bar
			}
		}

		// Create the text to overlay: "count client_name"
		var overlayText string
		if isSelected {
			overlayText = fmt.Sprintf("> %d %s", cl.count, cl.name)
		} else {
			overlayText = fmt.Sprintf("%d %s", cl.count, cl.name)
		}

		// Truncate overlay text if it's longer than the card width
		if len(overlayText) > width {
			if width > 3 {
				overlayText = overlayText[:width-3] + "..."
			} else {
				overlayText = overlayText[:width]
			}
		}

		currentBarStyle := barStyle
		textStyle := normalTextStyle
		if isSelected {
			currentBarStyle = selectedBarStyle
			textStyle = selectedTextStyle
		}

		// Build the line using lipgloss styles
		var lineParts []string

		for j := range width {
			if j < len(overlayText) {
				// Text character position
				char := string(overlayText[j])
				if j < barLength || isSelected {
					lineParts = append(lineParts, currentBarStyle.Render(char))
				} else {
					lineParts = append(lineParts, textStyle.Render(char))
				}
			} else {
				// No text character at this position
				if j < barLength || isSelected {
					lineParts = append(lineParts, currentBarStyle.Render(" "))
				} else {
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
	c.logs = logs
	c.clients = c.getClients(logs)
}

func (c *DeviceCard) getClients(logs []nginx.NGINXLog) map[string]int {
	clients := make(map[string]int)
	for _, log := range logs {
		var v string
		switch c.mode {
		case ModeOS:
			v = c.detector.GetOS(log.UserAgent)
		case ModeDevice:
			v = c.detector.GetDevice(log.UserAgent)
		default:
			v = c.detector.GetClient(log.UserAgent)
		}
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

// SelectableCard interface implementation

func (c *DeviceCard) EnterSelectMode() {
	c.selectMode = true
	c.selectedIndex = 0
}

func (c *DeviceCard) ExitSelectMode() {
	c.selectMode = false
}

func (c *DeviceCard) IsInSelectMode() bool {
	return c.selectMode
}

func (c *DeviceCard) SelectUp() {
	if c.selectedIndex > 0 {
		c.selectedIndex--
	}
}

func (c *DeviceCard) SelectDown() {
	maxIndex := min(len(c.clients), maxClients) - 1
	if c.selectedIndex < maxIndex {
		c.selectedIndex++
	}
}

func (c *DeviceCard) SelectLeft() {
	// No-op for device card - uses up/down navigation
}

func (c *DeviceCard) SelectRight() {
	// No-op for device card - uses up/down navigation
}

func (c *DeviceCard) HasSelection() bool {
	return c.selectMode && c.selectedIndex >= 0 && c.selectedIndex < len(c.clients)
}

func (c *DeviceCard) ClearSelection() {
	c.selectedIndex = 0
	c.selectMode = false
}

// GetSelectedDevice returns the currently selected device filter
func (c *DeviceCard) GetSelectedDevice() *DeviceFilter {
	if !c.HasSelection() {
		return nil
	}

	// Get sorted clients (same as in RenderContent)
	var sortedClients []client
	for name, count := range c.clients {
		sortedClients = append(sortedClients, client{name: name, count: count})
	}

	sort.Slice(sortedClients, func(i, j int) bool {
		if sortedClients[i].count != sortedClients[j].count {
			return sortedClients[i].count > sortedClients[j].count
		}
		return sortedClients[i].name < sortedClients[j].name
	})

	if c.selectedIndex >= len(sortedClients) {
		return nil
	}

	return &DeviceFilter{
		Device: sortedClients[c.selectedIndex].name,
	}
}

// CycleMode advances to the next display mode and recalculates data
func (c *DeviceCard) CycleMode() {
	c.mode = (c.mode + 1) % 3
	c.clients = c.getClients(c.logs)
}

// GetTitle returns the display title based on current mode
func (c *DeviceCard) GetTitle() string {
	switch c.mode {
	case ModeOS:
		return "OS"
	case ModeDevice:
		return "Device"
	default:
		return "Client"
	}
}

// GetDeviceLookup returns the device lookup function for filtering
func (c *DeviceCard) GetDeviceLookup() func(string) string {
	switch c.mode {
	case ModeOS:
		return c.detector.GetOS
	case ModeDevice:
		return c.detector.GetDevice
	default:
		return c.detector.GetClient
	}
}
