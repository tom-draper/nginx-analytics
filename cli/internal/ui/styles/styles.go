package ui

import (
	"github.com/charmbracelet/lipgloss"
)

var (
	// Colors
	BorderColor    = lipgloss.Color("63")
	HighlightColor = lipgloss.Color("170")
	
	// Card styles
	CardStyle_ = lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(BorderColor).
		Padding(1).
		Width(45)
	
	TitleStyle = lipgloss.NewStyle().
		Foreground(HighlightColor).
		Bold(true)
	
	ActiveCardStyle_ = CardStyle_.Copy().
		BorderForeground(HighlightColor)
		
	InfoStyle = lipgloss.NewStyle().
		Foreground(HighlightColor)
)