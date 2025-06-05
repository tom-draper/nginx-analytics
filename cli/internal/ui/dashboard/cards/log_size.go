package cards

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/agent/pkg/logs"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

// LogSizeCard shows log file sizes with proportional color bars
type LogSizeCard struct {
	sizes []size
}

type size struct {
	name string
	size int64
}

func NewLogSizeCard(sizes logs.LogSizes) *LogSizeCard {
	card := &LogSizeCard{}
	card.UpdateSystem(sizes)
	return card
}

func (p *LogSizeCard) RenderContent(width, height int) string {
	lines := []string{}
	
	if len(p.sizes) == 0 {
		// No data available
		lines = append(lines, strings.Repeat("░", width)) // Gray bar for no data
		lines = append(lines, centerText("No log data", width))
	} else {
		// Calculate total size
		totalSize := int64(0)
		for _, s := range p.sizes {
			totalSize += s.size
		}
		
		if totalSize == 0 {
			lines = append(lines, strings.Repeat("░", width))
			lines = append(lines, centerText("No log data", width))
		} else {
			// Color palette for different log files
			colors := []lipgloss.Color{
				styles.Green,
				styles.Blue,
				styles.Red,
				"#FF6B35", // Orange
				"#7209B7", // Purple
				"#C77DFF", // Light Purple
				"#E0AAFF", // Lighter Purple
			}
			
			// Sort files by size (largest first) to prioritize visible files
			sortedSizes := make([]size, len(p.sizes))
			copy(sortedSizes, p.sizes)
			
			// Simple bubble sort by size (descending)
			for i := 0; i < len(sortedSizes)-1; i++ {
				for j := 0; j < len(sortedSizes)-i-1; j++ {
					if sortedSizes[j].size < sortedSizes[j+1].size {
						sortedSizes[j], sortedSizes[j+1] = sortedSizes[j+1], sortedSizes[j]
					}
				}
			}
			
			// Calculate proportional characters for each file
			bar := ""
			colorIndex := 0
			usedChars := 0
			
			for _, s := range sortedSizes {
				if s.size > 0 && usedChars < width {
					// Calculate true proportion
					proportion := float64(s.size) / float64(totalSize)
					chars := int(float64(width) * proportion)
					
					// Ensure we don't exceed remaining width
					remainingWidth := width - usedChars
					if chars > remainingWidth {
						chars = remainingWidth
					}
					
					// Skip files too small to display (less than 1 char worth)
					if chars == 0 {
						continue
					}
					
					color := colors[colorIndex%len(colors)]
					style := lipgloss.NewStyle().Foreground(color)
					bar += style.Render(strings.Repeat("█", chars))
					
					usedChars += chars
					colorIndex++
					
					// Stop if we've filled the width
					if usedChars >= width {
						break
					}
				}
			}
			
			// Fill remaining width with gray if needed
			if usedChars < width {
				grayStyle := lipgloss.NewStyle().Foreground(styles.DarkGray)
				bar += grayStyle.Render(strings.Repeat("█", width-usedChars))
			}
			
			lines = append(lines, bar)
			
			// Second row with total size on left and file count on right
			totalStr := formatBytes(uint64(totalSize))
			fileCount := len(p.sizes)
			
			leftText := totalStr
			rightText := fmt.Sprintf("%d log files", fileCount)
			
			// Calculate spacing to justify left and right
			totalTextLen := len(leftText) + len(rightText)
			if totalTextLen < width {
				spacing := width - totalTextLen
				faintStyle := lipgloss.NewStyle().Foreground(styles.LightGray)
				infoLine := faintStyle.Render(leftText + strings.Repeat(" ", spacing) + rightText)
				lines = append(lines, infoLine)
			} else {
				// If text is too long, just show total size centered
				faintStyle := lipgloss.NewStyle().Foreground(styles.LightGray)
				infoLine := faintStyle.Render(centerText(leftText, width))
				lines = append(lines, infoLine)
			}
		}
	}

	// Fill to height
	for len(lines) < height {
		lines = append(lines, "")
	}

	return strings.Join(lines[:height], "\n")
}

func (p *LogSizeCard) UpdateSystem(logSizes logs.LogSizes) {
	sizes := make([]size, 0)
	for _, file := range logSizes.Files {
		sizes = append(sizes, size{name: file.Name, size: file.Size})
	}
	p.sizes = sizes
}
