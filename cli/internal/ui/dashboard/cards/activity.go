package cards

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	u "github.com/tom-draper/nginx-analytics/cli/internal/logs/user"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard/plot"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

type ActivityCard struct {
	requests    []point[int]
	users       []point[int]
	successRate []point[float64]
	period      period.Period // Store the period for time range logic
}

func NewActivityCard(logs []nginx.NGINXLog, period period.Period) *ActivityCard {
	card := &ActivityCard{
		period: period,
	}
	card.UpdateCalculated(logs, period)
	return card
}

func (a *ActivityCard) RenderContent(width, height int) string {
	if len(a.requests) == 0 {
		faintStyle := lipgloss.NewStyle().Foreground(styles.LightGray)
		lines := []string{
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			faintStyle.Render("No activity data available"),
		}

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

	// Sort requests by timestamp
	sortedRequests := make([]point[int], len(a.requests))
	copy(sortedRequests, a.requests)
	sort.Slice(sortedRequests, func(i, j int) bool {
		return sortedRequests[i].timestamp.Before(sortedRequests[j].timestamp)
	})

	// Sort users by timestamp
	sortedUsers := make([]point[int], len(a.users))
	copy(sortedUsers, a.users)
	sort.Slice(sortedUsers, func(i, j int) bool {
		return sortedUsers[i].timestamp.Before(sortedUsers[j].timestamp)
	})

	// Calculate chart dimensions
	usableWidth := width
	// Reserve 2 rows at bottom for success rate graph
	chartHeight := max(height-4, 3) // -4 for success rate graph (2 rows) + time range line + padding
	chartWidth := max(usableWidth-2, 15)

	// Generate custom bar chart with Braille characters
	chart := a.generateBrailleBarChart(sortedRequests, sortedUsers, chartWidth, chartHeight)

	// Split chart into lines
	chartLines := strings.Split(chart, "\n")

	// Aggressively truncate lines that are too long
	maxLineWidth := usableWidth - 2
	for i, line := range chartLines {
		if lipgloss.Width(line) > maxLineWidth {
			chartLines[i] = line[:maxLineWidth]
		}
	}

	// Add chart lines
	lines := []string{}
	lines = append(lines, chartLines...)

	faintStyle := lipgloss.NewStyle().Foreground(styles.LightGray)
	// Add time range info if we have data
	if len(sortedRequests) > 0 {

		// Format timestamps in local datetime format
		firstTime := sortedRequests[0].timestamp.Local().Format("2006-01-02 15:04:05")

		// Dynamic end time based on period
		var lastTime string
		if a.period == period.PeriodAllTime {
			// For PeriodAllTime, use the last timestamp from data
			lastTime = sortedRequests[len(sortedRequests)-1].timestamp.Local().Format("2006-01-02 15:04:05")
		} else {
			// For other periods, use current datetime
			lastTime = time.Now().Local().Format("2006-01-02 15:04:05")
		}

		// Apply faint style to the times
		styledFirstTime := faintStyle.Render(firstTime)
		styledLastTime := faintStyle.Render(lastTime)

		// Calculate padding
		leftPadding := strings.Repeat(" ", 4)
		rightPadding := strings.Repeat(" ", 2)

		// Calculate available space for the middle section
		firstTimeWidth := lipgloss.Width(styledFirstTime)
		lastTimeWidth := lipgloss.Width(styledLastTime)
		availableMiddleSpace := usableWidth - 4 - firstTimeWidth - lastTimeWidth - 2 // padding + time widths

		var timeRangeLine string
		if availableMiddleSpace >= 0 {
			// Enough space - align first time to left with padding, last time to right with padding
			middleSpacing := strings.Repeat(" ", availableMiddleSpace)
			timeRangeLine = leftPadding + styledFirstTime + middleSpacing + styledLastTime + rightPadding
		} else {
			// Not enough space - truncate or abbreviate
			// Try shorter format first
			firstTimeShort := sortedRequests[0].timestamp.Local().Format("01/02 15:04")

			var lastTimeShort string
			if a.period == period.PeriodAllTime {
				lastTimeShort = sortedRequests[len(sortedRequests)-1].timestamp.Local().Format("01/02 15:04")
			} else {
				lastTimeShort = time.Now().Local().Format("01/02 15:04")
			}

			styledFirstTimeShort := faintStyle.Render(firstTimeShort)
			styledLastTimeShort := faintStyle.Render(lastTimeShort)

			firstTimeShortWidth := lipgloss.Width(styledFirstTimeShort)
			lastTimeShortWidth := lipgloss.Width(styledLastTimeShort)
			availableMiddleSpaceShort := usableWidth - 4 - firstTimeShortWidth - lastTimeShortWidth - 2

			if availableMiddleSpaceShort >= 0 {
				middleSpacing := strings.Repeat(" ", availableMiddleSpaceShort)
				timeRangeLine = leftPadding + styledFirstTimeShort + middleSpacing + styledLastTimeShort + rightPadding
			} else {
				// Still not enough space - just show what fits
				maxAvailable := usableWidth - 6 // padding
				if firstTimeShortWidth <= maxAvailable {
					timeRangeLine = leftPadding + styledFirstTimeShort + strings.Repeat(" ", 2)
				} else {
					// Truncate to fit
					truncated := firstTimeShort[:min(len(firstTimeShort), maxAvailable-3)] + "..."
					timeRangeLine = leftPadding + faintStyle.Render(truncated) + rightPadding
				}
			}
		}

		lines = append(lines, timeRangeLine)
	}

	lines = append(lines, faintStyle.Render("    Success Rate:"))

	// Generate success rate graph (2 rows at bottom)
	successRateGraph := a.generateSuccessRateGraph(usableWidth)
	lines = append(lines, successRateGraph...)

	// Fill to height or trim if necessary
	for len(lines) < height {
		lines = append(lines, "")
	}
	if len(lines) > height {
		lines = lines[:height]
	}

	return strings.Join(lines, "\n")
}

func (p *ActivityCard) generateCustomBarChart(requests []point[int], users []point[int], width, height int) string {
	if len(requests) == 0 {
		return strings.Repeat("\n", height-1)
	}

	// Create a map for quick user lookup by timestamp
	userMap := make(map[time.Time]int)
	for _, user := range users {
		userMap[user.timestamp] = user.value
	}

	// Find the maximum request count for scaling
	maxRequests := 0
	for _, req := range requests {
		if req.value > maxRequests {
			maxRequests = req.value
		}
	}

	if maxRequests == 0 {
		return strings.Repeat("\n", height-1)
	}

	// Calculate Y-axis label width (need space for the largest number plus some padding)
	maxLabel := fmt.Sprintf("%d", maxRequests)
	yAxisWidth := len(maxLabel) + 1 // +1 for space after number

	// Adjust chart width to account for Y-axis
	chartWidth := max(width-yAxisWidth, 10)

	// Create the chart grid (full width including Y-axis)
	chart := make([][]string, height)
	for i := range chart {
		chart[i] = make([]string, width)
		for j := range chart[i] {
			chart[i][j] = " "
		}
	}

	// Calculate how many data points we can fit in the chart width (excluding Y-axis)
	dataPoints := len(requests)

	// Green and blue styles
	greenStyle := lipgloss.NewStyle().Foreground(styles.Green)
	blueStyle := lipgloss.NewStyle().Foreground(styles.Blue)
	grayStyle := lipgloss.NewStyle().Foreground(styles.LightGray)

	// Add Y-axis labels
	for row := range height {
		// Calculate the value this row represents
		rowFromTop := row
		rowValue := int(float64(maxRequests) * float64(height-1-rowFromTop) / float64(height-1))

		// Only show labels for certain rows to avoid clutter
		showLabel := false
		if height <= 8 {
			// For small charts, show every other row
			showLabel = row%2 == 0
		} else if height <= 15 {
			// For medium charts, show every 3rd row
			showLabel = row%3 == 0
		} else {
			// For large charts, show every 4th row
			showLabel = row%4 == 0
		}

		// Always show the top and bottom labels
		if row == 0 || row == height-1 {
			showLabel = true
		}

		if showLabel && rowValue >= 0 {
			label := fmt.Sprintf("%d", rowValue)
			// Right-align the label within the Y-axis space
			labelStart := yAxisWidth - len(label) - 1
			if labelStart >= 0 {
				for i, char := range label {
					if labelStart+i < len(chart[row]) {
						chart[row][labelStart+i] = grayStyle.Render(string(char))
					}
				}
			}
		}
	}

	for col := 0; col < chartWidth && col < dataPoints; col++ {
		// Map column to data point
		dataIndex := (col * dataPoints) / chartWidth
		if dataIndex >= dataPoints {
			dataIndex = dataPoints - 1
		}

		requestCount := requests[dataIndex].value
		userCount := userMap[requests[dataIndex].timestamp]

		// Calculate bar height (scale to chart height)
		// Use height-1 to leave room for potential fractional bars
		barHeight := float64(requestCount) * float64(height-1) / float64(maxRequests)

		// Calculate user proportion height
		userProportion := 0.0
		if requestCount > 0 {
			userProportion = float64(userCount) / float64(requestCount)
		}
		userHeight := barHeight * userProportion

		// Adjust column position to account for Y-axis
		chartCol := col + yAxisWidth

		// Draw the bars from bottom to top
		for row := height - 1; row >= 0; row-- {
			// Calculate how much of this row should be filled
			rowFromBottom := height - 1 - row

			// Calculate total bar fill for this row (always use the full request height)
			totalFill := 0.0
			if barHeight > float64(rowFromBottom+1) {
				totalFill = 1.0 // Full block
			} else if barHeight > float64(rowFromBottom) {
				totalFill = barHeight - float64(rowFromBottom) // Partial block
			}

			if totalFill > 0 {
				// Determine if this row should be blue or green
				// Blue if we're within the user height, green otherwise
				rowBottomPosition := float64(rowFromBottom)
				rowTopPosition := float64(rowFromBottom + 1)

				useBlue := userHeight > rowBottomPosition

				// If we're at the exact border where user height ends,
				// we might need to handle partial coloring
				if userHeight > rowBottomPosition && userHeight < rowTopPosition {
					// We're in the transition row - use blue for the user portion
					useBlue = true
				}

				charIndex := min(int(math.Round(totalFill*8)), 8)

				if chartCol < len(chart[row]) {
					barChar := plot.BarChars[charIndex]
					if useBlue {
						chart[row][chartCol] = blueStyle.Render(barChar)
					} else {
						chart[row][chartCol] = greenStyle.Render(barChar)
					}
				}
			}
		}
	}

	// Convert chart to string
	lines := make([]string, height)
	for i, row := range chart {
		lines[i] = strings.Join(row, "")
	}

	return strings.Join(lines, "\n")
}

// Braille dot patterns (each character represents a 2x4 grid of dots)
// Dots are numbered:
// 1 4
// 2 5  
// 3 6
// 7 8
var braillePatterns = [256]rune{
	0x2800, 0x2801, 0x2802, 0x2803, 0x2804, 0x2805, 0x2806, 0x2807,
	0x2808, 0x2809, 0x280A, 0x280B, 0x280C, 0x280D, 0x280E, 0x280F,
	0x2810, 0x2811, 0x2812, 0x2813, 0x2814, 0x2815, 0x2816, 0x2817,
	0x2818, 0x2819, 0x281A, 0x281B, 0x281C, 0x281D, 0x281E, 0x281F,
	0x2820, 0x2821, 0x2822, 0x2823, 0x2824, 0x2825, 0x2826, 0x2827,
	0x2828, 0x2829, 0x282A, 0x282B, 0x282C, 0x282D, 0x282E, 0x282F,
	0x2830, 0x2831, 0x2832, 0x2833, 0x2834, 0x2835, 0x2836, 0x2837,
	0x2838, 0x2839, 0x283A, 0x283B, 0x283C, 0x283D, 0x283E, 0x283F,
	0x2840, 0x2841, 0x2842, 0x2843, 0x2844, 0x2845, 0x2846, 0x2847,
	0x2848, 0x2849, 0x284A, 0x284B, 0x284C, 0x284D, 0x284E, 0x284F,
	0x2850, 0x2851, 0x2852, 0x2853, 0x2854, 0x2855, 0x2856, 0x2857,
	0x2858, 0x2859, 0x285A, 0x285B, 0x285C, 0x285D, 0x285E, 0x285F,
	0x2860, 0x2861, 0x2862, 0x2863, 0x2864, 0x2865, 0x2866, 0x2867,
	0x2868, 0x2869, 0x286A, 0x286B, 0x286C, 0x286D, 0x286E, 0x286F,
	0x2870, 0x2871, 0x2872, 0x2873, 0x2874, 0x2875, 0x2876, 0x2877,
	0x2878, 0x2879, 0x287A, 0x287B, 0x287C, 0x287D, 0x287E, 0x287F,
	0x2880, 0x2881, 0x2882, 0x2883, 0x2884, 0x2885, 0x2886, 0x2887,
	0x2888, 0x2889, 0x288A, 0x288B, 0x288C, 0x288D, 0x288E, 0x288F,
	0x2890, 0x2891, 0x2892, 0x2893, 0x2894, 0x2895, 0x2896, 0x2897,
	0x2898, 0x2899, 0x289A, 0x289B, 0x289C, 0x289D, 0x289E, 0x289F,
	0x28A0, 0x28A1, 0x28A2, 0x28A3, 0x28A4, 0x28A5, 0x28A6, 0x28A7,
	0x28A8, 0x28A9, 0x28AA, 0x28AB, 0x28AC, 0x28AD, 0x28AE, 0x28AF,
	0x28B0, 0x28B1, 0x28B2, 0x28B3, 0x28B4, 0x28B5, 0x28B6, 0x28B7,
	0x28B8, 0x28B9, 0x28BA, 0x28BB, 0x28BC, 0x28BD, 0x28BE, 0x28BF,
	0x28C0, 0x28C1, 0x28C2, 0x28C3, 0x28C4, 0x28C5, 0x28C6, 0x28C7,
	0x28C8, 0x28C9, 0x28CA, 0x28CB, 0x28CC, 0x28CD, 0x28CE, 0x28CF,
	0x28D0, 0x28D1, 0x28D2, 0x28D3, 0x28D4, 0x28D5, 0x28D6, 0x28D7,
	0x28D8, 0x28D9, 0x28DA, 0x28DB, 0x28DC, 0x28DD, 0x28DE, 0x28DF,
	0x28E0, 0x28E1, 0x28E2, 0x28E3, 0x28E4, 0x28E5, 0x28E6, 0x28E7,
	0x28E8, 0x28E9, 0x28EA, 0x28EB, 0x28EC, 0x28ED, 0x28EE, 0x28EF,
	0x28F0, 0x28F1, 0x28F2, 0x28F3, 0x28F4, 0x28F5, 0x28F6, 0x28F7,
	0x28F8, 0x28F9, 0x28FA, 0x28FB, 0x28FC, 0x28FD, 0x28FE, 0x28FF,
}

func getBrailleChar(pattern int) string {
	if pattern < 0 || pattern > 255 {
		return " "
	}
	return string(braillePatterns[pattern])
}

func (p *ActivityCard) generateBrailleBarChart(requests []point[int], users []point[int], width, height int) string {
	if len(requests) == 0 {
		return strings.Repeat("\n", height-1)
	}

	// Create a map for quick user lookup by timestamp
	userMap := make(map[time.Time]int)
	for _, user := range users {
		userMap[user.timestamp] = user.value
	}

	// Find the maximum request count for scaling
	maxRequests := 0
	for _, req := range requests {
		if req.value > maxRequests {
			maxRequests = req.value
		}
	}

	if maxRequests == 0 {
		return strings.Repeat("\n", height-1)
	}

	// Calculate Y-axis label width
	maxLabel := fmt.Sprintf("%d", maxRequests)
	yAxisWidth := len(maxLabel) + 1

	// Adjust chart width to account for Y-axis
	chartWidth := max(width-yAxisWidth, 10)

	// Create the chart grid
	chart := make([][]string, height)
	for i := range chart {
		chart[i] = make([]string, width)
		for j := range chart[i] {
			chart[i][j] = " "
		}
	}

	// Green and blue styles
	greenStyle := lipgloss.NewStyle().Foreground(styles.Green)
	blueStyle := lipgloss.NewStyle().Foreground(styles.Blue)
	grayStyle := lipgloss.NewStyle().Foreground(styles.LightGray)

	// Add Y-axis labels
	for row := range height {
		rowFromTop := row
		rowValue := int(float64(maxRequests) * float64(height-1-rowFromTop) / float64(height-1))

		showLabel := false
		if height <= 8 {
			showLabel = row%2 == 0
		} else if height <= 15 {
			showLabel = row%3 == 0
		} else {
			showLabel = row%4 == 0
		}

		if row == 0 || row == height-1 {
			showLabel = true
		}

		if showLabel && rowValue >= 0 {
			label := fmt.Sprintf("%d", rowValue)
			labelStart := yAxisWidth - len(label) - 1
			if labelStart >= 0 {
				for i, char := range label {
					if labelStart+i < len(chart[row]) {
						chart[row][labelStart+i] = grayStyle.Render(string(char))
					}
				}
			}
		}
	}

	// Calculate data points
	dataPoints := len(requests)

	// Since each Braille character represents 2x4 dots, we can fit twice as many columns
	// and have 4 times the vertical resolution per row
	brailleWidth := chartWidth
	brailleHeight := height * 4 // Each row can represent 4 sub-rows

	// Create a virtual canvas with higher resolution
	canvas := make([][]bool, brailleHeight)
	userCanvas := make([][]bool, brailleHeight) // Track which dots are users vs requests
	for i := range canvas {
		canvas[i] = make([]bool, brailleWidth)
		userCanvas[i] = make([]bool, brailleWidth)
	}

	// Draw bars on the high-resolution canvas
	for col := 0; col < brailleWidth && col < dataPoints; col++ {
		dataIndex := (col * dataPoints) / brailleWidth
		if dataIndex >= dataPoints {
			dataIndex = dataPoints - 1
		}

		requestCount := requests[dataIndex].value
		userCount := userMap[requests[dataIndex].timestamp]

		// Calculate bar height in high resolution
		barHeight := float64(requestCount) * float64(brailleHeight-1) / float64(maxRequests)
		userHeight := 0.0
		if requestCount > 0 {
			userProportion := float64(userCount) / float64(requestCount)
			userHeight = barHeight * userProportion
		}

		// Fill the canvas from bottom up
		for row := 0; row < int(math.Ceil(barHeight)); row++ {
			canvasRow := brailleHeight - 1 - row
			if canvasRow >= 0 && canvasRow < brailleHeight {
				canvas[canvasRow][col] = true
				// Mark as user if within user height
				if float64(row) < userHeight {
					userCanvas[canvasRow][col] = true
				}
			}
		}
	}

	// Convert high-resolution canvas to Braille characters
	for row := range height {
		for col := yAxisWidth; col < yAxisWidth+brailleWidth; col++ {
			// Each Braille character represents a 2x4 area
			brailleCol := col - yAxisWidth
			if brailleCol >= brailleWidth {
				continue
			}

			pattern := 0
			isUser := false

			// Check each of the 8 dots in the Braille character
			// Dots are arranged as:
			// 1 4
			// 2 5
			// 3 6
			// 7 8
			dotPositions := []struct{ y, x int }{
				{row*4 + 0, brailleCol}, // dot 1
				{row*4 + 1, brailleCol}, // dot 2
				{row*4 + 2, brailleCol}, // dot 3
				{row*4 + 3, brailleCol}, // dot 7
				{row*4 + 0, brailleCol}, // dot 4 (same as 1 since we only have 1 column per char)
				{row*4 + 1, brailleCol}, // dot 5 (same as 2)
				{row*4 + 2, brailleCol}, // dot 6 (same as 3)
				{row*4 + 3, brailleCol}, // dot 8 (same as 7)
			}

			// For single-width characters, we only use dots 1,2,3,7 (left column)
			for i := range 4 {
				y, x := dotPositions[i].y, dotPositions[i].x
				if y >= 0 && y < brailleHeight && x >= 0 && x < brailleWidth {
					if canvas[y][x] {
						pattern |= (1 << i)
						if userCanvas[y][x] {
							isUser = true
						}
					}
				}
			}

			if pattern > 0 {
				brailleChar := getBrailleChar(pattern)
				if isUser {
					chart[row][col] = blueStyle.Render(brailleChar)
				} else {
					chart[row][col] = greenStyle.Render(brailleChar)
				}
			}
		}
	}

	// Convert chart to string
	lines := make([]string, height)
	for i, row := range chart {
		lines[i] = strings.Join(row, "")
	}

	return strings.Join(lines, "\n")
}

func (p *ActivityCard) generateSuccessRateGraph(width int) []string {
	if len(p.successRate) == 0 {
		// Return empty lines if no success rate data
		return []string{"", ""}
	}

	// Sort success rate data by timestamp
	sortedSuccessRate := make([]point[float64], len(p.successRate))
	copy(sortedSuccessRate, p.successRate)
	sort.Slice(sortedSuccessRate, func(i, j int) bool {
		return sortedSuccessRate[i].timestamp.Before(sortedSuccessRate[j].timestamp)
	})

	// Calculate available width for the graph (total width - padding)
	leftPadding := 4
	rightPadding := 2
	graphWidth := width - leftPadding - rightPadding

	// Ensure we have a positive graph width
	if graphWidth <= 0 {
		// If width is too small, return empty lines
		return []string{"", ""}
	}

	// Create two rows for the graph
	topRow := make([]string, graphWidth)
	bottomRow := make([]string, graphWidth)

	// Calculate how many data points we can fit in the graph width
	dataPoints := len(sortedSuccessRate)
	if dataPoints == 0 {
		// Fill with spaces if no data
		for i := range graphWidth {
			topRow[i] = " "
			bottomRow[i] = " "
		}
	} else {
		// Distribute data points across the graph width
		for i := range graphWidth {
			// Map position to data point
			dataIndex := (i * dataPoints) / graphWidth
			if dataIndex >= dataPoints {
				dataIndex = dataPoints - 1
			}

			successRate := sortedSuccessRate[dataIndex].value
			color := lipgloss.NewStyle().Foreground(p.getSuccessRateColor(successRate))

			// Create colored vertical bar (2 characters high)
			coloredChar := color.Render("█")
			topRow[i] = coloredChar
			bottomRow[i] = coloredChar
		}
	}

	// Create padding strings
	leftPad := strings.Repeat(" ", leftPadding)
	rightPad := strings.Repeat(" ", rightPadding)

	return []string{
		leftPad + strings.Join(topRow, "") + rightPad,
		leftPad + strings.Join(bottomRow, "") + rightPad,
	}
}

// func (p *ActivityCard) getSuccessRateColor(rate float64) lipgloss.Style {
// 	// Green for high success rates (>= 0.95)
// 	if rate >= 0.95 {
// 		return lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00"))
// 	}
// 	// Red for low success rates (< 0.05)
// 	if rate < 0.05 {
// 		return lipgloss.NewStyle().Foreground(lipgloss.Color("#FF0000"))
// 	}
// 	// Yellow for medium success rates (around 0.5)
// 	if rate >= 0.4 && rate <= 0.6 {
// 		return lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFF00"))
// 	}
// 	// Orange for moderate-low success rates (0.05 - 0.4)
// 	if rate < 0.4 {
// 		return lipgloss.NewStyle().Foreground(lipgloss.Color("#FF8000"))
// 	}
// 	// Light green for good success rates (0.6 - 0.95)
// 	return lipgloss.NewStyle().Foreground(lipgloss.Color("#80FF00"))
// }

func (p *ActivityCard) getSuccessRateColor(rate float64) lipgloss.Color {
	if rate == -1 {
		return styles.LightGray // Grey for no data
	}
	switch {
	case rate >= 0.9:
		return styles.Green // Best: Green
	case rate >= 0.8:
		return lipgloss.Color("154") // Light Green/Chartreuse
	case rate >= 0.7:
		return styles.Yellow // Yellow
	case rate >= 0.6:
		return lipgloss.Color("214") // Orange-Yellow
	case rate >= 0.5:
		return styles.Orange // Orange
	case rate >= 0.4:
		return lipgloss.Color("202") // Dark Orange/Reddish-Orange
	default:
		return styles.Red // Worst: Red
	}
}

func (r *ActivityCard) UpdateCalculated(logs []nginx.NGINXLog, period period.Period) {
	r.period = period // Store the period
	r.requests = getRequests(logs, period)
	r.users = getUsers(logs, period)
	r.successRate = getSuccessRates(logs, period)
}

type point[T ~int | ~float32 | ~float64] struct {
	timestamp time.Time
	value     T
}

func getRequests(logs []nginx.NGINXLog, period period.Period) []point[int] {
	requestBuckets := make(map[time.Time]int, 0)
	for _, log := range logs {
		timeBucket := nearestHour(*log.Timestamp)
		requestBuckets[timeBucket]++
	}

	requests := make([]point[int], 0)
	for timestamp, count := range requestBuckets {
		requests = append(requests, point[int]{value: count, timestamp: timestamp})
	}

	return requests
}

func getUsers(logs []nginx.NGINXLog, period period.Period) []point[int] {
	userBuckets := make(map[time.Time]map[string]struct{}, 0)
	for _, log := range logs {
		timeBucket := nearestHour(*log.Timestamp)
		userID := u.UserID(log)
		if userBuckets[timeBucket] == nil {
			userBuckets[timeBucket] = make(map[string]struct{})
		}
		userBuckets[timeBucket][userID] = struct{}{}
	}

	users := make([]point[int], 0)
	for timestamp, unique := range userBuckets {
		count := len(unique)
		users = append(users, point[int]{value: count, timestamp: timestamp})
	}

	return users
}

func getSuccessRates(logs []nginx.NGINXLog, period period.Period) []point[float64] {
	successRateBuckets := make(map[time.Time]struct {
		success int
		total   int
	})

	for _, log := range logs {
		t := nearestHour(*log.Timestamp)
		bucket := successRateBuckets[t]

		success := *log.Status >= 200 && *log.Status < 400
		if success {
			bucket.success++
		}
		bucket.total++

		successRateBuckets[t] = bucket
	}

	successRates := make([]point[float64], 0, len(successRateBuckets))
	for timestamp, counts := range successRateBuckets {
		rate := 0.0
		if counts.total > 0 {
			rate = float64(counts.success) / float64(counts.total)
		}
		successRates = append(successRates, point[float64]{
			timestamp: timestamp,
			value:     rate,
		})
	}

	return successRates
}

func nearestHour(timestamp time.Time) time.Time {
	return timestamp.Truncate(time.Hour)
}