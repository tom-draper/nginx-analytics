package cards

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	l "github.com/tom-draper/nginx-analytics/cli/internal/logs"
	p "github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
)

type SuccessRateCard struct {
	logs        []l.NginxLog // Reference to log entries
	period      p.Period
	SuccessRate float64
	lastUpdate  time.Time // When metrics were last calculated
}

func NewSuccessRateCard(logs []l.NginxLog, period p.Period) *SuccessRateCard {
	card := &SuccessRateCard{logs: logs, period: period}

	// Initial calculation
	card.updateMetrics()
	return card
}

// UpdateLogs should be called when the log slice content changes
func (r *SuccessRateCard) UpdateLogs(newLogs []l.NginxLog, period p.Period) {
	r.logs = newLogs
	r.updateMetrics()
}

func (r *SuccessRateCard) updateMetrics() {
	success := successCount(r.logs)
	total := len(r.logs)
	r.SuccessRate = float64(success) / float64(total)
}

func successCount(logs []l.NginxLog) int {
	count := 0
	for _, log := range logs {
		if *log.Status >= 200 && *log.Status < 300 {
			count++
		}
	}

	return count
}

func (r *SuccessRateCard) RenderContent(width, height int) string {
	// Ensure metrics are up to date
	r.updateMetrics()

	rateStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#ffffff")).
		Bold(true)

	lines := []string{
		"",
		rateStyle.Render(fmt.Sprintf("%.1f", r.SuccessRate * 100) + "%"),
		"",
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

func (r *SuccessRateCard) GetTitle() string {
	return "Success Rate"
}

// GetLastUpdate returns when metrics were last calculated
func (r *SuccessRateCard) GetLastUpdate() time.Time {
	return r.lastUpdate
}

// ForceUpdate forces recalculation of metrics even if hash hasn't changed
func (r *SuccessRateCard) ForceUpdate() {
	r.updateMetrics()
}
