package cards

import (
	"fmt"
	"strings"
	"github.com/charmbracelet/lipgloss"
	"github.com/guptarohit/asciigraph"
	"github.com/tom-draper/nginx-analytics/agent/pkg/system"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

type CPUCard struct {
	cpuPercentages []float64
	history        []float64 // Store historical average CPU usage
	maxHistory     int       // Maximum number of historical points to keep
}

func NewCPUCard() *CPUCard {
	return &CPUCard{
		maxHistory: 100, // Keep last 100 data points for better trend visualization
	}
}

func (c *CPUCard) RenderContent(width, height int) string {
	if len(c.cpuPercentages) == 0 {
		return c.renderEmptyState(width)
	}

	// Calculate available height for grid vs plot
	gridHeight := height / 2
	plotHeight := height - gridHeight - 3 // Reserve 3 lines for spacing and title

	// Render the CPU grid
	gridContent := c.renderCPUGrid(width, gridHeight)
	
	// Render the historical plot
	plotContent := c.renderHistoryPlot(width, plotHeight)
	
	// Combine both with spacing
	return lipgloss.JoinVertical(lipgloss.Left, 
		gridContent,
		"", // Empty line for spacing
		plotContent,
	)
}

func (c *CPUCard) renderCPUGrid(width, height int) string {
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

func (c *CPUCard) renderHistoryPlot(width, plotHeight int) string {
	// Always render a plot, even with minimal data
	data := c.getPlotData()
	
	if len(data) == 0 {
		// If no history yet, use current CPU average as single data point
		if len(c.cpuPercentages) > 0 {
			var sum float64
			for _, usage := range c.cpuPercentages {
				sum += usage
			}
			avgUsage := sum / float64(len(c.cpuPercentages))
			data = []float64{avgUsage}
		} else {
			data = []float64{0}
		}
	}

	// Ensure we have at least 2 points for asciigraph
	if len(data) == 1 {
		data = append(data, data[0]) // Duplicate the single point
	}

	// Calculate chart dimensions
	chartWidth := width - 8 // Small padding
	chartHeight := plotHeight // Reserve 1 line for title
	
	if chartWidth < 10 {
		chartWidth = 10
	}
	if chartHeight < 3 {
		chartHeight = 3
	}

	// Create the plot using asciigraph
	plot := asciigraph.Plot(data, asciigraph.Width(chartWidth), asciigraph.Height(chartHeight))
	

	// Style the plot
	plotStyle := lipgloss.NewStyle().
		Foreground(c.getPlotColor())
		// Width(width).
		// Align(lipgloss.Left)

	return lipgloss.JoinVertical(lipgloss.Left, 
		plotStyle.Render(plot),
	)
}

func (c *CPUCard) getPlotData() []float64 {
	// Return the historical data, or current data if no history
	if len(c.history) > 0 {
		return c.history
	}
	return []float64{}
}

func (c *CPUCard) getPlotColor() lipgloss.Color {
	// Choose plot color based on current average CPU usage
	if len(c.cpuPercentages) == 0 {
		return styles.LightGray
	}

	var sum float64
	for _, usage := range c.cpuPercentages {
		sum += usage
	}
	avgUsage := sum / float64(len(c.cpuPercentages))

	switch {
	case avgUsage <= 30:
		return styles.Green
	case avgUsage <= 50:
		return styles.Yellow
	case avgUsage <= 70:
		return styles.Orange
	default:
		return styles.Red
	}
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
	
	// Calculate average CPU usage for historical tracking
	if len(c.cpuPercentages) > 0 {
		var sum float64
		for _, usage := range c.cpuPercentages {
			sum += usage
		}
		avgUsage := sum / float64(len(c.cpuPercentages))
		
		// Add to history
		c.history = append(c.history, avgUsage)
		
		// Trim history if it exceeds maxHistory
		if len(c.history) > c.maxHistory {
			c.history = c.history[len(c.history)-c.maxHistory:]
		}
	}
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