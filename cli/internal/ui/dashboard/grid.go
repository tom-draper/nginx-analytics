package dashboard

import (
	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard/cards"
)

// DashboardGrid manages a collection of cards in a custom layout with sidebar.
type DashboardGrid struct {
	Cards         []*cards.Card
	ActiveCard    int
	Rows          int
	Cols          int
	SidebarCard   *cards.Card // Card for the sidebar (right side)
	TerminalWidth int         // Current width of the terminal

	// New fields for custom layout
	MiddleCard          *cards.Card   // Large card below the main grid (left side)
	BottomCard          *cards.Card   // Card below the MiddleCard (left side)
	SidebarBottomCards  []*cards.Card // Two cards at the bottom of sidebar
	SidebarSubGridCards []*cards.Card // 2x2 grid below bottom cards in sidebar area
	SidebarFooterCards  []*cards.Card // 2x1 row below sub-grid cards in sidebar area

	// All cards in navigation order for unified navigation
	AllCards []*cards.Card
}

// NewDashboardGrid creates a new dashboard grid.
// terminalWidth should be provided, e.g., from initial terminal size or a default.
func NewDashboardGrid(rows, cols, terminalWidth int) *DashboardGrid {
	return &DashboardGrid{
		Cards:               make([]*cards.Card, 0),
		ActiveCard:          0,
		Rows:                rows,
		Cols:                cols,
		SidebarCard:         nil,
		TerminalWidth:       terminalWidth,
		MiddleCard:          nil,
		BottomCard:          nil,
		SidebarBottomCards:  make([]*cards.Card, 0),
		SidebarSubGridCards: make([]*cards.Card, 0),
		SidebarFooterCards:  make([]*cards.Card, 0),
		AllCards:            make([]*cards.Card, 0),
	}
}

// AddCard adds a card to the main grid.
func (d *DashboardGrid) AddCard(card *cards.Card) {
	d.Cards = append(d.Cards, card)
	d.AllCards = append(d.AllCards, card)
}

// AddMain sets the card to be displayed in the sidebar.
func (d *DashboardGrid) AddMain(card *cards.Card) {
	d.SidebarCard = card
	d.AllCards = append(d.AllCards, card)
}

// AddEndpoints sets the card to be displayed below the main grid.
func (d *DashboardGrid) AddEndpoints(card *cards.Card) {
	d.MiddleCard = card
	d.AllCards = append(d.AllCards, card)
}

// AddBottomCard sets the card to be displayed below the MiddleCard.
func (d *DashboardGrid) AddBottomCard(card *cards.Card) {
	d.BottomCard = card
	d.AllCards = append(d.AllCards, card)
}

// AddSidebarBottomCard adds a card to the bottom row of sidebar (max 2 cards).
func (d *DashboardGrid) AddSidebarBottomCard(card *cards.Card) {
	if len(d.SidebarBottomCards) < 2 {
		d.SidebarBottomCards = append(d.SidebarBottomCards, card)
		d.AllCards = append(d.AllCards, card)
	}
}

// AddSystemCards adds a card to the 2x2 sub-grid in sidebar area (max 4 cards).
func (d *DashboardGrid) AddSystemCards(card *cards.Card) {
	if len(d.SidebarSubGridCards) < 4 {
		d.SidebarSubGridCards = append(d.SidebarSubGridCards, card)
		d.AllCards = append(d.AllCards, card)
	}
}

// AddSidebarFooterCard adds a card to the 2x1 footer row in sidebar area (max 2 cards).
func (d *DashboardGrid) AddSidebarFooterCard(card *cards.Card) {
	if len(d.SidebarFooterCards) < 2 {
		d.SidebarFooterCards = append(d.SidebarFooterCards, card)
		d.AllCards = append(d.AllCards, card)
	}
}

// SetActiveCard sets the currently active card across ALL cards.
func (d *DashboardGrid) SetActiveCard(index int) {
	if index >= 0 && index < len(d.AllCards) {
		// Deactivate current active card
		if d.ActiveCard >= 0 && d.ActiveCard < len(d.AllCards) {
			d.AllCards[d.ActiveCard].SetActive(false)
		}

		// Activate new card
		d.ActiveCard = index
		d.AllCards[d.ActiveCard].SetActive(true)
	}
}

// SetTerminalWidth updates the terminal width.
// This should be called when the terminal size changes.
func (d *DashboardGrid) SetTerminalWidth(width int) {
	d.TerminalWidth = width
}

