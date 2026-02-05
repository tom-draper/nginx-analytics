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
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

// Braille dot patterns (each character represents a 2x4 grid of dots)
// Dots are numbered:
// 1 4
// 2 5
// 3 6
// 7 8
const (
	brailleDot1 = 1 << 0 // 0x01
	brailleDot2 = 1 << 1 // 0x02
	brailleDot3 = 1 << 2 // 0x04
	brailleDot4 = 1 << 3 // 0x08
	brailleDot5 = 1 << 4 // 0x10
	brailleDot6 = 1 << 5 // 0x20
	brailleDot7 = 1 << 6 // 0x40 (often for 8-dot Braille, below dot 3)
	brailleDot8 = 1 << 7 // 0x80 (often for 8-dot Braille, below dot 6)
)

var braillePatterns = [256]rune{
	// ... (your existing braille patterns array)
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

// activityCardStyles holds all the lipgloss styles for the activity card.
type activityCardStyles struct {
	faint      lipgloss.Style
	green      lipgloss.Style
	blue       lipgloss.Style
	gray       lipgloss.Style
	successRed lipgloss.Style
	// ... add other success rate colors as styles
}

func defaultActivityCardStyles() activityCardStyles {
	return activityCardStyles{
		faint:      lipgloss.NewStyle().Foreground(styles.LightGray),
		green:      lipgloss.NewStyle().Foreground(styles.Green),
		blue:       lipgloss.NewStyle().Foreground(styles.Blue),
		gray:       lipgloss.NewStyle().Foreground(styles.LightGray),
		successRed: lipgloss.NewStyle().Foreground(styles.Red),
	}
}

type ActivityCard struct {
	requests    []point[int]
	users       []point[int]
	successRate []point[float64]
	period      period.Period // Store the period for time range logic
	styles      activityCardStyles
}

func NewActivityCard(logs []nginx.NGINXLog, period period.Period) *ActivityCard {
	card := &ActivityCard{
		period: period,
		styles: defaultActivityCardStyles(),
	}
	card.UpdateCalculated(logs, period)
	return card
}

func (a *ActivityCard) RenderContent(width, height int) string {
	if len(a.requests) == 0 {
		return a.renderNoData(width, height)
	}

	// Determine time range based on period
	var startTime, endTime time.Time
	if a.period == period.PeriodAllTime {
		// For all-time, use the actual data range
		sortedTemp := sortPoints(a.requests)
		startTime = sortedTemp[0].timestamp
		endTime = sortedTemp[len(sortedTemp)-1].timestamp
	} else {
		// For other periods, use the full period range
		startTime = a.period.Start()
		endTime = time.Now()
	}

	// Sort and fill data for consistent chart rendering
	sortedRequests := fillTimeRange(sortPoints(a.requests), startTime, endTime, 0)
	sortedUsers := fillTimeRange(sortPoints(a.users), startTime, endTime, 0)

	// Calculate chart dimensions
	usableWidth := width
	// Reserve space for success rate graph and time range
	chartHeight := max(height-4, 3) // -4 for success rate (2 rows) + time range line + padding
	chartWidth := max(usableWidth-2, 15)

	// Calculate y-axis width for alignment
	maxRequests := 0
	for _, req := range sortedRequests {
		if req.value > maxRequests {
			maxRequests = req.value
		}
	}
	yAxisWidth := len(fmt.Sprintf("%d", maxRequests)) + 1

	var lines []string

	// Generate and append the main chart
	chart := a.generateBrailleBarChart(sortedRequests, sortedUsers, chartWidth, chartHeight)
	lines = append(lines, strings.Split(chart, "\n")...)

	// Add time range info
	lines = append(lines, a.renderTimeRange(sortedRequests, usableWidth))

	// Add success rate label (padded to align with y-axis)
	successRateLabel := strings.Repeat(" ", yAxisWidth) + a.styles.faint.Render("Success Rate:")
	lines = append(lines, successRateLabel)

	// Generate and append success rate graph with matching y-axis alignment
	successRateGraph := a.generateSuccessRateGraph(usableWidth, yAxisWidth)
	lines = append(lines, successRateGraph...)

	// Fill or trim lines to match the required height
	for len(lines) < height {
		lines = append(lines, "")
	}
	if len(lines) > height {
		lines = lines[:height]
	}

	return strings.Join(lines, "\n")
}

func (a *ActivityCard) renderNoData(width, height int) string {
	lines := make([]string, height)
	for i := range lines {
		lines[i] = ""
	}

	noDataMessage := a.styles.faint.Render("No activity found")
	displayLine := (height - 1) / 2 // Center vertically
	if displayLine >= 0 && displayLine < height {
		displayWidth := lipgloss.Width(noDataMessage)
		padding := (width - displayWidth) / 2
		if padding > 0 {
			lines[displayLine] = strings.Repeat(" ", padding) + noDataMessage
		} else {
			lines[displayLine] = noDataMessage
		}
	}
	return strings.Join(lines, "\n")
}

func (a *ActivityCard) renderTimeRange(sortedRequests []point[int], usableWidth int) string {
	var firstTime, lastTime time.Time

	if a.period == period.PeriodAllTime {
		// For all-time, use the actual log range
		if len(sortedRequests) == 0 {
			return ""
		}
		firstTime = sortedRequests[0].timestamp.Local()
		lastTime = sortedRequests[len(sortedRequests)-1].timestamp.Local()
	} else {
		// For other periods, use the full period range (e.g., -24h to now)
		firstTime = a.period.Start().Local()
		lastTime = time.Now().Local()
	}

	// Try full format
	fullFirstTimeStr := firstTime.Format("2006-01-02 15:04:05")
	fullLastTimeStr := lastTime.Format("2006-01-02 15:04:05")

	leftPadding := strings.Repeat(" ", 4)
	rightPadding := strings.Repeat(" ", 2)

	// Calculate space needed for full format
	requiredWidth := len(leftPadding) + lipgloss.Width(a.styles.faint.Render(fullFirstTimeStr)) + lipgloss.Width(a.styles.faint.Render(fullLastTimeStr)) + len(rightPadding) + 2 // 2 for middle space

	var timeRangeLine string
	if requiredWidth <= usableWidth {
		// Enough space, use full format
		availableMiddleSpace := usableWidth - lipgloss.Width(leftPadding) - lipgloss.Width(rightPadding) - lipgloss.Width(a.styles.faint.Render(fullFirstTimeStr)) - lipgloss.Width(a.styles.faint.Render(fullLastTimeStr))
		middleSpacing := strings.Repeat(" ", max(0, availableMiddleSpace))
		timeRangeLine = leftPadding + a.styles.faint.Render(fullFirstTimeStr) + middleSpacing + a.styles.faint.Render(fullLastTimeStr) + rightPadding
	} else {
		// Try shorter format
		shortFirstTimeStr := firstTime.Format("01/02 15:04")
		shortLastTimeStr := lastTime.Format("01/02 15:04")

		requiredWidthShort := len(leftPadding) + lipgloss.Width(a.styles.faint.Render(shortFirstTimeStr)) + lipgloss.Width(a.styles.faint.Render(shortLastTimeStr)) + len(rightPadding) + 2

		if requiredWidthShort <= usableWidth {
			availableMiddleSpace := usableWidth - lipgloss.Width(leftPadding) - lipgloss.Width(rightPadding) - lipgloss.Width(a.styles.faint.Render(shortFirstTimeStr)) - lipgloss.Width(a.styles.faint.Render(shortLastTimeStr))
			middleSpacing := strings.Repeat(" ", max(0, availableMiddleSpace))
			timeRangeLine = leftPadding + a.styles.faint.Render(shortFirstTimeStr) + middleSpacing + a.styles.faint.Render(shortLastTimeStr) + rightPadding
		} else {
			// Fallback: truncate first time if nothing else fits
			maxAvailableForFirst := usableWidth - len(leftPadding) - len(rightPadding) - 3 // 3 for "..."
			if maxAvailableForFirst > 0 {
				truncatedFirst := shortFirstTimeStr
				if lipgloss.Width(shortFirstTimeStr) > maxAvailableForFirst {
					truncatedFirst = truncatedFirst[:maxAvailableForFirst] + "..."
				}
				timeRangeLine = leftPadding + a.styles.faint.Render(truncatedFirst) + rightPadding
			} else {
				timeRangeLine = "" // No space at all
			}
		}
	}
	return timeRangeLine
}

func getBrailleChar(pattern int) string {
	if pattern < 0 || pattern > 255 {
		return " "
	}
	return string(braillePatterns[pattern])
}

func (a *ActivityCard) generateBrailleBarChart(requests []point[int], users []point[int], chartWidth, chartHeight int) string {
	if len(requests) == 0 || chartHeight <= 0 || chartWidth <= 0 {
		return strings.Repeat("\n", chartHeight) // Return empty lines if no data or invalid dimensions
	}

	userMap := make(map[time.Time]int)
	for _, user := range users {
		userMap[user.timestamp] = user.value
	}

	maxRequests := 0
	for _, req := range requests {
		if req.value > maxRequests {
			maxRequests = req.value
		}
	}

	if maxRequests == 0 {
		return strings.Repeat("\n", chartHeight) // Return empty lines if max requests is 0
	}

	yAxisWidth := len(fmt.Sprintf("%d", maxRequests)) + 1 // Max label + 1 for separator
	effectiveChartWidth := max(chartWidth-yAxisWidth, 1)   // Ensure positive chart width for plotting

	// Create the chart grid with Y-axis space
	chartGrid := make([][]string, chartHeight)
	for i := range chartGrid {
		chartGrid[i] = make([]string, chartWidth) // Use original chartWidth here for the final output grid
		for j := range chartGrid[i] {
			chartGrid[i][j] = " "
		}
	}

	// Add Y-axis labels
	a.renderYAxisLabels(chartGrid, maxRequests, chartHeight, yAxisWidth)

	// --- CRUCIAL CHANGE HERE: Canvas width is now 2x effectiveChartWidth ---
	brailleHeight := chartHeight * 4 // Each row can represent 4 sub-rows (dots 1,2,3,7 or 4,5,6,8)
	canvasWidthPixels := effectiveChartWidth * 2 // Each Braille char (1 terminal column) covers 2 pixels
	canvas := make([][]bool, brailleHeight)
	userCanvas := make([][]bool, brailleHeight)
	for i := range canvas {
		canvas[i] = make([]bool, canvasWidthPixels)
		userCanvas[i] = make([]bool, canvasWidthPixels)
	}

	// Draw bars on the high-resolution canvas
	a.drawChartBarsOnCanvas(requests, userMap, canvas, userCanvas, maxRequests, effectiveChartWidth, brailleHeight, canvasWidthPixels)

	// Convert high-resolution canvas to Braille characters and apply styles
	a.convertCanvasToBraille(chartGrid, canvas, userCanvas, yAxisWidth, effectiveChartWidth, chartHeight, brailleHeight)

	// Convert chart grid to string
	lines := make([]string, chartHeight)
	for i, row := range chartGrid {
		lines[i] = strings.Join(row, "")
	}

	return strings.Join(lines, "\n")
}

func (a *ActivityCard) renderYAxisLabels(chartGrid [][]string, maxRequests, height, yAxisWidth int) {
	for row := range height {
		rowValue := int(float64(maxRequests) * float64(height-1-row) / float64(height-1))

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
			labelStart := max(yAxisWidth - len(label) - 1, 0)
			for i, char := range label {
				if labelStart+i < len(chartGrid[row]) {
					chartGrid[row][labelStart+i] = a.styles.gray.Render(string(char))
				}
			}
		}
	}
}

