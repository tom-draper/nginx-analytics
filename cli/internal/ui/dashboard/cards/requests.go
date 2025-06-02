package cards

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/parse"
	"github.com/tom-draper/nginx-analytics/cli/internal/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

// RequestsCard displays request count and rate
type RequestsCard struct {
	logs        []parse.NginxLog // Reference to log entries
	period      period.Period
	lastLogHash uint64    // Hash of logs for change detection
	Count       int       // Total request count (cached)
	Rate        float64   // Requests per hour (cached)
	lastUpdate  time.Time // When metrics were last calculated
}

func NewRequestsCard(logs []parse.NginxLog, period period.Period) *RequestsCard {
	card := &RequestsCard{logs: logs, period: period}

	// Initial calculation
	card.updateMetrics()
	return card
}

// UpdateLogs should be called when the log slice content changes
func (r *RequestsCard) UpdateLogs(newLogs []parse.NginxLog, period period.Period) {
	r.logs = newLogs
	r.updateMetrics()
}

// updateMetrics recalculates Count and Rate only if logs have changed
func (r *RequestsCard) updateMetrics() {
	r.Count = len(r.logs)
	r.Rate = float64(r.Count) / float64(period.PeriodHours(r.period))
}

func (r *RequestsCard) RenderContent(width, height int) string {
	// Ensure metrics are up to date
	r.updateMetrics()

	countStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#ffffff")).
		Bold(true)

	rateStyle := lipgloss.NewStyle().
		Foreground(styles.LightGray)

	lines := []string{
		"",
		countStyle.Render(r.formatCount()),
		rateStyle.Render(fmt.Sprintf("%.1f/h", r.Rate)),
		"",
	}

	// Center content
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

func (r *RequestsCard) formatCount() string {
	if r.Count >= 1000000 {
		return fmt.Sprintf("%.1fM", float64(r.Count)/1000000)
	} else if r.Count >= 1000 {
		return fmt.Sprintf("%.1fK", float64(r.Count)/1000)
	}
	return fmt.Sprintf("%d", r.Count)
}

func (r *RequestsCard) GetTitle() string {
	return "Requests"
}

// GetLastUpdate returns when metrics were last calculated
func (r *RequestsCard) GetLastUpdate() time.Time {
	return r.lastUpdate
}

// ForceUpdate forces recalculation of metrics even if hash hasn't changed
func (r *RequestsCard) ForceUpdate() {
	r.lastLogHash = 0 // Reset hash to force update
	r.updateMetrics()
}
