package cards

import (
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/logger"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

type UsageTimeCard struct {
	usageTimes []point[int]
	bucketMinutes int
}

func NewUsageTimeCard(logs []nginx.NGINXLog, period period.Period) *UsageTimeCard {
	card := &UsageTimeCard{}
	card.UpdateCalculated(logs, period) // This was missing!
	return card
}

func (c *UsageTimeCard) UpdateCalculated(logs []nginx.NGINXLog, period period.Period) {
	c.usageTimes = c.calculateUsageTimePointsBucketed(logs, c.bucketMinutes)
	logger.Log.Println(c.usageTimes)
}

func (c UsageTimeCard) calculateUsageTimePoints(logs []nginx.NGINXLog) []point[int] {
	points := make([]point[int], 0, len(logs))

	for _, log := range logs {
		if log.Timestamp != nil {
			points = append(points, point[int]{
				timestamp: *log.Timestamp,
				value:     1,
			})
		}
	}

	return points
}

func (c UsageTimeCard) calculateUsageTimePointsBucketed(logs []nginx.NGINXLog, bucketMinutes int) []point[int] {
	if len(logs) == 0 {
		return []point[int]{}
	}

	// Create a map to count requests per time bucket
	bucketCounts := make(map[time.Time]int)

	for _, log := range logs {
		if log.Timestamp != nil {
			// Round timestamp to nearest bucket
			bucketTime := log.Timestamp.Truncate(time.Duration(bucketMinutes) * time.Minute)
			bucketCounts[bucketTime]++
		}
	}

	// Convert map to sorted slice of points
	var points []point[int]
	for timestamp, count := range bucketCounts {
		points = append(points, point[int]{
			timestamp: timestamp,
			value:     count,
		})
	}

	// Sort by timestamp
	// You'll need to implement sorting or use the sortPoints function from your other card

	return points
}

func (c UsageTimeCard) calculateUsageTime(logs []nginx.NGINXLog) []int {
	if len(logs) == 0 {
		return []int{}
	}

	// Find the time range of all logs
	var minTime, maxTime time.Time
	for i, log := range logs {
		if log.Timestamp == nil {
			continue
		}
		if i == 0 {
			minTime = *log.Timestamp
			maxTime = *log.Timestamp
		} else {
			if log.Timestamp.Before(minTime) {
				minTime = *log.Timestamp
			}
			if log.Timestamp.After(maxTime) {
				maxTime = *log.Timestamp
			}
		}
	}

	// Round down minTime to the nearest 10-minute boundary
	minTime = minTime.Truncate(10 * time.Minute)

	// Calculate the number of 10-minute buckets needed
	duration := maxTime.Sub(minTime)
	numBuckets := int(duration.Minutes()/10) + 1

	// Initialize bucket counts
	buckets := make([]int, numBuckets)

	// Count requests in each bucket
	for _, log := range logs {
		if log.Timestamp == nil {
			continue
		}

		// Calculate which bucket this timestamp belongs to
		timeSinceMin := log.Timestamp.Sub(minTime)
		bucketIndex := int(timeSinceMin.Minutes() / 10)

		// Ensure we don't go out of bounds
		if bucketIndex >= 0 && bucketIndex < numBuckets {
			buckets[bucketIndex]++
		}
	}

	return buckets
}

func (a *UsageTimeCard) generateBrailleBarChart(values []point[int], chartWidth, chartHeight int) string {
	if len(values) == 0 || chartHeight <= 0 || chartWidth <= 0 {
		return strings.Repeat("\n", chartHeight) // Return empty lines if no data or invalid dimensions
	}

	maxValue := 0
	for _, val := range values {
		if val.value > maxValue {
			maxValue = val.value
		}
	}

	if maxValue == 0 {
		return strings.Repeat("\n", chartHeight) // Return empty lines if max value is 0
	}

	yAxisWidth := len(fmt.Sprintf("%d", maxValue)) + 1   // Max label + 1 for separator
	effectiveChartWidth := max(chartWidth-yAxisWidth, 1) // Ensure positive chart width for plotting

	// Create the chart grid with Y-axis space
	chartGrid := make([][]string, chartHeight)
	for i := range chartGrid {
		chartGrid[i] = make([]string, chartWidth) // Use original chartWidth here for the final output grid
		for j := range chartGrid[i] {
			chartGrid[i][j] = " "
		}
	}

	// Add Y-axis labels
	a.renderYAxisLabels(chartGrid, maxValue, chartHeight, yAxisWidth)

	// Canvas width is now 2x effectiveChartWidth
	brailleHeight := chartHeight * 4             // Each row can represent 4 sub-rows (dots 1,2,3,7 or 4,5,6,8)
	canvasWidthPixels := effectiveChartWidth * 2 // Each Braille char (1 terminal column) covers 2 pixels
	canvas := make([][]bool, brailleHeight)
	for i := range canvas {
		canvas[i] = make([]bool, canvasWidthPixels)
	}

	// Draw bars on the high-resolution canvas
	a.drawChartBarsOnCanvas(values, canvas, maxValue, effectiveChartWidth, brailleHeight, canvasWidthPixels)

	// Convert high-resolution canvas to Braille characters and apply styles
	a.convertCanvasToBraille(chartGrid, canvas, yAxisWidth, effectiveChartWidth, chartHeight, brailleHeight)

	// Convert chart grid to string
	lines := make([]string, chartHeight)
	for i, row := range chartGrid {
		lines[i] = strings.Join(row, "")
	}

	return strings.Join(lines, "\n")
}

func (a *UsageTimeCard) renderYAxisLabels(chartGrid [][]string, maxValue, height, yAxisWidth int) {
	grayStyle := lipgloss.NewStyle().Foreground(styles.Gray)
	for row := range height {
		rowValue := int(float64(maxValue) * float64(height-1-row) / float64(height-1))

		showLabel := false
		if height <= 8 {
			showLabel = row%2 == 0
		} else if height <= 15 {
			showLabel = row%3 == 0
		} else {
			showLabel = row%4 == 0
		}

		if row == 0 || row == height-1 { // Always show top and bottom labels
			showLabel = true
		}

		if showLabel && rowValue >= 0 {
			label := fmt.Sprintf("%d", rowValue)
			labelStart := max(yAxisWidth-len(label)-1, 0)
			for i, char := range label {
				if labelStart+i < len(chartGrid[row]) {
					chartGrid[row][labelStart+i] = grayStyle.Render(string(char))
				}
			}
		}
	}
}

// Simplified drawChartBarsOnCanvas for single data series
func (a *UsageTimeCard) drawChartBarsOnCanvas(values []point[int], canvas [][]bool, maxValue, effectiveChartWidth, brailleHeight, canvasWidthPixels int) {
	dataPoints := len(values)
	if dataPoints == 0 {
		return
	}

	// Each conceptual "bar" in the terminal output is now 2 pixels wide on the canvas.
	// We need to map our 'dataPoints' (timestamps) across the 'canvasWidthPixels'.
	for canvasCol := 0; canvasCol < canvasWidthPixels; canvasCol++ {
		// Map the canvas pixel column back to a data point index
		// This assumes an even distribution of data points across the total canvas width
		dataIndex := (canvasCol * dataPoints) / canvasWidthPixels
		if dataIndex >= dataPoints { // Safety check
			dataIndex = dataPoints - 1
		}

		valueCount := values[dataIndex].value

		barHeight := float64(valueCount) * float64(brailleHeight-1) / float64(maxValue)

		for row := 0; row < int(math.Ceil(barHeight)); row++ {
			canvasRow := brailleHeight - 1 - row // Fill from bottom up
			if canvasRow >= 0 && canvasRow < brailleHeight {
				canvas[canvasRow][canvasCol] = true
			}
		}
	}
}

// Simplified convertCanvasToBraille function for single data series
func (a *UsageTimeCard) convertCanvasToBraille(chartGrid [][]string, canvas [][]bool, yAxisWidth, effectiveChartWidth, chartHeight, brailleHeight int) {
	greenStyle := lipgloss.NewStyle().Foreground(styles.Green)
	// Iterate through each Braille character position in the *output* grid
	for row := range chartHeight { // chartHeight is the number of terminal rows for the graph
		for col := range effectiveChartWidth { // effectiveChartWidth is the number of terminal columns for the graph
			pattern := 0

			// Calculate the corresponding pixel columns on the high-resolution canvas
			canvasColLeft := col * 2
			canvasColRight := col*2 + 1

			// Define the mapping of Braille dots to canvas pixel positions
			// Each entry maps a (yOffset, xOffset within 2x4 cell) to a Braille bit
			// xOffset 0 is the left 'pixel' column, xOffset 1 is the right 'pixel' column
			dotMap := []struct {
				yOffset int // Vertical sub-row (0-3 for 4 sub-rows per Braille char row)
				xOffset int // Horizontal sub-column (0 for left dots, 1 for right dots)
				bit     int // The Braille dot bitmask
			}{
				{0, 0, brailleDot1}, // Row 0, Left Col -> Dot 1
				{1, 0, brailleDot2}, // Row 1, Left Col -> Dot 2
				{2, 0, brailleDot3}, // Row 2, Left Col -> Dot 3
				{3, 0, brailleDot7}, // Row 3, Left Col -> Dot 7

				{0, 1, brailleDot4}, // Row 0, Right Col -> Dot 4
				{1, 1, brailleDot5}, // Row 1, Right Col -> Dot 5
				{2, 1, brailleDot6}, // Row 2, Right Col -> Dot 6
				{3, 1, brailleDot8}, // Row 3, Right Col -> Dot 8
			}

			// Iterate through all 8 potential dots for the current Braille character
			for _, dm := range dotMap {
				canvasY := row*4 + dm.yOffset // Calculate absolute Y on the high-res canvas
				canvasX := -1                 // Initialize canvasX for the current dot

				// Determine which canvas column to check based on xOffset
				if dm.xOffset == 0 { // Left dots (1,2,3,7)
					canvasX = canvasColLeft
				} else { // Right dots (4,5,6,8)
					canvasX = canvasColRight
				}

				// Check if the current canvas pixel exists and is set
				// Ensure canvasX is within bounds of canvas[0] (which is canvasWidthPixels)
				if canvasY >= 0 && canvasY < brailleHeight && canvasX >= 0 && canvasX < len(canvas[0]) {
					if canvas[canvasY][canvasX] {
						pattern |= dm.bit // Set the corresponding Braille dot bit
					}
				}
			}

			// If any dots are set, get the Braille character and apply green style
			if pattern > 0 {
				brailleChar := getBrailleChar(pattern)
				targetCol := yAxisWidth + col // Offset by Y-axis width for placing in the final chartGrid

				if targetCol < len(chartGrid[row]) {
					chartGrid[row][targetCol] = greenStyle.Render(brailleChar)
				}
			}
		}
	}
}

func (c *UsageTimeCard) RenderContent(width, height int) string {
	if len(c.usageTimes) == 0 {
		return strings.Repeat("\n", height)
	}

	// Reserve space for x-axis labels (1 row)
	chartHeight := max(height-1, 1)
	
	// Generate the main chart
	chartLines := c.generateBrailleBarChart(c.usageTimes, width, chartHeight)
	
	// Add x-axis time labels
	timeLabels := c.renderTimeLabels(width)
	
	// Combine chart and labels
	return chartLines + "\n" + timeLabels
}

func (c *UsageTimeCard) renderTimeLabels(width int) string {
	if len(c.usageTimes) == 0 {
		return strings.Repeat(" ", width)
	}
	
	// Find min and max timestamps
	minTime := c.usageTimes[0].timestamp
	maxTime := c.usageTimes[0].timestamp
	
	for _, point := range c.usageTimes {
		if point.timestamp.Before(minTime) {
			minTime = point.timestamp
		}
		if point.timestamp.After(maxTime) {
			maxTime = point.timestamp
		}
	}
	
	// Calculate Y-axis width (same as in generateBrailleBarChart)
	maxValue := 0
	for _, val := range c.usageTimes {
		if val.value > maxValue {
			maxValue = val.value
		}
	}
	yAxisWidth := len(fmt.Sprintf("%d", maxValue)) + 1
	
	// Available width for time labels
	labelWidth := width - yAxisWidth
	
	// Format time labels
	startLabel := minTime.Format("15:04")
	endLabel := maxTime.Format("15:04")
	
	// Create the label line
	grayStyle := lipgloss.NewStyle().Foreground(styles.Gray)
	labelLine := strings.Repeat(" ", yAxisWidth) // Y-axis spacing
	
	if labelWidth >= len(startLabel)+len(endLabel)+2 {
		// Enough space for both labels
		labelLine += grayStyle.Render(startLabel)
		
		// Calculate spacing between labels
		middleSpacing := labelWidth - len(startLabel) - len(endLabel)
		labelLine += strings.Repeat(" ", middleSpacing)
		labelLine += grayStyle.Render(endLabel)
	} else if labelWidth >= len(startLabel) {
		// Only space for start label
		labelLine += grayStyle.Render(startLabel)
		labelLine += strings.Repeat(" ", labelWidth-len(startLabel))
	} else {
		// Not enough space for any labels
		labelLine += strings.Repeat(" ", labelWidth)
	}
	
	return labelLine
}

func (c *UsageTimeCard) GetRequiredHeight(width int) int {
	return 8
}