package styles

import "github.com/charmbracelet/lipgloss"

var (
	// Colors
	HighlightColor = lipgloss.Color("170")
	
	// Card styles
	CardStyle_ = lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(BorderColor).
		Padding(1).
		Width(45)
	
	TitleStyle_ = lipgloss.NewStyle().
		Foreground(HighlightColor).
		Bold(true)
	
	ActiveCardStyle_ = CardStyle_.Copy().
		BorderForeground(HighlightColor)
		
	InfoStyle = lipgloss.NewStyle().
		Foreground(HighlightColor)
)