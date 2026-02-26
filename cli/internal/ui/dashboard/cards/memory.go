package cards

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/guptarohit/asciigraph"
	"github.com/tom-draper/nginx-analytics/agent/pkg/system"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

type memory struct {
	used       uint64
	free       uint64
	available  uint64
	total      uint64
	percentage float64
}

type MemoryCard struct {
	memory     memory
	history    []float64 // Store historical average CPU usage
	maxHistory int       // Maximum number of historical points to keep
}

func NewMemoryCard() *MemoryCard {
	return &MemoryCard{
		maxHistory: 100, // Keep last 100 data points for better trend visualization
	}
}

func (c *MemoryCard) RenderContent(width, height int) string {
	if c.memory.percentage == 0 {
		return c.renderEmptyState(width)
	}

	// Calculate available height for bar vs plot
	barHeight := 8                       // Fixed height for the memory bar section
	plotHeight := height - barHeight - 2 // Reserve 2 lines for spacing

	barContent := c.renderMemoryBar(width)

	// Render the historical plot
	plotContent := c.renderHistoryPlot(width, plotHeight)

	// Combine both with spacing; drop spacer when height is tight
	if height <= 6 {
		return lipgloss.JoinVertical(lipgloss.Left, barContent, plotContent)
	}
	return lipgloss.JoinVertical(lipgloss.Left, barContent, "", plotContent)
}

func (c *MemoryCard) renderMemoryBar(width int) string {
	// 	usedPct := float64(c.memory.used) / float64(c.memory.total)
	// freePct := float64(c.memory.free) / float64(c.memory.total)
	// availablePct := float64(c.memory.available) / float64(c.memory.total)

	// barWidth := max(width-2, 10)

	// usedWidth := int(usedPct * float64(barWidth))
	// freeWidth := int(freePct * float64(barWidth))
	// availableWidth := barWidth - usedWidth - freeWidth
	// Calculate proportions
	// usedPct := float64(c.memory.used) / float64(c.memory.total)
	// freePct := float64(c.memory.free) / float64(c.memory.total)
	// availablePct := float64(c.memory.available) / float64(c.memory.total)

	// // Calculate bar widths (subtract 2 for border padding)
	// barWidth := max(width-2, 10)

	// usedWidth := int(usedPct * float64(barWidth))
	// freeWidth := int(freePct * float64(barWidth))
	// // availableWidth := int(availablePct * float64(barWidth))
	// availableWidth := barWidth - usedWidth - freeWidth

	// // Ensure we don't exceed total width
	// if usedWidth+availableWidth+freeWidth > barWidth {
	// 	freeWidth = barWidth - usedWidth - availableWidth
	// }
	// if freeWidth < 0 {
	// 	freeWidth = 0
	// }

	total := float64(c.memory.total)
	used := float64(c.memory.used)
	free := float64(c.memory.free)

	// On Linux, gopsutil's Used is already excluding buffers/cache
	// (Total - Free - Buffers - Cached). So cache = Total - Used - Free.
	cache := total - used - free
	if cache < 0 {
		cache = 0
	}

	usedPct := used / total
	cachePct := cache / total

	barWidth := max(width, 10)
	usedWidth := int(usedPct * float64(barWidth))
	cacheWidth := int(cachePct * float64(barWidth))
	freeWidth := max(barWidth - usedWidth - cacheWidth, 0)
	usedBar := strings.Repeat("█", usedWidth)
	cacheBar := strings.Repeat("▒", cacheWidth)
	freeBar := strings.Repeat("░", freeWidth)

	// usedStyle := lipgloss.NewStyle().Foreground(styles.Red)
	// cacheStyle := lipgloss.NewStyle().Foreground(styles.Yellow)
	// freeStyle := lipgloss.NewStyle().Foreground(styles.DarkGray)
	usedStyle := lipgloss.NewStyle().Foreground(c.getColorForMemoryUsage(usedPct))
	cacheStyle := lipgloss.NewStyle().Faint(true).Foreground(c.getColorForMemoryUsage(usedPct))
	freeStyle := lipgloss.NewStyle().Foreground(styles.DarkGray)

	bar := usedStyle.Render(usedBar) + cacheStyle.Render(cacheBar) + freeStyle.Render(freeBar)

	// Create the bar segments
	// usedBar := strings.Repeat("█", usedWidth)
	// availableBar := strings.Repeat("█", availableWidth)
	// freeBar := strings.Repeat("█", freeWidth)

	// // Style each segment

	// // Combine the bar
	// bar := usedStyle.Render(usedBar) + availableStyle.Render(availableBar) + freeStyle.Render(freeBar)

	// Create labels
	usedLabel := fmt.Sprintf("Used: %s (%.0f%%)", c.formatBytes(uint64(used)), usedPct*100)
	availableLabel := fmt.Sprintf("Cache: %s (%.0f%%)", c.formatBytes(uint64(cache)), cachePct*100)

	// Style labels
	usedLabelStyled := usedStyle.Render("■ ") + usedLabel
	availableLabelStyled := cacheStyle.Render("■ ") + availableLabel

	// Create the complete memory bar display
	return lipgloss.JoinVertical(lipgloss.Left,
		bar,
		usedLabelStyled,
		availableLabelStyled,
	)
}