func (d *DashboardGrid) GetTotalCardCount() int {
	return len(d.AllCards)
}

// RenderGrid renders the custom layout with main grid, middle card, bottom card, sidebar, and sidebar cards.
func (d *DashboardGrid) RenderGrid() string {
	if len(d.AllCards) == 0 {
		return ""
	}

	// Render main grid (top-left 2x2 grid)
	mainGridView := d.renderMainGrid()
	mainGridWidth := lipgloss.Width(mainGridView)

	// Render middle card (below main grid, same width)
	middleCardView := d.renderMiddleCard(mainGridWidth)

	// Render bottom card (below middle card, same width)
	bottomCardView := d.renderBottomCard(mainGridWidth)

	// Combine left column (main grid + middle card + bottom card)
	leftColumnParts := []string{}
	if mainGridView != "" {
		leftColumnParts = append(leftColumnParts, mainGridView)
	}
	if middleCardView != "" {
		leftColumnParts = append(leftColumnParts, middleCardView)
	}
	if bottomCardView != "" {
		leftColumnParts = append(leftColumnParts, bottomCardView)
	}

	leftColumnView := ""
	if len(leftColumnParts) > 0 {
		leftColumnView = lipgloss.JoinVertical(lipgloss.Left, leftColumnParts...)
	}

	// Handle sidebar, sidebar bottom cards, sidebar sub-grid, and sidebar footer cards on the right side
	if d.SidebarCard != nil {
		leftColumnWidth := lipgloss.Width(leftColumnView)
		sidebarTargetWidth := max(d.TerminalWidth-leftColumnWidth-2, 0)

		// Render sidebar
		sidebarTargetHeight := 20 // Fixed height for sidebar, adjust as needed
		d.SidebarCard.SetSize(sidebarTargetWidth, sidebarTargetHeight)
		renderedSidebarCard := d.SidebarCard.Render()

		// Render sidebar bottom cards (below sidebar, same width as sidebar)
		sidebarBottomCardsView := d.renderSidebarBottomCards(sidebarTargetWidth)

		// Render sidebar sub-grid (2x2 grid below sidebar bottom cards, same width as sidebar)
		sidebarSubGridView := d.renderSidebarSubGrid(sidebarTargetWidth)

		// Render sidebar footer cards (2x1 row below sidebar sub-grid, same width as sidebar)
		sidebarFooterView := d.renderSidebarFooterCards(sidebarTargetWidth)

		// Combine right column (sidebar + sidebar bottom cards + sidebar sub-grid + sidebar footer)
		rightColumnParts := []string{}
		if renderedSidebarCard != "" {
			rightColumnParts = append(rightColumnParts, renderedSidebarCard)
		}
		if sidebarBottomCardsView != "" {
			rightColumnParts = append(rightColumnParts, sidebarBottomCardsView)
		}
		if sidebarSubGridView != "" {
			rightColumnParts = append(rightColumnParts, sidebarSubGridView)
		}
		if sidebarFooterView != "" {
			rightColumnParts = append(rightColumnParts, sidebarFooterView)
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

func (d *DashboardGrid) renderMiddleCard(targetWidth int) string {
	if d.MiddleCard == nil {
		return ""
	}

	targetHeight := 30 // Default height

	// Check if the middle card supports dynamic height
	if dynamicHeightRenderer, ok := d.MiddleCard.Renderer.(cards.DynamicHeightCard); ok {
		// If it does, ask the renderer for its required height based on the targetWidth
		targetHeight = dynamicHeightRenderer.GetRequiredHeight(targetWidth - 2) // Subtract 2 for card's own borders
	}

	d.MiddleCard.SetSize(targetWidth-2, targetHeight)
	return d.MiddleCard.Render()
}

func (d *DashboardGrid) renderBottomCard(targetWidth int) string {
	if d.BottomCard == nil {
		return ""
	}

	targetHeight := 9 // Default height

	// Check if the bottom card supports dynamic height
	if dynamicHeightRenderer, ok := d.BottomCard.Renderer.(cards.DynamicHeightCard); ok {
		// If it does, ask the renderer for its required height based on the targetWidth
		targetHeight = dynamicHeightRenderer.GetRequiredHeight(targetWidth - 2) // Subtract 2 for card's own borders
	}

	d.BottomCard.SetSize(targetWidth-2, targetHeight)
	return d.BottomCard.Render()
}

func (d *DashboardGrid) renderSidebarBottomCards(sidebarWidth int) string {
	if len(d.SidebarBottomCards) == 0 {
		return ""
	}

	var renderedSidebarBottomCards []string
	cardHeight := 9 // Adjust as needed

	if len(d.SidebarBottomCards) == 1 {
		cardWidth := sidebarWidth
		d.SidebarBottomCards[0].SetSize(cardWidth, cardHeight)
		renderedSidebarBottomCards = append(renderedSidebarBottomCards, d.SidebarBottomCards[0].Render())
	} else if len(d.SidebarBottomCards) == 2 {
		// Handle odd widths by making left card slightly bigger
		availableWidth := sidebarWidth - 2        // Account for spacing
		leftCardWidth := (availableWidth + 1) / 2 // Rounds up for odd numbers
		rightCardWidth := availableWidth / 2      // Rounds down for odd numbers

		d.SidebarBottomCards[0].SetSize(leftCardWidth, cardHeight)
		d.SidebarBottomCards[1].SetSize(rightCardWidth, cardHeight)

		renderedSidebarBottomCards = append(renderedSidebarBottomCards, d.SidebarBottomCards[0].Render())
		renderedSidebarBottomCards = append(renderedSidebarBottomCards, d.SidebarBottomCards[1].Render())
	}

	return lipgloss.JoinHorizontal(lipgloss.Top, renderedSidebarBottomCards...)
}

// renderSidebarSubGrid renders the 2x2 sidebar sub-grid below the sidebar bottom cards.
func (d *DashboardGrid) renderSidebarSubGrid(sidebarWidth int) string {
	if len(d.SidebarSubGridCards) == 0 {
		return ""
	}

	// Handle odd widths by making left cards slightly bigger
	availableWidth := sidebarWidth - 2        // Account for spacing between cards
	leftCardWidth := (availableWidth + 1) / 2 // Rounds up for odd numbers
	rightCardWidth := availableWidth / 2      // Rounds down for odd numbers

	var sidebarSubGridRows []string
	for row := range 3 {
		var currentRowCards []string
		for col := range 2 {
			cardIndex := row*2 + col
			if cardIndex < len(d.SidebarSubGridCards) {
				// Left column gets the wider width for odd numbers
				cardWidth := leftCardWidth
				if col == 1 {
					cardWidth = rightCardWidth
				}
				cardHeight := 8
				if row == 1 || row == 2 {
					cardHeight = 2
				}

				d.SidebarSubGridCards[cardIndex].SetSize(cardWidth, cardHeight)
				currentRowCards = append(currentRowCards, d.SidebarSubGridCards[cardIndex].Render())
			}
		}
		if len(currentRowCards) > 0 {
			sidebarSubGridRows = append(sidebarSubGridRows, lipgloss.JoinHorizontal(lipgloss.Top, currentRowCards...))
		}
	}

	if len(sidebarSubGridRows) > 0 {
		return lipgloss.JoinVertical(lipgloss.Left, sidebarSubGridRows...)
	}
	return ""
}

func (d *DashboardGrid) renderSidebarFooterCards(sidebarWidth int) string {
	if len(d.SidebarFooterCards) == 0 {
		return ""
	}

	var renderedCards []string
	if len(d.SidebarFooterCards) == 1 {
		card := d.SidebarFooterCards[0]
		cardWidth := sidebarWidth
		cardHeight := 10 // Default height
		if dynamicHeightRenderer, ok := card.Renderer.(cards.DynamicHeightCard); ok {
			cardHeight = dynamicHeightRenderer.GetRequiredHeight(cardWidth - 2)
		}
		card.SetSize(cardWidth, cardHeight)
		renderedCards = append(renderedCards, card.Render())
	} else if len(d.SidebarFooterCards) == 2 {
		availableWidth := sidebarWidth - 2
		leftCardWidth := (availableWidth + 1) / 2
		rightCardWidth := availableWidth / 2

		for i, card := range d.SidebarFooterCards {
			cardWidth := leftCardWidth
			if i == 1 {
				cardWidth = rightCardWidth
			}
			cardHeight := 10 // Default height
			if dynamicHeightRenderer, ok := card.Renderer.(cards.DynamicHeightCard); ok {
				cardHeight = dynamicHeightRenderer.GetRequiredHeight(cardWidth - 2)
			}
			card.SetSize(cardWidth, cardHeight)
			renderedCards = append(renderedCards, card.Render())
		}
	}

	if len(renderedCards) > 0 {
		return lipgloss.JoinHorizontal(lipgloss.Top, renderedCards...)
	}

	return ""
}