// drawChartBarsOnCanvas now takes canvasWidthPixels
func (a *ActivityCard) drawChartBarsOnCanvas(requests []point[int], userMap map[time.Time]int, canvas, userCanvas [][]bool, maxRequests, effectiveChartWidth, brailleHeight, canvasWidthPixels int) {
	dataPoints := len(requests)
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

		requestCount := requests[dataIndex].value
		userCount := userMap[requests[dataIndex].timestamp]

		barHeight := float64(requestCount) * float64(brailleHeight-1) / float64(maxRequests)
		userHeight := 0.0
		if requestCount > 0 {
			userProportion := float64(userCount) / float64(requestCount)
			userHeight = barHeight * userProportion
		}

		for row := 0; row < int(math.Ceil(barHeight)); row++ {
			canvasRow := brailleHeight - 1 - row // Fill from bottom up
			if canvasRow >= 0 && canvasRow < brailleHeight {
				canvas[canvasRow][canvasCol] = true
				if float64(row) < userHeight {
					userCanvas[canvasRow][canvasCol] = true
				}
			}
		}
	}
}

// Updated convertCanvasToBraille function
func (a *ActivityCard) convertCanvasToBraille(chartGrid [][]string, canvas, userCanvas [][]bool, yAxisWidth, effectiveChartWidth, chartHeight, brailleHeight int) {
	// Iterate through each Braille character position in the *output* grid
	for row := range chartHeight { // chartHeight is the number of terminal rows for the graph
		for col := range effectiveChartWidth { // effectiveChartWidth is the number of terminal columns for the graph
			pattern := 0
			isUser := false

			// Calculate the corresponding pixel columns on the high-resolution canvas
			canvasColLeft := col * 2
			canvasColRight := col * 2 + 1

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
				canvasX := -1                  // Initialize canvasX for the current dot

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
						if userCanvas[canvasY][canvasX] {
							isUser = true // Mark as user dot if applicable
						}
					}
				}
			}

			// If any dots are set, get the Braille character and apply style
			if pattern > 0 {
				brailleChar := getBrailleChar(pattern)
				targetCol := yAxisWidth + col // Offset by Y-axis width for placing in the final chartGrid

				if targetCol < len(chartGrid[row]) {
					if isUser {
						chartGrid[row][targetCol] = a.styles.blue.Render(brailleChar)
					} else {
						chartGrid[row][targetCol] = a.styles.green.Render(brailleChar)
					}
				}
			}
		}
	}
}

