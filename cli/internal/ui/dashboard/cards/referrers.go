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

type referrer struct {
	path   string
	status int
	method string
	count  int
}

type referrerID struct {
	path   string
	method string
	status int
}

type ReferrersCard struct {
	referrers []referrer
}

const maxReferrers = 35 // Maximum number of referrers to display

func NewReferrersCard(logs []nginx.NGINXLog, period period.Period) *ReferrersCard {
	card := &ReferrersCard{}
	card.UpdateCalculated(logs, period)
	return card
}

func (p *ReferrersCard) RenderContent(width, height int) string {
	if len(p.referrers) == 0 {
		faintStyle := lipgloss.NewStyle().
			Foreground(styles.LightGray).
			Bold(true)

		// Show empty message if no referrers
		lines := []string{"", faintStyle.Render("No referrers found")}

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

	// Sort referrers by count (descending)
	sortedReferrers := make([]referrer, len(p.referrers))
	copy(sortedReferrers, p.referrers)

	sort.Slice(sortedReferrers, func(i, j int) bool {
		if sortedReferrers[i].count != sortedReferrers[j].count {
			return sortedReferrers[i].count > sortedReferrers[j].count
		}
		// Tie-breaker 1: path
		if sortedReferrers[i].path != sortedReferrers[j].path {
			return sortedReferrers[i].path < sortedReferrers[j].path
		}
		// Tie-breaker 2: method
		if sortedReferrers[i].method != sortedReferrers[j].method {
			return sortedReferrers[i].method < sortedReferrers[j].method
		}
		// Tie-breaker 3: status
		return sortedReferrers[i].status < sortedReferrers[j].status
	})

	// Find max count for scaling bars
	maxCount := sortedReferrers[0].count

	var referrers []referrer
	if len(sortedReferrers) > maxReferrers {
		// Limit to maxReferrers if more than allowed
		referrers = sortedReferrers[:maxReferrers]
	} else {
		referrers = sortedReferrers
	}

	// Define lipgloss styles for the bars
	barStyle := lipgloss.NewStyle().
		Background(styles.Green). // Green background
		Foreground(styles.Black)  // Black text

	normalTextStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("15")) // White/default text

	var lines []string

	// Render each referrer as a horizontal bar with overlaid text
	for i, ep := range referrers {
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

func (r *ReferrersCard) UpdateCalculated(logs []nginx.NGINXLog, period period.Period) {
	r.referrers = getReferrers(logs)
}

func getReferrers(logs []nginx.NGINXLog) []referrer {
	referrerMap := make(map[referrerID]int)

	for _, log := range logs {
		if log.Referrer == "" {
			continue
		}
		id := referrerID{
			path:   log.Referrer,
			method: log.Method,
			status: *log.Status,
		}
		referrerMap[id]++
	}

	var referrers []referrer
	for id, count := range referrerMap {
		referrers = append(referrers, referrer{path: id.path, method: id.method, status: id.status, count: count})
	}

	return referrers
}

func (r *ReferrersCard) GetRequiredHeight(width int) int {
	if len(r.referrers) == 0 {
		return 3 // Minimum height for "No referrers found" message
	}

	// Each referrer needs one line, plus some padding
	return min(len(r.referrers), maxReferrers) // +2 for padding/borders
}
