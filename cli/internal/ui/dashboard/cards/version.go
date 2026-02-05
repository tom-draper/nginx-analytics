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
	if len(p.versions) == 0 {
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

	// Convert map to slice and sort by count (descending)
	var sortedVersions []versionEntry
	for name, count := range p.versions {
		sortedVersions = append(sortedVersions, versionEntry{name: name, count: count})
	}

	sort.Slice(sortedVersions, func(i, j int) bool {
		if sortedVersions[i].count != sortedVersions[j].count {
			return sortedVersions[i].count > sortedVersions[j].count
		}
		// Tie-breaker: version name
		return sortedVersions[i].name < sortedVersions[j].name
	})

	// Find max count for scaling bars
	maxCount := sortedVersions[0].count

	var versions []versionEntry
	if len(sortedVersions) > maxVersions {
		// Limit to maxVersions if more than allowed
		versions = sortedVersions[:maxVersions]
	} else {
		versions = sortedVersions
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

	// Render each version as a horizontal bar with overlaid text
	for i, ver := range versions {
		if i >= height {
			break // Don't exceed available height
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

func (c *VersionCard) UpdateCalculated(logs []nginx.NGINXLog, period period.Period) {
	c.versions = c.getVersions(logs)
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
	if len(c.versions) == 0 {
		return 3 // Minimum height for "No versions found" message
	}

	// Each version needs one line
	return min(len(c.versions), maxVersions)
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
	maxIndex := min(len(c.versions), maxVersions) - 1
	if c.selectedIndex < maxIndex {
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
	return c.selectMode && c.selectedIndex >= 0 && c.selectedIndex < len(c.versions)
}

func (c *VersionCard) ClearSelection() {
	c.selectedIndex = 0
	c.selectMode = false
}

// GetSelectedVersion returns the currently selected version filter
func (c *VersionCard) GetSelectedVersion() *VersionFilter {
	if !c.HasSelection() {
		return nil
	}

	// Get sorted versions (same as in RenderContent)
	var sortedVersions []versionEntry
	for name, count := range c.versions {
		sortedVersions = append(sortedVersions, versionEntry{name: name, count: count})
	}

	sort.Slice(sortedVersions, func(i, j int) bool {
		if sortedVersions[i].count != sortedVersions[j].count {
			return sortedVersions[i].count > sortedVersions[j].count
		}
		return sortedVersions[i].name < sortedVersions[j].name
	})

	if c.selectedIndex >= len(sortedVersions) {
		return nil
	}

	return &VersionFilter{
		Version: sortedVersions[c.selectedIndex].name,
	}
}

// GetVersionLookup returns the version lookup function for filtering
func (c *VersionCard) GetVersionLookup() func(string) string {
	return c.detector.GetVersion
}