func (a *ActivityCard) generateSuccessRateGraph(width int, yAxisWidth int) []string {
	if len(a.successRate) == 0 {
		return []string{"", ""} // Return empty lines if no success rate data
	}

	// Determine time range based on period
	var startTime, endTime time.Time
	if a.period == period.PeriodAllTime {
		sortedTemp := sortPoints(a.successRate)
		startTime = sortedTemp[0].timestamp
		endTime = sortedTemp[len(sortedTemp)-1].timestamp
	} else {
		startTime = a.period.Start()
		endTime = time.Now()
	}

	sortedSuccessRate := fillTimeRange(sortPoints(a.successRate), startTime, endTime, -1.0) // -1 means no data

	leftPadding := yAxisWidth // Use calculated y-axis width for alignment
	rightPadding := 2
	graphWidth := width - leftPadding - rightPadding

	if graphWidth <= 0 {
		return []string{"", ""}
	}

	topRow := make([]string, graphWidth)
	bottomRow := make([]string, graphWidth)

	dataPoints := len(sortedSuccessRate)

	for i := range graphWidth {
		dataIndex := (i * dataPoints) / graphWidth
		if dataIndex >= dataPoints {
			dataIndex = dataPoints - 1
		}

		successRate := sortedSuccessRate[dataIndex].value
		color := lipgloss.NewStyle().Foreground(a.getSuccessRateColor(successRate))

		coloredChar := color.Render("█")
		topRow[i] = coloredChar
		bottomRow[i] = coloredChar
	}

	leftPadStr := strings.Repeat(" ", leftPadding)
	rightPadStr := strings.Repeat(" ", rightPadding)

	return []string{
		leftPadStr + strings.Join(topRow, "") + rightPadStr,
		leftPadStr + strings.Join(bottomRow, "") + rightPadStr,
	}
}

