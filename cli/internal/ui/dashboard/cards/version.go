package cards

import (
	"fmt"
	"sort"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/version"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

type versionEntry struct {
	name  string
	count int
}

type VersionCard struct {
	detector      version.InlineVersionDetector
	versions      map[string]int
	sorted        []versionEntry
	selectMode     bool
	selectedIndex int
}

const maxVersions = 35 // Maximum number of versions to display

func NewVersionCard(logs []nginx.NGINXLog, period period.Period) *VersionCard {
	card := &VersionCard{detector: *version.NewInlineVersionDetector()}
	card.UpdateCalculated(logs, period)
	return card
}

func (p *VersionCard) RenderContent(width, height int) string {
	if len(p.sorted) == 0 {
		faintStyle := lipgloss.NewStyle().
			Foreground(styles.LightGray).
			Bold(true)

		// Show empty message if no versions
		lines := []string{"", faintStyle.Render("No versions found")}

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

	versions := p.sorted

	// Find max count for scaling bars
	maxCount := versions[0].count

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

	// Render each version as a horizontal bar with overlaid text
	for i, ver := range versions {
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
			barLength = (ver.count * width) / maxCount
			if barLength == 0 && ver.count > 0 {
				barLength = 1 // Ensure non-zero counts show at least one bar
			}
		}

		// Create the text to overlay: "count version_name"
		var overlayText string
		if isSelected {
			overlayText = fmt.Sprintf("> %d %s", ver.count, ver.name)
		} else {
			overlayText = fmt.Sprintf("%d %s", ver.count, ver.name)
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
	for i := min(len(versions), height); i < height; i++ {
		buf.WriteByte('\n')
	}

	return buf.String()
}

func (c *VersionCard) UpdateCalculated(logs []nginx.NGINXLog, period period.Period) {
	c.versions = c.getVersions(logs)
	c.sorted = c.sortVersions()
}

func (c *VersionCard) sortVersions() []versionEntry {
	sorted := make([]versionEntry, 0, len(c.versions))
	for name, count := range c.versions {
		sorted = append(sorted, versionEntry{name: name, count: count})
	}
	sort.Slice(sorted, func(i, j int) bool {
		if sorted[i].count != sorted[j].count {
			return sorted[i].count > sorted[j].count
		}
		return sorted[i].name < sorted[j].name
	})
	if len(sorted) > maxVersions {
		sorted = sorted[:maxVersions]
	}
	return sorted
}

func (c *VersionCard) getVersions(logs []nginx.NGINXLog) map[string]int {
	versions := make(map[string]int)
	for _, log := range logs {
		v := c.detector.GetVersion(log.Path)
		if v != "" {
			versions[v]++
		}
	}
	return versions
}

func (c *VersionCard) GetRequiredHeight(width int) int {
	if len(c.sorted) == 0 {
		return 3 // Minimum height for "No versions found" message
	}

	// Each version needs one line
	return len(c.sorted)
}

// SelectableCard interface implementation

func (c *VersionCard) EnterSelectMode() {
	c.selectMode = true
	c.selectedIndex = 0
}

func (c *VersionCard) ExitSelectMode() {
	c.selectMode = false
}

func (c *VersionCard) IsInSelectMode() bool {
	return c.selectMode
}

func (c *VersionCard) SelectUp() {
	if c.selectedIndex > 0 {
		c.selectedIndex--
	}
}

func (c *VersionCard) SelectDown() {
	if c.selectedIndex < len(c.sorted)-1 {
		c.selectedIndex++
	}
}

func (c *VersionCard) SelectLeft() {
	// No-op for version card - uses up/down navigation
}

func (c *VersionCard) SelectRight() {
	// No-op for version card - uses up/down navigation
}

func (c *VersionCard) HasSelection() bool {
	_, ok := selectedItem(c.selectMode, c.selectedIndex, c.sorted)
	return ok
}

func (c *VersionCard) ClearSelection() {
	c.selectedIndex = 0
	c.selectMode = false
}

// GetSelectedVersion returns the currently selected version filter
func (c *VersionCard) GetSelectedVersion() *VersionFilter {
	ver, ok := selectedItem(c.selectMode, c.selectedIndex, c.sorted)
	if !ok {
		return nil
	}
	return &VersionFilter{Version: ver.name}
}

// GetVersionLookup returns the version lookup function for filtering
func (c *VersionCard) GetVersionLookup() func(string) string {
	return c.detector.GetVersion
}