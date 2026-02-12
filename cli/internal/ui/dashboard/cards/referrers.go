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
	referrers     []referrer
	sorted        []referrer
	selectMode     bool
	selectedIndex int
}

const maxReferrers = 16 // Maximum number of referrers to display

func NewReferrersCard(logs []nginx.NGINXLog, period period.Period) *ReferrersCard {
	card := &ReferrersCard{}
	card.UpdateCalculated(logs, period)
	return card
}

func (p *ReferrersCard) RenderContent(width, height int) string {
	if len(p.sorted) == 0 {
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

	referrers := p.sorted

	// Find max count for scaling bars
	maxCount := referrers[0].count

	// Define lipgloss styles for the bars
	barStyle := lipgloss.NewStyle().
		Background(styles.Green).
		Foreground(styles.Black)

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

	// Calculate how many referrers we can actually display
	maxDisplayReferrers := min(len(referrers), height)

	// Render each referrer as a horizontal bar with overlaid text
	for i := range maxDisplayReferrers {
		if i > 0 {
			buf.WriteByte('\n')
		}

		ep := referrers[i]
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
			overlayText = fmt.Sprintf("> %d %s", ep.count, ep.path)
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

		// Choose styles based on selection
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
	for i := maxDisplayReferrers; i < height; i++ {
		buf.WriteByte('\n')
	}

	return buf.String()
}

func (r *ReferrersCard) UpdateCalculated(logs []nginx.NGINXLog, period period.Period) {
	r.referrers = getReferrers(logs)
	r.sorted = r.sortReferrers()
}

func (r *ReferrersCard) sortReferrers() []referrer {
	sorted := make([]referrer, len(r.referrers))
	copy(sorted, r.referrers)
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
	if len(sorted) > maxReferrers {
		sorted = sorted[:maxReferrers]
	}
	return sorted
}

func getReferrers(logs []nginx.NGINXLog) []referrer {
	referrerMap := make(map[referrerID]int)

	for _, log := range logs {
		// Filter out empty referrers and "-" referrers
		if log.Referrer == "" || log.Referrer == "-" || log.Status == nil {
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
	if len(r.sorted) == 0 {
		return 3 // Minimum height for "No referrers found" message
	}

	// Each referrer needs one line
	return len(r.sorted)
}

// SelectableCard interface implementation

func (r *ReferrersCard) EnterSelectMode() {
	r.selectMode = true
	r.selectedIndex = 0
}

func (r *ReferrersCard) ExitSelectMode() {
	r.selectMode = false
}

func (r *ReferrersCard) IsInSelectMode() bool {
	return r.selectMode
}

func (r *ReferrersCard) SelectUp() {
	if r.selectedIndex > 0 {
		r.selectedIndex--
	}
}

func (r *ReferrersCard) SelectDown() {
	if r.selectedIndex < len(r.sorted)-1 {
		r.selectedIndex++
	}
}

func (r *ReferrersCard) SelectLeft() {
	// No-op for referrers card - uses up/down navigation
}

func (r *ReferrersCard) SelectRight() {
	// No-op for referrers card - uses up/down navigation
}

func (r *ReferrersCard) HasSelection() bool {
	_, ok := selectedItem(r.selectMode, r.selectedIndex, r.sorted)
	return ok
}

func (r *ReferrersCard) ClearSelection() {
	r.selectedIndex = 0
	r.selectMode = false
}

// GetSelectedReferrer returns the currently selected referrer filter, or nil if none selected
func (r *ReferrersCard) GetSelectedReferrer() *ReferrerFilter {
	ref, ok := selectedItem(r.selectMode, r.selectedIndex, r.sorted)
	if !ok {
		return nil
	}
	return &ReferrerFilter{Referrer: ref.path}
}
