package cards

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

type SuccessRateCard struct {
	successRate float64
}

func NewSuccessRateCard(logs []nginx.NGINXLog, period period.Period) *SuccessRateCard {
	card := &SuccessRateCard{}
	card.UpdateCalculated(logs, period)
	return card
}

func (r *SuccessRateCard) UpdateCalculated(logs []nginx.NGINXLog, period period.Period) {
	success := successCount(logs)
	total := len(logs)
	if total == 0 {
		r.successRate = -1
	} else {
		r.successRate = float64(success) / float64(total)
	}
}

func successCount(logs []nginx.NGINXLog) int {
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
		return lipgloss.Color("228") // Yellow for 75%+
	} else if rate >= 0.5 {
		return lipgloss.Color("202") // Orange for 50%+
	} else if rate == -1 {
		return styles.LightGray // Grey for no data
	}
	return styles.Red // Red for below 50%
}

func (r *SuccessRateCard) RenderContent(width, height int) string {
	rateStyle := lipgloss.NewStyle().
		Foreground(rateColor(r.successRate)).
		Bold(true)

	var formattedSuccessRate string
	if r.successRate == -1 {
		formattedSuccessRate = "--"
	} else {
		formattedSuccessRate = fmt.Sprintf("%.1f%%", r.successRate*100) + "%"
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
