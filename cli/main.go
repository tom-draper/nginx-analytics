package main

import (
	"fmt"
	"math/rand"
	"time"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/tom-draper/nginx-analytics/cli/internal/model"
)

func main() {
	rand.Seed(time.Now().UnixNano())

	p := tea.NewProgram(model.New(), tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Println("Error running program:", err)
	}
}
