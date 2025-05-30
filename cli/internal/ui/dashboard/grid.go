package dashboard

import (
	"github.com/charmbracelet/lipgloss"
	cards "github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard/cards"
)

// DashboardGrid manages a collection of cards in a custom layout with sidebar.
type DashboardGrid struct {
	Cards         []*cards.Card
	ActiveCard    int
	Rows          int
	Cols          int
	SidebarCard   *cards.Card // Card for the sidebar
	TerminalWidth int         // Current width of the terminal
	
	// New fields for custom layout
	MiddleCard    *cards.Card // Large card below the main grid
	BottomCards   []*cards.Card // Two cards at the bottom
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
		MiddleCard:    nil,
		BottomCards:   make([]*cards.Card, 0),
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

// AddMiddleCard sets the card to be displayed below the main grid.
func (d *DashboardGrid) AddMiddleCard(card *cards.Card) {
	d.MiddleCard = card
}

// AddBottomCard adds a card to the bottom row (max 2 cards).
func (d *DashboardGrid) AddBottomCard(card *cards.Card) {
	if len(d.BottomCards) < 2 {
		d.BottomCards = append(d.BottomCards, card)
	}
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

// RenderGrid renders the custom layout with main grid, middle card, sidebar, and bottom cards.
func (d *DashboardGrid) RenderGrid() string {
	if len(d.Cards) == 0 && d.SidebarCard == nil && d.MiddleCard == nil && len(d.BottomCards) == 0 {
		return ""
	}

	// Render main grid (top-left 2x2 grid)
	mainGridView := d.renderMainGrid()
	mainGridWidth := lipgloss.Width(mainGridView)
	
	// Render middle card (below main grid, same width)
	middleCardView := d.renderMiddleCard(mainGridWidth)
	
	// Combine left column (main grid + middle card)
	leftColumnParts := []string{}
	if mainGridView != "" {
		leftColumnParts = append(leftColumnParts, mainGridView)
	}
	if middleCardView != "" {
		leftColumnParts = append(leftColumnParts, middleCardView)
	}
	
	leftColumnView := ""
	if len(leftColumnParts) > 0 {
		leftColumnView = lipgloss.JoinVertical(lipgloss.Left, leftColumnParts...)
	}

	// Handle sidebar and bottom cards on the right side
	if d.SidebarCard != nil {
		leftColumnWidth := lipgloss.Width(leftColumnView)
		sidebarTargetWidth := max(d.TerminalWidth-leftColumnWidth-2, 0)
		
		// Render sidebar
		sidebarTargetHeight := 20 // Fixed height for sidebar, adjust as needed
		d.SidebarCard.SetSize(sidebarTargetWidth, sidebarTargetHeight)
		renderedSidebarCard := d.SidebarCard.Render()
		
		// Render bottom cards (below sidebar, same width as sidebar)
		bottomCardsView := d.renderBottomCards(sidebarTargetWidth)
		
		// Combine right column (sidebar + bottom cards)
		rightColumnParts := []string{}
		if renderedSidebarCard != "" {
			rightColumnParts = append(rightColumnParts, renderedSidebarCard)
		}
		if bottomCardsView != "" {
			rightColumnParts = append(rightColumnParts, bottomCardsView)
		}
		
		rightColumnView := ""
		if len(rightColumnParts) > 0 {
			rightColumnView = lipgloss.JoinVertical(lipgloss.Left, rightColumnParts...)
		}
		
		return lipgloss.JoinHorizontal(lipgloss.Top, leftColumnView, rightColumnView)
	}

	return leftColumnView
}

// renderMainGrid renders the main 2x2 grid in the top-left.
func (d *DashboardGrid) renderMainGrid() string {
	if len(d.Cards) == 0 || d.Rows == 0 || d.Cols == 0 {
		return ""
	}

	var mainGridRows []string
	for r := range d.Rows {
		var currentRowCardsRendered []string
		for c := range d.Cols {
			cardIndex := r*d.Cols + c
			if cardIndex < len(d.Cards) {
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
		return lipgloss.JoinVertical(lipgloss.Left, mainGridRows...)
	}
	return ""
}

// renderMiddleCard renders the middle card below the main grid.
func (d *DashboardGrid) renderMiddleCard(targetWidth int) string {
	if d.MiddleCard == nil {
		return ""
	}
	
	// Make the middle card taller than the main grid cards
	// You can adjust this height based on your needs
	targetHeight := 30 // or calculate based on available space
	
	d.MiddleCard.SetSize(targetWidth - 2, targetHeight)
	return d.MiddleCard.Render()
}

// renderBottomCards renders the two bottom cards horizontally below the sidebar.
func (d *DashboardGrid) renderBottomCards(sidebarWidth int) string {
	if len(d.BottomCards) == 0 {
		return ""
	}
	
	var renderedBottomCards []string
	cardWidth := sidebarWidth / len(d.BottomCards)
	if len(d.BottomCards) == 2 {
		cardWidth = (sidebarWidth - 1) / 2 // Account for spacing
	}
	
	cardHeight := 8 // Adjust as needed
	
	for _, card := range d.BottomCards {
		card.SetSize(cardWidth, cardHeight)
		renderedBottomCards = append(renderedBottomCards, card.Render())
	}
	
	return lipgloss.JoinHorizontal(lipgloss.Top, renderedBottomCards...)
}