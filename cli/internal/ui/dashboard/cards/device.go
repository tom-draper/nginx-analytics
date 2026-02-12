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
	sorted        []client
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
	if len(p.sorted) == 0 {
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

	clients := p.sorted

	// Find max count for scaling bars
	maxCount := clients[0].count

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

	var buf strings.Builder

	// Render each client as a horizontal bar with overlaid text
	for i, cl := range clients {
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

		for j := range width {
			if j < len(overlayText) {
				char := overlayText[j : j+1]
				if j < barLength || isSelected {
					buf.WriteString(currentBarStyle.Render(char))
				} else {
					buf.WriteString(textStyle.Render(char))
				}
			} else {
				if j < barLength || isSelected {
					buf.WriteString(currentBarStyle.Render(" "))
				} else {
					buf.WriteByte(' ')
				}
			}
		}
	}

	// Fill remaining height with empty lines
	for i := min(len(clients), height); i < height; i++ {
		buf.WriteByte('\n')
	}

	return buf.String()
}

func (c *DeviceCard) UpdateCalculated(logs []nginx.NGINXLog, period period.Period) {
	c.logs = logs
	c.clients = c.getClients(logs)
	c.sorted = c.sortClients()
}

func (c *DeviceCard) sortClients() []client {
	sorted := make([]client, 0, len(c.clients))
	for name, count := range c.clients {
		sorted = append(sorted, client{name: name, count: count})
	}
	sort.Slice(sorted, func(i, j int) bool {
		if sorted[i].count != sorted[j].count {
			return sorted[i].count > sorted[j].count
		}
		return sorted[i].name < sorted[j].name
	})
	if len(sorted) > maxClients {
		sorted = sorted[:maxClients]
	}
	return sorted
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
	if len(c.sorted) == 0 {
		return 3 // Minimum height for "No clients found" message
	}

	// Each client needs one line
	return len(c.sorted)
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
	if c.selectedIndex < len(c.sorted)-1 {
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
	_, ok := selectedItem(c.selectMode, c.selectedIndex, c.sorted)
	return ok
}

func (c *DeviceCard) ClearSelection() {
	c.selectedIndex = 0
	c.selectMode = false
}

// GetSelectedDevice returns the currently selected device filter
func (c *DeviceCard) GetSelectedDevice() *DeviceFilter {
	cl, ok := selectedItem(c.selectMode, c.selectedIndex, c.sorted)
	if !ok {
		return nil
	}
	return &DeviceFilter{Device: cl.name}
}

// CycleMode advances to the next display mode and recalculates data
func (c *DeviceCard) CycleMode() {
	c.mode = (c.mode + 1) % 3
	c.clients = c.getClients(c.logs)
	c.sorted = c.sortClients()
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
