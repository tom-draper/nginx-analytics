package ui

import (
	"fmt"
)

func (m Model) View() string {
	return fmt.Sprintf("Counter: %d\nPress ↑ to increase, ↓ to decrease, q to quit.", m.counter)
}

