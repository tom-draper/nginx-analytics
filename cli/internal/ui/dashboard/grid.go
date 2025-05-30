package dashboard

import (
	"github.com/charmbracelet/lipgloss"
	cards "github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard/cards"
)

// DashboardGrid manages a collection of cards in a grid layout and an optional sidebar card.
type DashboardGrid struct {
	Cards         []*cards.Card
	ActiveCard    int
	Rows          int
	Cols          int
	SidebarCard   *cards.Card // Card for the sidebar
	TerminalWidth int         // Current width of the terminal
}

// NewDashboardGrid creates a new dashboard grid.
// terminalWidth should be provided, e.g., from initial terminal size or a default.
func NewDashboardGrid(rows, cols, terminalWidth int) *DashboardGrid {
	return &DashboardGrid{
		Cards:         make([]*cards.Card, 0),
		ActiveCard:    0,
		Rows:          rows,
		Cols:          cols,
		SidebarCard:   nil,
		TerminalWidth: terminalWidth,
	}
}

// AddCard adds a card to the main grid.
func (d *DashboardGrid) AddCard(card *cards.Card) {
	d.Cards = append(d.Cards, card)
}

// AddSidebarCard sets the card to be displayed in the sidebar.
func (d *DashboardGrid) AddSidebarCard(card *cards.Card) {
	d.SidebarCard = card
}

// SetActiveCard sets the currently active card in the main grid.
func (d *DashboardGrid) SetActiveCard(index int) {
	if index >= 0 && index < len(d.Cards) {
		if d.ActiveCard >= 0 && d.ActiveCard < len(d.Cards) {
			d.Cards[d.ActiveCard].SetActive(false)
		}
		d.ActiveCard = index
		d.Cards[d.ActiveCard].SetActive(true)
	}
}

// SetTerminalWidth updates the terminal width.
// This should be called when the terminal size changes.
func (d *DashboardGrid) SetTerminalWidth(width int) {
	d.TerminalWidth = width
}

// RenderGrid renders the main grid of cards and the sidebar card.
func (d *DashboardGrid) RenderGrid() string {
	if len(d.Cards) == 0 && d.SidebarCard == nil {
		return ""
	}

	mainGridView := ""
	var mainGridRows []string

	if len(d.Cards) > 0 && d.Rows > 0 && d.Cols > 0 {
		for r := 0; r < d.Rows; r++ {
			var currentRowCardsRendered []string
			for c := 0; c < d.Cols; c++ {
				cardIndex := r*d.Cols + c
				if cardIndex < len(d.Cards) {
					// For main grid cards, their own Width/Height properties are used by their Render method.
					// If these cards also need dynamic sizing, you'd apply SetSize to them similarly
					// based on available space for each cell, which is a more complex layout problem.
					// Here, we assume they render using their preset or default sizes.
					currentRowCardsRendered = append(currentRowCardsRendered, d.Cards[cardIndex].Render())
				} else {
					break
				}
			}
			if len(currentRowCardsRendered) > 0 {
				mainGridRows = append(mainGridRows, lipgloss.JoinHorizontal(lipgloss.Top, currentRowCardsRendered...))
			}
		}
		if len(mainGridRows) > 0 {
			mainGridView = lipgloss.JoinVertical(lipgloss.Left, mainGridRows...)
		}
	}

	mainGridRenderedWidth := lipgloss.Width(mainGridView)
	mainGridRenderedHeight := lipgloss.Height(mainGridView)

	if d.SidebarCard != nil {
		sidebarTargetWidth := max(d.TerminalWidth - mainGridRenderedWidth - 2, 0)

		sidebarTargetHeight := mainGridRenderedHeight - 2
		// The Card's Render method internally handles cases where Width/Height might be very small
		// by ensuring content dimensions are at least 1x1.

		// Set the size on the SidebarCard instance itself before rendering.
		d.SidebarCard.SetSize(sidebarTargetWidth, sidebarTargetHeight)

		// Now render the sidebar card; it will use the dimensions just set.
		renderedSidebarCard := d.SidebarCard.Render()

		return lipgloss.JoinHorizontal(lipgloss.Top, mainGridView, renderedSidebarCard)
	}

	return mainGridView
}