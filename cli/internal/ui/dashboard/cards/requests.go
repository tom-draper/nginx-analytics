package cards

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// RequestsCard displays request count and rate
type RequestsCard struct {
	Count int
	Rate  float64 // requests per second
}

func NewRequestsCard(count int, rate float64) *RequestsCard {
	return &RequestsCard{
		Count: count,
		Rate:  rate,
	}
}

func (r *RequestsCard) RenderContent(width, height int) string {
	countStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("39")).
		Bold(true)

	rateStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("241"))

	lines := []string{
		"",
		countStyle.Render(r.formatCount()),
		rateStyle.Render(fmt.Sprintf("%.1f/s", r.Rate)),
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

func (r *RequestsCard) formatCount() string {
	if r.Count >= 1000000 {
		return fmt.Sprintf("%.1fM", float64(r.Count)/1000000)
	} else if r.Count >= 1000 {
		return fmt.Sprintf("%.1fK", float64(r.Count)/1000)
	}
	return fmt.Sprintf("%d", r.Count)
}

func (r *RequestsCard) GetTitle() string {
	return "Requests"
}

func (r *RequestsCard) Update(count int, rate float64) {
	r.Count = count
	r.Rate = rate
}
