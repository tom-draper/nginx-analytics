package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/guptarohit/asciigraph"
)

// Card represents a dashboard card with a title and data
type Card struct {
	Title string
	Data  []float64
	Color lipgloss.Color
}

// GetLatestValue returns the most recent value from the card's data
func (c Card) GetLatestValue() float64 {
	if len(c.Data) == 0 {
		return 0
	}
	return c.Data[len(c.Data)-1]
}

// GetMin returns the minimum value in the card's data
func (c Card) GetMin() float64 {
	if len(c.Data) == 0 {
		return 0
	}
	
	min := c.Data[0]
	for _, v := range c.Data {
		if v < min {
			min = v
		}
	}
	return min
}

// GetMax returns the maximum value in the card's data
func (c Card) GetMax() float64 {
	if len(c.Data) == 0 {
		return 0
	}
	
	max := c.Data[0]
	for _, v := range c.Data {
		if v > max {
			max = v
		}
	}
	return max
}

// Render renders the card with a border and embedded title
func (c Card) Render(width, height int, isActive bool) string {
	// Create the graph
	graph := asciigraph.Plot(
		c.Data,
		asciigraph.Width(width-4), // Account for border padding
		asciigraph.Height(height-6), // Account for border, title, and stats
		asciigraph.Caption(fmt.Sprintf("Last %d points", len(c.Data))),
	)
	
	// Create stats line
	stats := fmt.Sprintf("Current: %.2f | Min: %.2f | Max: %.2f",
		c.GetLatestValue(), c.GetMin(), c.GetMax())
	
	// Combine graph and stats
	content := graph + "\n" + stats
	
	// Create border style
	borderStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(c.Color).
		Padding(1, 2).
		Width(width - 2).
		Height(height - 2)
	
	// Make border more prominent if active
	if isActive {
		borderStyle = borderStyle.BorderForeground(lipgloss.Color("205"))
	}
	
	// Create title style
	titleStyle := lipgloss.NewStyle().
		Foreground(c.Color).
		Bold(true).
		Background(lipgloss.Color("0")) // Background to "break" the border
	
	if isActive {
		titleStyle = titleStyle.Foreground(lipgloss.Color("205"))
	}
	
	// Render the bordered content
	bordered := borderStyle.Render(content)
	
	// Now we need to manually insert the title into the top border
	lines := strings.Split(bordered, "\n")
	if len(lines) > 0 {
		// Find the top border line and insert the title
		topLine := lines[0]
		titleText := fmt.Sprintf(" %s ", c.Title)
		
		// Calculate position to center the title (or place it left-aligned)
		titlePos := 4 // Start position for title
		if titlePos + len(titleText) > len(topLine) {
			titlePos = 2
		}
		
		// Replace part of the border with the title
		runes := []rune(topLine)
		titleRunes := []rune(titleStyle.Render(titleText))
		
		if len(runes) > titlePos + len(titleRunes) {
			// Insert title into the border
			result := string(runes[:titlePos]) + string(titleRunes) + string(runes[titlePos+len(titleRunes):])
			lines[0] = result
		}
	}
	
	return strings.Join(lines, "\n")
}

// RenderCompact renders a compact card suitable for corner placement
func (c Card) RenderCompact(isActive bool) string {
	// Fixed compact dimensions
	cardWidth := 50
	graphWidth := 40
	graphHeight := 8
	
	graph := asciigraph.Plot(
		c.Data,
		asciigraph.Width(graphWidth),
		asciigraph.Height(graphHeight),
	)
	
	// Create stats line
	stats := fmt.Sprintf("Cur: %.1f | Min: %.1f | Max: %.1f",
		c.GetLatestValue(), c.GetMin(), c.GetMax())
	
	// Combine content
	content := fmt.Sprintf("%s\n%s", graph, stats)
	
	// Create border style
	borderColor := c.Color
	if isActive {
		borderColor = lipgloss.Color("205")
	}
	
	style := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(borderColor).
		Padding(0, 1).
		Width(cardWidth)
	
	// Render the content with border
	bordered := style.Render(content)
	
	// Now manually embed the title in the top border
	return c.embedTitleInBorder(bordered, isActive)
}

// embedTitleInBorder manually places the title in the top border line
func (c Card) embedTitleInBorder(bordered string, isActive bool) string {
	lines := strings.Split(bordered, "\n")
	if len(lines) == 0 {
		return bordered
	}
	
	// Style for the title
	titleColor := c.Color
	if isActive {
		titleColor = lipgloss.Color("205")
	}
	
	titleStyle := lipgloss.NewStyle().
		Foreground(titleColor).
		Bold(true)
	
	title := fmt.Sprintf("[ %s ]", c.Title)
	styledTitle := titleStyle.Render(title)
	
	// Get the top border line
	topLine := lines[0]
	
	// Find a good position for the title (after the first few border characters)
	insertPos := 3
	if len(topLine) < insertPos + len(title) + 3 {
		insertPos = 1
	}
	
	// Convert to runes for proper Unicode handling
	topRunes := []rune(topLine)
	
	if len(topRunes) > insertPos + len(title) {
		// Replace the border characters with the title
		newTopLine := string(topRunes[:insertPos]) + 
			styledTitle + 
			string(topRunes[insertPos+len(title):])
		lines[0] = newTopLine
	}
	
	return strings.Join(lines, "\n")
}