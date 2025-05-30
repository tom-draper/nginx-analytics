package cards

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// UsersCard displays active user count
type UsersCard struct {
	ActiveUsers int
	TotalUsers  int
}

func NewUsersCard(active, total int) *UsersCard {
	return &UsersCard{
		ActiveUsers: active,
		TotalUsers:  total,
	}
}

func (u *UsersCard) RenderContent(width, height int) string {
	activeStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("46")).
		Bold(true)

	totalStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("241"))

	lines := []string{
		"",
		activeStyle.Render(u.formatUsers(u.ActiveUsers)),
		totalStyle.Render(fmt.Sprintf("of %s", u.formatUsers(u.TotalUsers))),
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

func (u *UsersCard) formatUsers(count int) string {
	if count >= 1000000 {
		return fmt.Sprintf("%.1fM", float64(count)/1000000)
	} else if count >= 1000 {
		return fmt.Sprintf("%.1fK", float64(count)/1000)
	}
	return fmt.Sprintf("%d", count)
}

func (u *UsersCard) GetTitle() string {
	return "Users"
}

func (u *UsersCard) Update(active, total int) {
	u.ActiveUsers = active
	u.TotalUsers = total
}
