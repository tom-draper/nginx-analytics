package cards

import (
	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

type UsageTimeCard struct{}

func NewUsageTimeCard(logs []nginx.NGINXLog, period period.Period) *UsageTimeCard {
	return &UsageTimeCard{}
}

func (c *UsageTimeCard) RenderContent(width, height int) string {
	faintStyle := lipgloss.NewStyle().
		Foreground(styles.LightGray).
		Bold(true)

	return lipgloss.Place(width, height,
		lipgloss.Center, lipgloss.Center,
		faintStyle.Render("Usage Time Card"),
	)
}

func (c *UsageTimeCard) UpdateCalculated(logs []nginx.NGINXLog, period period.Period) {
	// No calculation for now
}

func (c *UsageTimeCard) GetRequiredHeight(width int) int {
	return 3 // Placeholder height
}
