package cards

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// UsersCard displays active user count
type LogoCard struct {}

func NewLogoCard() *LogoCard {
	return &LogoCard{}
}

func (u *LogoCard) RenderContent(width, height int) string {
	rateStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("241"))

	lines := []string{
		"",
		rateStyle.Render("   ░   ░"),
		rateStyle.Render("░   ░"),
		"",
	}


	// Center content
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

func (p *LogoCard) GetTitle() string {
	return ""
}

