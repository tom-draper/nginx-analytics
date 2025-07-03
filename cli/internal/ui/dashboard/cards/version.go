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
	detector version.InlineVersionDetector
	versions map[string]int
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

	// Define bar style (using purple for versions)
	barStyle := lipgloss.NewStyle().
		Background(styles.Green).  // Purple background
		Foreground(styles.Black)    // Black text

	var lines []string

	// Render each version as a horizontal bar with overlaid text
	for i, ver := range versions {
		if i >= height {
			break // Don't exceed available height
		}

		// Calculate bar length proportional to count, using full width
		barLength := 0
		if maxCount > 0 {
			barLength = (ver.count * width) / maxCount
			if barLength == 0 && ver.count > 0 {
				barLength = 1 // Ensure non-zero counts show at least one bar
			}
		}

		// Create the text to overlay: "count version_name"
		overlayText := fmt.Sprintf("%d %s", ver.count, ver.name)

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
					// Text over purple bar - use bar style
					lineParts = append(lineParts, barStyle.Render(char))
				} else {
					// Text over empty space - use normal text style
					lineParts = append(lineParts, normalTextStyle.Render(char))
				}
			} else {
				// No text character at this position
				if j < barLength {
					// Purple bar space
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