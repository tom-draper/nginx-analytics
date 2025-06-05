package cards

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	n "github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	p "github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	u "github.com/tom-draper/nginx-analytics/cli/internal/logs/user"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

type ActivityCard struct {
	requests    []point[int]
	users       []point[int]
	successRate []point[float64]
	period      p.Period // Store the period for time range logic
}

func NewActivityCard(logs []n.NGINXLog, period p.Period) *ActivityCard {
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

	// Generate custom bar chart
	chart := a.generateCustomBarChart(sortedRequests, sortedUsers, chartWidth, chartHeight)

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
		if a.period == p.PeriodAllTime {
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
			if a.period == p.PeriodAllTime {
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
	chartWidth := max(width - yAxisWidth, 10)

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
				
				charIndex := min(int(math.Round(totalFill * 8)), 8)
				
				if chartCol < len(chart[row]) {
					if useBlue {
						chart[row][chartCol] = blueStyle.Render(barChars[charIndex])
					} else {
						chart[row][chartCol] = greenStyle.Render(barChars[charIndex])
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
			color := p.getSuccessRateColor(successRate)

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

func (p *ActivityCard) getSuccessRateColor(rate float64) lipgloss.Style {
	// Green for high success rates (>= 0.95)
	if rate >= 0.95 {
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00"))
	}
	// Red for low success rates (< 0.05)
	if rate < 0.05 {
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#FF0000"))
	}
	// Yellow for medium success rates (around 0.5)
	if rate >= 0.4 && rate <= 0.6 {
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFF00"))
	}
	// Orange for moderate-low success rates (0.05 - 0.4)
	if rate < 0.4 {
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#FF8000"))
	}
	// Light green for good success rates (0.6 - 0.95)
	return lipgloss.NewStyle().Foreground(lipgloss.Color("#80FF00"))
}

func (p *ActivityCard) GetTitle() string {
	return "Activity"
}

func (r *ActivityCard) UpdateCalculated(logs []n.NGINXLog, period p.Period) {
	r.period = period // Store the period
	r.requests = getRequests(logs, period)
	r.users = getUsers(logs, period)
	r.successRate = getSuccessRates(logs, period)
}

type point[T ~int | ~float32 | ~float64] struct {
	timestamp time.Time
	value     T
}

func getRequests(logs []n.NGINXLog, period p.Period) []point[int] {
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

func getUsers(logs []n.NGINXLog, period p.Period) []point[int] {
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

func getSuccessRates(logs []n.NGINXLog, period p.Period) []point[float64] {
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