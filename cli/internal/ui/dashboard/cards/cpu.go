package cards

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/agent/pkg/system"
	"github.com/tom-draper/nginx-analytics/cli/internal/logger"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

type CPUCard struct {
	cpuPercentages []float64
}

func NewCPUCard() *CPUCard {
	return &CPUCard{}
}

func (c *CPUCard) RenderContent(width, height int) string {
	if len(c.cpuPercentages) == 0 {
		return c.renderEmptyState(width)
	}

	var rows []string
	squareSize := 5 // Adjust as needed for square dimensions

	// Calculate how many squares fit per row
	squaresPerRow := width / squareSize
	if squaresPerRow == 0 {
		squaresPerRow = 1
	}

	var currentRow []string
	for i, p := range c.cpuPercentages {
		color := c.getColorForCPUUsage(p)
		text := fmt.Sprintf("%.0f%%", p)

		square := lipgloss.NewStyle().
			Width(squareSize).
			Height(3).
			Background(color).
			Foreground(lipgloss.Color("0")).
			Align(lipgloss.Center).
			AlignVertical(lipgloss.Center).
			Render(text)

		currentRow = append(currentRow, square)

		// New line after every squaresPerRow, or if it's the last square
		if (i+1)%squaresPerRow == 0 || i == len(c.cpuPercentages)-1 {
			rows = append(rows, lipgloss.JoinHorizontal(lipgloss.Top, currentRow...))
			currentRow = []string{} // Reset for the next row
		}
	}

	return lipgloss.NewStyle().Width(width).Align(lipgloss.Center).Render(lipgloss.JoinVertical(lipgloss.Left, rows...))
}

func (c *CPUCard) renderEmptyState(width int) string {
	faintStyle := lipgloss.NewStyle().Foreground(styles.LightGray)
	line := "No CPU data found"
	return c.centerText(line, width, faintStyle)
}

func (c *CPUCard) centerText(text string, width int, style lipgloss.Style) string {
	displayWidth := lipgloss.Width(text)
	padding := (width - displayWidth) / 2
	if padding > 0 {
		text = strings.Repeat(" ", padding) + text
	}
	return "\n\n\n" + style.Render(text)
}

func (c *CPUCard) UpdateCalculated(sysInfo system.SystemInfo) {
	c.cpuPercentages = sysInfo.CPU.CoreUsage
}

func (c *CPUCard) getColorForCPUUsage(usage float64) lipgloss.Color {
	switch {
	case usage <= 30:
		return styles.Green // Best: Green
	case usage <= 40:
		return lipgloss.Color("154") // Light Green/Chartreuse
	case usage <= 50:
		return styles.Yellow // Yellow
	case usage <= 60:
		return lipgloss.Color("214") // Orange-Yellow
	case usage <= 70:
		return styles.Orange // Orange
	case usage <= 80:
		return lipgloss.Color("202") // Dark Orange/Reddish-Orange
	default:
		return styles.Red // Worst: Red
	}
}
