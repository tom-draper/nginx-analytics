package dashboard

// GetActiveCardPosition returns which area the active card is in
// Returns: "main", "sidebar", "middle", "sidebar-bottom", "sidebar-subgrid", "sidebar-footer"
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

	if d.ActiveCard >= offset && d.ActiveCard < offset+len(d.SidebarBottomCards) {
		return "sidebar-bottom"
	}
	offset += len(d.SidebarBottomCards)

	if d.ActiveCard >= offset && d.ActiveCard < offset+len(d.SidebarSubGridCards) {
		return "sidebar-subgrid"
	}
	offset += len(d.SidebarSubGridCards)

	if d.ActiveCard >= offset && d.ActiveCard < offset+len(d.SidebarFooterCards) {
		return "sidebar-footer"
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
	case "sidebar-bottom":
		offset := len(d.Cards)
		if d.SidebarCard != nil {
			offset++
		}
		if d.MiddleCard != nil {
			offset++
		}
		return d.ActiveCard - offset
	case "sidebar-subgrid":
		offset := len(d.Cards)
		if d.SidebarCard != nil {
			offset++
		}
		if d.MiddleCard != nil {
			offset++
		}
		offset += len(d.SidebarBottomCards)
		return d.ActiveCard - offset
	case "sidebar-footer":
		offset := len(d.Cards)
		if d.SidebarCard != nil {
			offset++
		}
		if d.MiddleCard != nil {
			offset++
		}
		offset += len(d.SidebarBottomCards)
		offset += len(d.SidebarSubGridCards)
		return d.ActiveCard - offset
	}

	return 0
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

