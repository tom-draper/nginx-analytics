package ui

import (
	"github.com/charmbracelet/lipgloss"
	cards "github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard/cards"
)

// DashboardGrid manages a collection of cards in a grid layout
type DashboardGrid struct {
	Cards      []*cards.BaseCard
	ActiveCard int
	Rows       int
	Cols       int
}

func NewDashboardGrid(rows, cols int) *DashboardGrid {
	return &DashboardGrid{
		Cards:      make([]*cards.BaseCard, 0),
		ActiveCard: 0,
		Rows:       rows,
		Cols:       cols,
	}
}

func (d *DashboardGrid) AddCard(card *cards.BaseCard) {
	d.Cards = append(d.Cards, card)
}

func (d *DashboardGrid) SetActiveCard(index int) {
	if index >= 0 && index < len(d.Cards) {
		// Deactivate current card
		if d.ActiveCard >= 0 && d.ActiveCard < len(d.Cards) {
			d.Cards[d.ActiveCard].SetActive(false)
		}
		// Activate new card
		d.ActiveCard = index
		d.Cards[d.ActiveCard].SetActive(true)
	}
}

func (d *DashboardGrid) RenderGrid() string {
	if len(d.Cards) == 0 {
		return ""
	}

	var gridRows []string

	for row := 0; row < d.Rows; row++ {
		var rowCards []string

		for col := 0; col < d.Cols; col++ {
			cardIndex := row*d.Cols + col
			if cardIndex >= len(d.Cards) {
				break
			}

			cardView := d.Cards[cardIndex].Render()
			rowCards = append(rowCards, cardView)
		}

		if len(rowCards) > 0 {
			rowView := lipgloss.JoinHorizontal(lipgloss.Top, rowCards...)
			gridRows = append(gridRows, rowView)
		}
	}

	return lipgloss.JoinVertical(lipgloss.Left, gridRows...)
}