func (c *MemoryCard) formatBytes(bytes uint64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

func (c *MemoryCard) renderHistoryPlot(width, plotHeight int) string {
	// Always render a plot, even with minimal data
	data := c.getPlotData()

	if len(data) == 0 {
		// If no history yet, use current memory percentage as single data point
		if c.memory.percentage > 0 {
			data = []float64{c.memory.percentage}
		} else {
			data = []float64{0}
		}
	}

	// Ensure we have at least 2 points for asciigraph
	if len(data) == 1 {
		data = append(data, data[0]) // Duplicate the single point
	}

	// Calculate chart dimensions
	chartWidth := max(width-8, 20) // Minimum width for readable plot
	chartHeight := 3               // Fixed height of 4 rows

	// Create the plot using asciigraph with no axis labels
	plot := asciigraph.Plot(data,
		asciigraph.Width(chartWidth),
		asciigraph.Height(chartHeight))

	// Count actual plot lines
	plotLines := strings.Split(plot, "\n")
	actualHeight := len(plotLines)

	// Calculate padding needed to position at bottom
	paddingNeeded := plotHeight - actualHeight

	// Add padding above the plot to push it to the bottom
	var paddedLines []string
	for i := 0; i < paddingNeeded; i++ {
		paddedLines = append(paddedLines, "")
	}
	paddedLines = append(paddedLines, plotLines...)

	// Join all lines
	paddedPlot := strings.Join(paddedLines, "\n")

	// Style the plot
	plotStyle := lipgloss.NewStyle().
		Foreground(c.getPlotColor())

	return plotStyle.Render(paddedPlot)
}

func (c *MemoryCard) getPlotData() []float64 {
	// Return the historical data, or current data if no history
	if len(c.history) > 0 {
		return c.history
	}
	return []float64{}
}

func (c *MemoryCard) getPlotColor() lipgloss.Color {
	// Choose plot color based on current memory usage
	if c.memory.percentage == 0 {
		return styles.LightGray
	}

	usage := c.memory.percentage

	switch {
	case usage <= 30:
		return styles.Green
	case usage <= 50:
		return styles.Yellow
	case usage <= 70:
		return styles.Orange
	default:
		return styles.Red
	}
}

func (c *MemoryCard) renderEmptyState(width int) string {
	faintStyle := lipgloss.NewStyle().Foreground(styles.LightGray)
	line := "No memory data found"
	return c.centerText(line, width, faintStyle)
}

func (c *MemoryCard) centerText(text string, width int, style lipgloss.Style) string {
	displayWidth := lipgloss.Width(text)
	padding := (width - displayWidth) / 2
	if padding > 0 {
		text = strings.Repeat(" ", padding) + text
	}
	return "\n\n\n" + style.Render(text)
}

func (c *MemoryCard) UpdateCalculated(sysInfo system.SystemInfo) {
	c.memory.percentage = (float64(sysInfo.Memory.Used) / float64(sysInfo.Memory.Total)) * 100
	c.memory.used = sysInfo.Memory.Used
	c.memory.free = sysInfo.Memory.Free
	c.memory.available = sysInfo.Memory.Available
	c.memory.total = sysInfo.Memory.Total

	// Add current memory usage to history
	c.addToHistory(c.memory.percentage)
}

// Add this method to properly manage history
func (c *MemoryCard) addToHistory(percentage float64) {
	// Add the new percentage to history
	c.history = append(c.history, percentage)

	// Keep only the last maxHistory points
	if len(c.history) > c.maxHistory {
		c.history = c.history[1:]
	}
}

func (c *MemoryCard) getColorForMemoryUsage(usage float64) lipgloss.Color {
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

func (c *MemoryCard) getFaintColorForMemoryUsage(usage float64) lipgloss.Color {
	switch {
	case usage <= 30:
		return lipgloss.Color("152")
	case usage <= 40:
		return lipgloss.Color("157") // Light Green/Chartreuse
	case usage <= 50:
		return lipgloss.Color("229")
	case usage <= 60:
		return lipgloss.Color("215")
	case usage <= 70:
		return lipgloss.Color("216")
	case usage <= 80:
		return lipgloss.Color("209") // Dark Orange/Reddish-Orange
	default:
		return lipgloss.Color("131")
	}
}
