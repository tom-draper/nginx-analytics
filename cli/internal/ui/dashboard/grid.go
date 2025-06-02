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
	SubGridCards  []*cards.Card // 2x2 grid below bottom cards
	
	// All cards in navigation order for unified navigation
	AllCards      []*cards.Card
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
		SubGridCards:  make([]*cards.Card, 0),
		AllCards:      make([]*cards.Card, 0),
	}
}

// AddCard adds a card to the main grid.
func (d *DashboardGrid) AddCard(card *cards.Card) {
	d.Cards = append(d.Cards, card)
	d.AllCards = append(d.AllCards, card)
}

// AddSidebarCard sets the card to be displayed in the sidebar.
func (d *DashboardGrid) AddSidebarCard(card *cards.Card) {
	d.SidebarCard = card
	d.AllCards = append(d.AllCards, card)
}

// AddMiddleCard sets the card to be displayed below the main grid.
func (d *DashboardGrid) AddMiddleCard(card *cards.Card) {
	d.MiddleCard = card
	d.AllCards = append(d.AllCards, card)
}

// AddBottomCard adds a card to the bottom row (max 2 cards).
func (d *DashboardGrid) AddBottomCard(card *cards.Card) {
	if len(d.BottomCards) < 2 {
		d.BottomCards = append(d.BottomCards, card)
		d.AllCards = append(d.AllCards, card)
	}
}

