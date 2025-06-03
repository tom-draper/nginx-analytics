package cards

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	n "github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	p "github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

type SuccessRateCard struct {
	logs        []n.NGINXLog // Reference to log entries
	period      p.Period

	calculated struct {
		successRate float64
		lastUpdate  time.Time // When metrics were last calculated
	}
}

func NewSuccessRateCard(logs []n.NGINXLog, period p.Period) *SuccessRateCard {
	card := &SuccessRateCard{logs: logs, period: period}

	// Initial calculation
	card.updateCalculated()
	return card
}

// UpdateLogs should be called when the log slice content changes
func (r *SuccessRateCard) UpdateLogs(newLogs []n.NGINXLog, period p.Period) {
	r.logs = newLogs
	r.period = period
	r.updateCalculated()
}

func (r *SuccessRateCard) updateCalculated() {
	success := successCount(r.logs)
	total := len(r.logs)
	if total == 0 {
		r.calculated.successRate = -1
	} else {
		r.calculated.successRate = float64(success) / float64(total)
	}
}

func successCount(logs []n.NGINXLog) int {
	count := 0
	for _, log := range logs {
		if *log.Status >= 200 && *log.Status < 400 {
			count++
		}
	}

	return count
}

func rateColor(rate float64) lipgloss.TerminalColor {
	if rate >= 0.9 {
		return styles.Green // Green for 90%+
	} else if rate >= 0.75 {
		return lipgloss.Color("#ffff00") // Yellow for 75%+
	} else if rate >= 0.5 {
		return lipgloss.Color("#ff8000") // Orange for 50%+
	} else if rate == -1 {
		return styles.LightGray // Grey for no data
	}
	return styles.Red // Red for below 50%
}

func (r *SuccessRateCard) RenderContent(width, height int) string {
	// Ensure metrics are up to date
	r.updateCalculated()

	rateStyle := lipgloss.NewStyle().
		Foreground(rateColor(r.calculated.successRate)).
		Bold(true)

	var formattedSuccessRate string
	if r.calculated.successRate == -1 {
		formattedSuccessRate = "--"
	} else {
		formattedSuccessRate = fmt.Sprintf("%.1f%%", r.calculated.successRate*100) + "%"
	}

	lines := []string{
		"",
		rateStyle.Render(formattedSuccessRate),
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
	return r.calculated.lastUpdate
}

// ForceUpdate forces recalculation of metrics even if hash hasn't changed
func (r *SuccessRateCard) ForceUpdate() {
	r.updateCalculated()
}