func (a *ActivityCard) getSuccessRateColor(rate float64) lipgloss.Color {
	if rate == -1 { // Assuming -1 means no data, though 0.0 could also imply 0% success.
		return styles.LightGray // Grey for no data
	}
	switch {
	case rate >= 0.9:
		return styles.Green
	case rate >= 0.8:
		return lipgloss.Color("154") // Light Green/Chartreuse
	case rate >= 0.7:
		return styles.Yellow
	case rate >= 0.6:
		return lipgloss.Color("214") // Orange-Yellow
	case rate >= 0.5:
		return styles.Orange
	case rate >= 0.4:
		return lipgloss.Color("202") // Dark Orange/Reddish-Orange
	default:
		return styles.Red
	}
}

func (r *ActivityCard) UpdateCalculated(logs []nginx.NGINXLog, period period.Period) {
	r.period = period // Store the period
	r.requests = getRequests(logs)
	r.users = getUsers(logs)
	r.successRate = getSuccessRates(logs)
}

type point[T ~int | ~float32 | ~float64] struct {
	timestamp time.Time
	value     T
}

// sortPoints is a generic helper to sort slices of point[T] by timestamp.
func sortPoints[T ~int | ~float32 | ~float64](points []point[T]) []point[T] {
	sorted := make([]point[T], len(points))
	copy(sorted, points)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].timestamp.Before(sorted[j].timestamp)
	})
	return sorted
}