// AddSubGridCard adds a card to the 2x2 sub-grid below bottom cards (max 4 cards).
func (d *DashboardGrid) AddSubGridCard(card *cards.Card) {
	if len(d.SubGridCards) < 4 {
		d.SubGridCards = append(d.SubGridCards, card)
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

// GetActiveCardPosition returns which area the active card is in
// Returns: "main", "sidebar", "middle", "bottom", "subgrid"
func (d *DashboardGrid) GetActiveCardPosition() string {
	if d.ActiveCard < len(d.Cards) {
		return "main"
	}
	
	offset := len(d.Cards)
	if d.SidebarCard != nil {
		if d.ActiveCard == offset {
			return "sidebar"
		}
		offset++
	}
	
	if d.MiddleCard != nil {
		if d.ActiveCard == offset {
			return "middle"
		}
		offset++
	}
	
	if d.ActiveCard >= offset && d.ActiveCard < offset+len(d.BottomCards) {
		return "bottom"
	}
	offset += len(d.BottomCards)
	
	if d.ActiveCard >= offset && d.ActiveCard < offset+len(d.SubGridCards) {
		return "subgrid"
	}
	
	return "main" // fallback
}

// GetActiveCardIndexInArea returns the index of the active card within its area
func (d *DashboardGrid) GetActiveCardIndexInArea() int {
	position := d.GetActiveCardPosition()
	
	switch position {
	case "main":
		return d.ActiveCard
	case "sidebar":
		return 0 // Sidebar only has one card
	case "middle":
		return 0 // Middle only has one card
	case "bottom":
		offset := len(d.Cards)
		if d.SidebarCard != nil {
			offset++
		}
		if d.MiddleCard != nil {
			offset++
		}
		return d.ActiveCard - offset
	case "subgrid":
		offset := len(d.Cards)
		if d.SidebarCard != nil {
			offset++
		}
		if d.MiddleCard != nil {
			offset++
		}
		offset += len(d.BottomCards)
		return d.ActiveCard - offset
	}
	
	return 0
}

// SetTerminalWidth updates the terminal width.
// This should be called when the terminal size changes.
func (d *DashboardGrid) SetTerminalWidth(width int) {
	d.TerminalWidth = width
}

func (d *DashboardGrid) GetTotalCardCount() int {
	return len(d.AllCards)
}

// Navigation helper methods for smart up/down movement
func (d *DashboardGrid) GetMainGridCardIndex(row, col int) int {
	if row < 0 || row >= d.Rows || col < 0 || col >= d.Cols {
		return -1
	}
	index := row*d.Cols + col
	if index >= len(d.Cards) {
		return -1
	}
	return index
}

func (d *DashboardGrid) GetMainGridPosition(cardIndex int) (int, int) {
	if cardIndex < 0 || cardIndex >= len(d.Cards) {
		return -1, -1
	}
	row := cardIndex / d.Cols
	col := cardIndex % d.Cols
	return row, col
}

func (d *DashboardGrid) GetSidebarCardIndex() int {
	if d.SidebarCard == nil {
		return -1
	}
	return len(d.Cards) // Sidebar comes after main grid cards
}

func (d *DashboardGrid) GetMiddleCardIndex() int {
	if d.MiddleCard == nil {
		return -1
	}
	offset := len(d.Cards)
	if d.SidebarCard != nil {
		offset++
	}
	return offset
}

func (d *DashboardGrid) GetBottomCardIndex(bottomIndex int) int {
	if bottomIndex < 0 || bottomIndex >= len(d.BottomCards) {
		return -1
	}
	offset := len(d.Cards)
	if d.SidebarCard != nil {
		offset++
	}
	if d.MiddleCard != nil {
		offset++
	}
	return offset + bottomIndex
}

func (d *DashboardGrid) GetSubGridCardIndex(subGridIndex int) int {
	if subGridIndex < 0 || subGridIndex >= len(d.SubGridCards) {
		return -1
	}
	offset := len(d.Cards)
	if d.SidebarCard != nil {
		offset++
	}
	if d.MiddleCard != nil {
		offset++
	}
	offset += len(d.BottomCards)
	return offset + subGridIndex
}

// GetSubGridPosition returns the row and column of a card in the 2x2 sub-grid
func (d *DashboardGrid) GetSubGridPosition(cardIndex int) (int, int) {
	subGridIndex := d.GetActiveCardIndexInArea()
	if subGridIndex < 0 || subGridIndex >= len(d.SubGridCards) {
		return -1, -1
	}
	row := subGridIndex / 2 // 2x2 grid has 2 columns
	col := subGridIndex % 2
	return row, col
}

// GetSubGridCardByPosition returns the card index in the sub-grid at the given row/col
func (d *DashboardGrid) GetSubGridCardByPosition(row, col int) int {
	if row < 0 || row >= 2 || col < 0 || col >= 2 {
		return -1
	}
	subGridIndex := row*2 + col
	if subGridIndex >= len(d.SubGridCards) {
		return -1
	}
	return d.GetSubGridCardIndex(subGridIndex)
}

// RenderGrid renders the custom layout with main grid, middle card, sidebar, and bottom cards.
func (d *DashboardGrid) RenderGrid() string {
	if len(d.AllCards) == 0 {
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

	// Handle sidebar, bottom cards, and sub-grid on the right side
	if d.SidebarCard != nil {
		leftColumnWidth := lipgloss.Width(leftColumnView)
		sidebarTargetWidth := max(d.TerminalWidth-leftColumnWidth-2, 0)
		
		// Render sidebar
		sidebarTargetHeight := 20 // Fixed height for sidebar, adjust as needed
		d.SidebarCard.SetSize(sidebarTargetWidth, sidebarTargetHeight)
		renderedSidebarCard := d.SidebarCard.Render()
		
		// Render bottom cards (below sidebar, same width as sidebar)
		bottomCardsView := d.renderBottomCards(sidebarTargetWidth)
		
		// Render sub-grid (2x2 grid below bottom cards, same width as sidebar)
		subGridView := d.renderSubGrid(sidebarTargetWidth)
		
		// Combine right column (sidebar + bottom cards + sub-grid)
		rightColumnParts := []string{}
		if renderedSidebarCard != "" {
			rightColumnParts = append(rightColumnParts, renderedSidebarCard)
		}
		if bottomCardsView != "" {
			rightColumnParts = append(rightColumnParts, bottomCardsView)
		}
		if subGridView != "" {
			rightColumnParts = append(rightColumnParts, subGridView)
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
	cardHeight := 8 // Adjust as needed
	
	if len(d.BottomCards) == 1 {
		cardWidth := sidebarWidth
		d.BottomCards[0].SetSize(cardWidth, cardHeight)
		renderedBottomCards = append(renderedBottomCards, d.BottomCards[0].Render())
	} else if len(d.BottomCards) == 2 {
		// Handle odd widths by making left card slightly bigger
		availableWidth := sidebarWidth - 2 // Account for spacing
		leftCardWidth := (availableWidth + 1) / 2   // Rounds up for odd numbers
		rightCardWidth := availableWidth / 2        // Rounds down for odd numbers
		
		d.BottomCards[0].SetSize(leftCardWidth, cardHeight)
		d.BottomCards[1].SetSize(rightCardWidth, cardHeight)
		
		renderedBottomCards = append(renderedBottomCards, d.BottomCards[0].Render())
		renderedBottomCards = append(renderedBottomCards, d.BottomCards[1].Render())
	}
	
	return lipgloss.JoinHorizontal(lipgloss.Top, renderedBottomCards...)
}

// renderSubGrid renders the 2x2 sub-grid below the bottom cards.
func (d *DashboardGrid) renderSubGrid(sidebarWidth int) string {
	if len(d.SubGridCards) == 0 {
		return ""
	}
	
	// Handle odd widths by making left cards slightly bigger
	availableWidth := sidebarWidth - 2 // Account for spacing between cards
	leftCardWidth := (availableWidth + 1) / 2   // Rounds up for odd numbers
	rightCardWidth := availableWidth / 2        // Rounds down for odd numbers
	
	var subGridRows []string
	for row := range 2 {
		var currentRowCards []string
		for col := range 2 {
			cardIndex := row*2 + col
			if cardIndex < len(d.SubGridCards) {
				// Left column gets the wider width for odd numbers
				cardWidth := leftCardWidth
				if col == 1 {
					cardWidth = rightCardWidth
				}
				cardHeight := 8
				if row == 1 {
					cardHeight = 4
				}
				
				d.SubGridCards[cardIndex].SetSize(cardWidth, cardHeight)
				currentRowCards = append(currentRowCards, d.SubGridCards[cardIndex].Render())
			}
		}
		if len(currentRowCards) > 0 {
			subGridRows = append(subGridRows, lipgloss.JoinHorizontal(lipgloss.Top, currentRowCards...))
		}
	}
	
	if len(subGridRows) > 0 {
		return lipgloss.JoinVertical(lipgloss.Left, subGridRows...)
	}
	return ""
}