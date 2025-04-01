package ui

import tea "github.com/charmbracelet/bubbletea"

type Model struct {
	counter int
}

func (m Model) Init() tea.Cmd {
	// No initial command needed, so return nil
	return nil
}