func getRequests(logs []nginx.NGINXLog) []point[int] {
	requestBuckets := make(map[time.Time]int)
	for _, log := range logs {
		if log.Timestamp == nil {
			continue
		}
		timeBucket := nearestHour(*log.Timestamp)
		requestBuckets[timeBucket]++
	}

	requests := make([]point[int], 0, len(requestBuckets))
	for timestamp, count := range requestBuckets {
		requests = append(requests, point[int]{value: count, timestamp: timestamp})
	}

	return requests
}

func getUsers(logs []nginx.NGINXLog) []point[int] {
	userBuckets := make(map[time.Time]map[string]struct{})
	for _, log := range logs {
		if log.Timestamp == nil {
			continue
		}
		timeBucket := nearestHour(*log.Timestamp)
		userID := u.UserID(log)
		if userBuckets[timeBucket] == nil {
			userBuckets[timeBucket] = make(map[string]struct{})
		}
		userBuckets[timeBucket][userID] = struct{}{}
	}

	users := make([]point[int], 0, len(userBuckets))
	for timestamp, unique := range userBuckets {
		count := len(unique)
		users = append(users, point[int]{value: count, timestamp: timestamp})
	}

	return users
}

func getSuccessRates(logs []nginx.NGINXLog) []point[float64] {
	successRateBuckets := make(map[time.Time]struct {
		success int
		total   int
	})

	for _, log := range logs {
		if log.Timestamp == nil || log.Status == nil {
			continue
		}
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

// fillTimeRange fills in missing hours with zero values for complete time coverage
func fillTimeRange[T ~int | ~float64](points []point[T], startTime, endTime time.Time, defaultValue T) []point[T] {
	if len(points) == 0 && startTime.IsZero() {
		return points
	}

	// Create a map of existing points
	pointMap := make(map[time.Time]T)
	for _, p := range points {
		pointMap[nearestHour(p.timestamp)] = p.value
	}

	// Determine start and end times
	start := nearestHour(startTime)
	end := nearestHour(endTime)

	// Generate all hours in the range
	var filledPoints []point[T]
	for t := start; !t.After(end); t = t.Add(time.Hour) {
		if val, exists := pointMap[t]; exists {
			filledPoints = append(filledPoints, point[T]{timestamp: t, value: val})
		} else {
			filledPoints = append(filledPoints, point[T]{timestamp: t, value: defaultValue})
		}
	}

	return filledPoints
}