func (d *DashboardGrid) GetSidebarBottomCardIndex(bottomIndex int) int {
	if bottomIndex < 0 || bottomIndex >= len(d.SidebarBottomCards) {
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

func (d *DashboardGrid) GetSidebarSubGridCardIndex(subGridIndex int) int {
	if subGridIndex < 0 || subGridIndex >= len(d.SidebarSubGridCards) {
		return -1
	}
	offset := len(d.Cards)
	if d.SidebarCard != nil {
		offset++
	}
	if d.MiddleCard != nil {
		offset++
	}
	offset += len(d.SidebarBottomCards)
	return offset + subGridIndex
}

func (d *DashboardGrid) GetSidebarFooterCardIndex(footerIndex int) int {
	if footerIndex < 0 || footerIndex >= len(d.SidebarFooterCards) {
		return -1
	}
	offset := len(d.Cards)
	if d.SidebarCard != nil {
		offset++
	}
	if d.MiddleCard != nil {
		offset++
	}
	offset += len(d.SidebarBottomCards)
	offset += len(d.SidebarSubGridCards)
	return offset + footerIndex
}

// GetSidebarSubGridPosition returns the row and column of a card in the 2x2 sidebar sub-grid
func (d *DashboardGrid) GetSidebarSubGridPosition(cardIndex int) (int, int) {
	// First, we need to find which sidebar sub-grid card this is
	offset := len(d.Cards)
	if d.SidebarCard != nil {
		offset++
	}
	if d.MiddleCard != nil {
		offset++
	}
	offset += len(d.SidebarBottomCards)

	// Calculate the index within the sidebar sub-grid
	subGridIndex := cardIndex - offset
	if subGridIndex < 0 || subGridIndex >= len(d.SidebarSubGridCards) {
		return -1, -1
	}
	row := subGridIndex / 2 // 2x2 grid has 2 columns
	col := subGridIndex % 2
	return row, col
}

// GetSidebarSubGridCardByPosition returns the card index in the sidebar sub-grid at the given row/col
func (d *DashboardGrid) GetSidebarSubGridCardByPosition(row, col int) int {
	if row < 0 || row >= 3 || col < 0 || col >= 2 {
		return -1
	}
	subGridIndex := row*2 + col
	if subGridIndex >= len(d.SidebarSubGridCards) {
		return -1
	}
	return d.GetSidebarSubGridCardIndex(subGridIndex)
}

// MoveUp handles the up arrow key navigation
func (d *DashboardGrid) MoveUp() {
	currentPosition := d.GetActiveCardPosition()

	switch currentPosition {
	case "main":
		// In main grid, move up within the grid or wrap to bottom of right column
		row, col := d.GetMainGridPosition(d.ActiveCard)
		if row > 0 {
			// Move up within main grid
			newIndex := d.GetMainGridCardIndex(row-1, col)
			if newIndex != -1 {
				d.SetActiveCard(newIndex)
			}
		} else {
			// At top of main grid, move to bottom of right column
			d.moveToBottomOfRightColumn()
		}

	case "middle":
		// From middle card, move to bottom row of main grid (left column)
		if len(d.Cards) > 0 {
			// Move to bottom-left card of main grid
			bottomRow := (len(d.Cards) - 1) / d.Cols
			if bottomRow >= 0 {
				newIndex := d.GetMainGridCardIndex(bottomRow, 0)
				if newIndex != -1 {
					d.SetActiveCard(newIndex)
				}
			}
		}

	case "sidebar":
		// From sidebar, wrap to bottom of right column
		d.moveToBottomOfRightColumn()

	case "sidebar-bottom":
		// From sidebar bottom cards, move up to sidebar
		if d.SidebarCard != nil {
			sidebarIndex := d.GetSidebarCardIndex()
			if sidebarIndex != -1 {
				d.SetActiveCard(sidebarIndex)
			}
		}

	case "sidebar-subgrid":
		// From sidebar sub-grid, move up to sidebar bottom cards or sidebar
		subRow, subCol := d.GetSidebarSubGridPosition(d.ActiveCard)
		if subRow > 0 {
			// Move up within sidebar sub-grid
			newSubIndex := d.GetSidebarSubGridCardByPosition(subRow-1, subCol)
			if newSubIndex != -1 {
				d.SetActiveCard(newSubIndex)
			}
		} else {
			// At top of sidebar sub-grid, move to sidebar bottom cards
			if len(d.SidebarBottomCards) > 0 {
				// Try to maintain column alignment
				targetBottomIndex := min(subCol, len(d.SidebarBottomCards)-1)
				bottomCardIndex := d.GetSidebarBottomCardIndex(targetBottomIndex)
				if bottomCardIndex != -1 {
					d.SetActiveCard(bottomCardIndex)
				}
			} else if d.SidebarCard != nil {
				// No sidebar bottom cards, go to sidebar
				sidebarIndex := d.GetSidebarCardIndex()
				if sidebarIndex != -1 {
					d.SetActiveCard(sidebarIndex)
				}
			}
		}

	case "sidebar-footer":
		// From sidebar footer cards, move up to sidebar sub-grid
		currentIndexInArea := d.GetActiveCardIndexInArea()
		if len(d.SidebarSubGridCards) > 0 {
			// Move to bottom row of sidebar sub-grid, maintaining column alignment
			targetSubCol := min(currentIndexInArea, 1) // Footer has max 2 columns (0, 1)
			// Try bottom row first (row 2), then row 1 if no card exists
			newSubIndex := d.GetSidebarSubGridCardByPosition(2, targetSubCol)
			if newSubIndex == -1 {
				newSubIndex = d.GetSidebarSubGridCardByPosition(1, targetSubCol)
			}
			if newSubIndex == -1 {
				newSubIndex = d.GetSidebarSubGridCardByPosition(0, targetSubCol)
			}
			if newSubIndex != -1 {
				d.SetActiveCard(newSubIndex)
			}
		} else if len(d.SidebarBottomCards) > 0 {
			// No sidebar sub-grid, move to sidebar bottom cards
			targetBottomIndex := min(currentIndexInArea, len(d.SidebarBottomCards)-1)
			bottomCardIndex := d.GetSidebarBottomCardIndex(targetBottomIndex)
			if bottomCardIndex != -1 {
				d.SetActiveCard(bottomCardIndex)
			}
		} else if d.SidebarCard != nil {
			// No sidebar bottom cards, go to sidebar
			sidebarIndex := d.GetSidebarCardIndex()
			if sidebarIndex != -1 {
				d.SetActiveCard(sidebarIndex)
			}
		}
	}
}

// MoveDown handles the down arrow key navigation
func (d *DashboardGrid) MoveDown() {
	currentPosition := d.GetActiveCardPosition()
	currentIndexInArea := d.GetActiveCardIndexInArea()

	switch currentPosition {
	case "main":
		// In main grid, move down within the grid or to middle/right column
		row, col := d.GetMainGridPosition(d.ActiveCard)
		newRow := row + 1
		newIndex := d.GetMainGridCardIndex(newRow, col)

		if newIndex != -1 {
			// Move down within main grid
			d.SetActiveCard(newIndex)
		} else {
			// At bottom of main grid
			if col == 0 && d.MiddleCard != nil {
				// Left column, move to middle card
				middleIndex := d.GetMiddleCardIndex()
				if middleIndex != -1 {
					d.SetActiveCard(middleIndex)
				}
			} else {
				// Right column or no middle card, move to top of right column
				d.moveToTopOfRightColumn()
			}
		}

	case "middle":
		// From middle card, wrap to top of main grid (left column)
		if len(d.Cards) > 0 {
			d.SetActiveCard(0) // Top-left card of main grid
		}

	case "sidebar":
		// From sidebar, move down to sidebar bottom cards or sidebar sub-grid
		if len(d.SidebarBottomCards) > 0 {
			bottomIndex := d.GetSidebarBottomCardIndex(0)
			if bottomIndex != -1 {
				d.SetActiveCard(bottomIndex)
			}
		} else if len(d.SidebarSubGridCards) > 0 {
			subGridIndex := d.GetSidebarSubGridCardIndex(0)
			if subGridIndex != -1 {
				d.SetActiveCard(subGridIndex)
			}
		} else if len(d.SidebarFooterCards) > 0 {
			footerIndex := d.GetSidebarFooterCardIndex(0)
			if footerIndex != -1 {
				d.SetActiveCard(footerIndex)
			}
		} else {
			// Wrap to top of main grid
			if len(d.Cards) > 0 {
				d.SetActiveCard(0)
			}
		}

	case "sidebar-bottom":
		// From sidebar bottom cards, move down to sidebar sub-grid
		if len(d.SidebarSubGridCards) > 0 {
			// Try to maintain column alignment
			targetSubCol := min(currentIndexInArea, 1) // Sidebar sub-grid has max 2 columns
			subGridIndex := d.GetSidebarSubGridCardByPosition(0, targetSubCol)
			if subGridIndex != -1 {
				d.SetActiveCard(subGridIndex)
			}
		} else if len(d.SidebarFooterCards) > 0 {
			// No sidebar sub-grid, move to sidebar footer cards
			targetFooterIndex := min(currentIndexInArea, len(d.SidebarFooterCards)-1)
			footerIndex := d.GetSidebarFooterCardIndex(targetFooterIndex)
			if footerIndex != -1 {
				d.SetActiveCard(footerIndex)
			}
		} else {
			// No sidebar sub-grid or footer, wrap to top of main grid
			if len(d.Cards) > 0 {
				d.SetActiveCard(0)
			}
		}

	case "sidebar-subgrid":
		// From sidebar sub-grid, move down within sub-grid or to footer cards
		subRow, subCol := d.GetSidebarSubGridPosition(d.ActiveCard)
		if subRow < 2 { // Can move down within sidebar sub-grid
			newSubIndex := d.GetSidebarSubGridCardByPosition(subRow+1, subCol)
			if newSubIndex != -1 {
				d.SetActiveCard(newSubIndex)
			} else {
				// No card below in sidebar sub-grid, move to footer cards
				d.moveToSidebarFooterOrWrap(subCol)
			}
		} else {
			// At bottom of sidebar sub-grid, move to footer cards or wrap
			d.moveToSidebarFooterOrWrap(subCol)
		}

	case "sidebar-footer":
		// From sidebar footer cards, wrap to top of main grid
		d.wrapToTop()
	}
}

// MoveLeft handles left arrow key navigation
func (d *DashboardGrid) MoveLeft() {
	currentPosition := d.GetActiveCardPosition()

	switch currentPosition {
	case "main":
		row, col := d.GetMainGridPosition(d.ActiveCard)
		if col > 0 {
			newIndex := d.GetMainGridCardIndex(row, col-1)
			if newIndex != -1 {
				d.SetActiveCard(newIndex)
			}
		}

	case "sidebar-bottom":
		if d.GetActiveCardIndexInArea() > 0 {
			bottomIndex := d.GetSidebarBottomCardIndex(0)
			if bottomIndex != -1 {
				d.SetActiveCard(bottomIndex)
			}
		}

	case "sidebar-subgrid":
		subRow, subCol := d.GetSidebarSubGridPosition(d.ActiveCard)
		if subCol > 0 {
			newSubIndex := d.GetSidebarSubGridCardByPosition(subRow, subCol-1)
			if newSubIndex != -1 {
				d.SetActiveCard(newSubIndex)
			}
		}

	case "sidebar-footer":
		if d.GetActiveCardIndexInArea() > 0 {
			footerIndex := d.GetSidebarFooterCardIndex(0)
			if footerIndex != -1 {
				d.SetActiveCard(footerIndex)
			}
		}
	}
}

// MoveRight handles right arrow key navigation
func (d *DashboardGrid) MoveRight() {
	currentPosition := d.GetActiveCardPosition()

	switch currentPosition {
	case "main":
		row, col := d.GetMainGridPosition(d.ActiveCard)
		if col < d.Cols-1 {
			newIndex := d.GetMainGridCardIndex(row, col+1)
			if newIndex != -1 {
				d.SetActiveCard(newIndex)
			}
		}

	case "sidebar-bottom":
		if d.GetActiveCardIndexInArea() == 0 && len(d.SidebarBottomCards) > 1 {
			bottomIndex := d.GetSidebarBottomCardIndex(1)
			if bottomIndex != -1 {
				d.SetActiveCard(bottomIndex)
			}
		}

	case "sidebar-subgrid":
		subRow, subCol := d.GetSidebarSubGridPosition(d.ActiveCard)
		if subCol < 1 { // Sidebar sub-grid has max 2 columns (0, 1)
			newSubIndex := d.GetSidebarSubGridCardByPosition(subRow, subCol+1)
			if newSubIndex != -1 {
				d.SetActiveCard(newSubIndex)
			}
		}

	case "sidebar-footer":
		if d.GetActiveCardIndexInArea() == 0 && len(d.SidebarFooterCards) > 1 {
			footerIndex := d.GetSidebarFooterCardIndex(1)
			if footerIndex != -1 {
				d.SetActiveCard(footerIndex)
			}
		}
	}
}

func (d *DashboardGrid) moveToTopOfRightColumn() {
	// Priority: sidebar -> sidebar bottom cards -> sidebar sub-grid -> sidebar footer -> wrap to main
	if d.SidebarCard != nil {
		sidebarIndex := d.GetSidebarCardIndex()
		if sidebarIndex != -1 {
			d.SetActiveCard(sidebarIndex)
			return
		}
	}

	if len(d.SidebarBottomCards) > 0 {
		bottomIndex := d.GetSidebarBottomCardIndex(0)
		if bottomIndex != -1 {
			d.SetActiveCard(bottomIndex)
			return
		}
	}

	if len(d.SidebarSubGridCards) > 0 {
		subGridIndex := d.GetSidebarSubGridCardIndex(0)
		if subGridIndex != -1 {
			d.SetActiveCard(subGridIndex)
			return
		}
	}

	if len(d.SidebarFooterCards) > 0 {
		footerIndex := d.GetSidebarFooterCardIndex(0)
		if footerIndex != -1 {
			d.SetActiveCard(footerIndex)
			return
		}
	}

	// Wrap to main grid
	if len(d.Cards) > 0 {
		d.SetActiveCard(0)
	}
}

func (d *DashboardGrid) moveToBottomOfRightColumn() {
	// Priority: sidebar footer -> sidebar sub-grid -> sidebar bottom cards -> sidebar -> wrap to middle
	if len(d.SidebarFooterCards) > 0 {
		lastFooterIndex := len(d.SidebarFooterCards) - 1
		footerIndex := d.GetSidebarFooterCardIndex(lastFooterIndex)
		if footerIndex != -1 {
			d.SetActiveCard(footerIndex)
			return
		}
	}

	if len(d.SidebarSubGridCards) > 0 {
		lastSubIndex := len(d.SidebarSubGridCards) - 1
		subGridIndex := d.GetSidebarSubGridCardIndex(lastSubIndex)
		if subGridIndex != -1 {
			d.SetActiveCard(subGridIndex)
			return
		}
	}

	if len(d.SidebarBottomCards) > 0 {
		lastBottomIndex := len(d.SidebarBottomCards) - 1
		bottomIndex := d.GetSidebarBottomCardIndex(lastBottomIndex)
		if bottomIndex != -1 {
			d.SetActiveCard(bottomIndex)
			return
		}
	}

	if d.SidebarCard != nil {
		sidebarIndex := d.GetSidebarCardIndex()
		if sidebarIndex != -1 {
			d.SetActiveCard(sidebarIndex)
			return
		}
	}

	// Wrap to middle or main grid
	if d.MiddleCard != nil {
		middleIndex := d.GetMiddleCardIndex()
		if middleIndex != -1 {
			d.SetActiveCard(middleIndex)
			return
		}
	}

	if len(d.Cards) > 0 {
		d.SetActiveCard(len(d.Cards) - 1) // Last card in main grid
	}
}

func (d *DashboardGrid) moveToSidebarFooterOrWrap(subCol int) {
	if len(d.SidebarFooterCards) > 0 {
		// Try to maintain column alignment
		targetFooterIndex := min(subCol, len(d.SidebarFooterCards)-1)
		footerIndex := d.GetSidebarFooterCardIndex(targetFooterIndex)
		if footerIndex != -1 {
			d.SetActiveCard(footerIndex)
		}
	} else {
		// No footer cards, wrap to top
		d.wrapToTop()
	}
}

func (d *DashboardGrid) wrapToTop() {
	// Wrap to the very top - main grid
	if len(d.Cards) > 0 {
		d.SetActiveCard(0)
	}
}