package ui

import tea "github.com/charmbracelet/bubbletea"

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q": // Quit on 'q' key
			return m, tea.Quit
		case "up": // Increase counter on 'up' key
			m.counter++
		case "down": // Decrease counter on 'down' key
			m.counter--
		}
	}
	return m, nil
}

