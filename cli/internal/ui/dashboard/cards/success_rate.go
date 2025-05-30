package cards

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// SuccessRateCard displays success rate percentage
type SuccessRateCard struct {
	SuccessRate float64
	Total       int
	Successful  int
}

func NewSuccessRateCard(successful, total int) *SuccessRateCard {
	rate := 0.0
	if total > 0 {
		rate = (float64(successful) / float64(total)) * 100
	}
	return &SuccessRateCard{
		SuccessRate: rate,
		Total:       total,
		Successful:  successful,
	}
}

func (s *SuccessRateCard) RenderContent(width, height int) string {
	// Choose color based on success rate
	rateColor := lipgloss.Color("196") // Red for low
	if s.SuccessRate >= 95 {
		rateColor = lipgloss.Color("46") // Green for high
	} else if s.SuccessRate >= 90 {
		rateColor = lipgloss.Color("226") // Yellow for medium
	}

	rateStyle := lipgloss.NewStyle().
		Foreground(rateColor).
		Bold(true)

	lines := []string{
		"",
		rateStyle.Render(fmt.Sprintf("%.1f%%", s.SuccessRate)),
		fmt.Sprintf("%d/%d", s.Successful, s.Total),
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

func (s *SuccessRateCard) GetTitle() string {
	return "Success Rate"
}

// Update method for real-time data
func (s *SuccessRateCard) Update(successful, total int) {
	s.Successful = successful
	s.Total = total
	if total > 0 {
		s.SuccessRate = (float64(successful) / float64(total)) * 100
	} else {
		s.SuccessRate = 0
	}
}
