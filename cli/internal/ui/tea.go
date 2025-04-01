package ui

import (
	tea "github.com/charmbracelet/bubbletea"
)

// Run starts the Bubble Tea program
func Run() error {
	p := tea.NewProgram(Model{}) // Model is defined in model.go
	_, err := p.Run()
	return err
}

