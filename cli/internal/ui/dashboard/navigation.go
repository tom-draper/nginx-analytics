package dashboard

// GetActiveCardPosition returns which area the active card is in
func (d *DashboardGrid) GetActiveCardPosition() string {
	if d.ActiveCard < 0 || d.ActiveCard >= len(d.allCards) {
		return ""
	}

	// Depending on the active card's position, we can determine its area
	switch d.allCards[d.ActiveCard].Position {
	case PositionMainGrid:
		return "main"
	case PositionSidebar:
		return "sidebar"
	case PositionEndpoints:
		return "middle"
	case PositionVersion:
		return "version"
	case PositionCenterPair:
		return "sidebar-bottom"
	case PositionSystem:
		return "sidebar-subgrid"
	case PositionFooter:
		return "sidebar-footer"
	default:
		return "main" // fallback
	}
}

// GetActiveCardIndexInArea returns the index of the active card within its area
func (d *DashboardGrid) GetActiveCardIndexInArea() int {
	if d.ActiveCard < 0 || d.ActiveCard >= len(d.allCards) {
		return 0
	}

	activeCard := d.allCards[d.ActiveCard]
	position := activeCard.Position

	for i, card := range d.cardsByPosition[position] {
		if card == activeCard.Card {
			return i
		}
	}

	return 0
}

// getGlobalIndex converts a local index within a position to the global allCards index
func (d *DashboardGrid) getGlobalIndex(position CardPosition, localIndex int) int {
	if localIndex < 0 || localIndex >= len(d.cardsByPosition[position]) {
		return -1
	}
	targetCard := d.cardsByPosition[position][localIndex]
	for i, card := range d.allCards {
		if card.Card == targetCard {
			return i
		}
	}
	return -1
}

// Navigation helper methods for smart up/down movement
// GetMainGridCardIndex returns the global allCards index for a card at the given row/col in the main grid
func (d *DashboardGrid) GetMainGridCardIndex(row, col int) int {
	if row < 0 || row >= d.Rows || col < 0 || col >= d.Cols {
		return -1
	}
	localIndex := row*d.Cols + col
	if localIndex >= len(d.cardsByPosition[PositionMainGrid]) {
		return -1
	}
	return d.getGlobalIndex(PositionMainGrid, localIndex)
}

// GetMainGridPosition returns the row and column for the current card in the main grid
// This uses the local index within the main grid position
func (d *DashboardGrid) GetMainGridPosition(localIndex int) (int, int) {
	if localIndex < 0 || localIndex >= len(d.cardsByPosition[PositionMainGrid]) {
		return -1, -1
	}
	row := localIndex / d.Cols
	col := localIndex % d.Cols
	return row, col
}

func (d *DashboardGrid) GetSidebarCardIndex() int {
	if len(d.cardsByPosition[PositionSidebar]) == 0 {
		return -1
	}
	return d.getGlobalIndex(PositionSidebar, 0)
}

func (d *DashboardGrid) GetMiddleCardIndex() int {
	if len(d.cardsByPosition[PositionEndpoints]) == 0 {
		return -1
	}
	return d.getGlobalIndex(PositionEndpoints, 0)
}

func (d *DashboardGrid) GetVersionCardIndex() int {
	if len(d.cardsByPosition[PositionVersion]) == 0 {
		return -1
	}
	return d.getGlobalIndex(PositionVersion, 0)
}

func (d *DashboardGrid) GetSidebarBottomCardIndex(bottomIndex int) int {
	if bottomIndex < 0 || bottomIndex >= len(d.cardsByPosition[PositionCenterPair]) {
		return -1
	}
	return d.getGlobalIndex(PositionCenterPair, bottomIndex)
}

func (d *DashboardGrid) GetSidebarSubGridCardIndex(subGridIndex int) int {
	if subGridIndex < 0 || subGridIndex >= len(d.cardsByPosition[PositionSystem]) {
		return -1
	}
	return d.getGlobalIndex(PositionSystem, subGridIndex)
}

func (d *DashboardGrid) GetSidebarFooterCardIndex(footerIndex int) int {
	if footerIndex < 0 || footerIndex >= len(d.cardsByPosition[PositionFooter]) {
		return -1
	}
	return d.getGlobalIndex(PositionFooter, footerIndex)
}

// GetSidebarSubGridPosition returns the row and column of a card in the 2x2 sidebar sub-grid
func (d *DashboardGrid) GetSidebarSubGridPosition(cardIndex int) (int, int) {
	// First, we need to find which sidebar sub-grid card this is
	indexInArea := d.GetActiveCardIndexInArea()
	if indexInArea < 0 || indexInArea >= len(d.cardsByPosition[PositionSystem]) {
		return -1, -1
	}
	row := indexInArea / 2 // 2x2 grid has 2 columns
	col := indexInArea % 2
	return row, col
}

// GetSidebarSubGridCardByPosition returns the card index in the sidebar sub-grid at the given row/col
func (d *DashboardGrid) GetSidebarSubGridCardByPosition(row, col int) int {
	if row < 0 || row >= 3 || col < 0 || col >= 2 {
		return -1
	}
	subGridIndex := row*2 + col
	if subGridIndex >= len(d.cardsByPosition[PositionSystem]) {
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
		localIndex := d.GetActiveCardIndexInArea()
		row, col := d.GetMainGridPosition(localIndex)
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
		// From middle card (Endpoints), move up to bottom row of main grid (left column)
		if len(d.cardsByPosition[PositionMainGrid]) > 0 {
			// Move to bottom-left card of main grid
			bottomRow := (len(d.cardsByPosition[PositionMainGrid]) - 1) / d.Cols
			if bottomRow >= 0 {
				newIndex := d.GetMainGridCardIndex(bottomRow, 0)
				if newIndex != -1 {
					d.SetActiveCard(newIndex)
				}
			}
		}

	case "version":
		// From version card, move up to Endpoints (middle)
		if len(d.cardsByPosition[PositionEndpoints]) > 0 {
			middleIndex := d.GetMiddleCardIndex()
			if middleIndex != -1 {
				d.SetActiveCard(middleIndex)
			}
		} else if len(d.cardsByPosition[PositionMainGrid]) > 0 {
			// No endpoints card, go to bottom of main grid
			bottomRow := (len(d.cardsByPosition[PositionMainGrid]) - 1) / d.Cols
			newIndex := d.GetMainGridCardIndex(bottomRow, 0)
			if newIndex != -1 {
				d.SetActiveCard(newIndex)
			}
		}

	case "sidebar":
		// From sidebar, wrap to bottom of right column
		d.moveToBottomOfRightColumn()

	case "sidebar-bottom":
		// From sidebar bottom cards, move up to sidebar
		if len(d.cardsByPosition[PositionSidebar]) > 0 {
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
			if len(d.cardsByPosition[PositionCenterPair]) > 0 {
				// Try to maintain column alignment
				targetBottomIndex := min(subCol, len(d.cardsByPosition[PositionCenterPair])-1)
				bottomCardIndex := d.GetSidebarBottomCardIndex(targetBottomIndex)
				if bottomCardIndex != -1 {
					d.SetActiveCard(bottomCardIndex)
				}
			} else if len(d.cardsByPosition[PositionSidebar]) > 0 {
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
		if len(d.cardsByPosition[PositionSystem]) > 0 {
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
		} else if len(d.cardsByPosition[PositionCenterPair]) > 0 {
			// No sidebar sub-grid, move to sidebar bottom cards
			targetBottomIndex := min(currentIndexInArea, len(d.cardsByPosition[PositionCenterPair])-1)
			bottomCardIndex := d.GetSidebarBottomCardIndex(targetBottomIndex)
			if bottomCardIndex != -1 {
				d.SetActiveCard(bottomCardIndex)
			}
		} else if len(d.cardsByPosition[PositionSidebar]) > 0 {
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
		localIndex := d.GetActiveCardIndexInArea()
		row, col := d.GetMainGridPosition(localIndex)
		newRow := row + 1
		newIndex := d.GetMainGridCardIndex(newRow, col)

		if newIndex != -1 {
			// Move down within main grid
			d.SetActiveCard(newIndex)
		} else {
			// At bottom of main grid
			if col == 0 && len(d.cardsByPosition[PositionEndpoints]) > 0 {
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
		// From middle card (Endpoints), move down to Version
		if len(d.cardsByPosition[PositionVersion]) > 0 {
			versionIndex := d.GetVersionCardIndex()
			if versionIndex != -1 {
				d.SetActiveCard(versionIndex)
			}
		} else if len(d.cardsByPosition[PositionMainGrid]) > 0 {
			// No version card, wrap to top of main grid
			d.SetActiveCard(0)
		}

	case "version":
		// From version card, wrap to top of main grid (left column)
		if len(d.cardsByPosition[PositionMainGrid]) > 0 {
			d.SetActiveCard(0)
		}

	case "sidebar":
		// From sidebar, move down to sidebar bottom cards or sidebar sub-grid
		if len(d.cardsByPosition[PositionCenterPair]) > 0 {
			bottomIndex := d.GetSidebarBottomCardIndex(0)
			if bottomIndex != -1 {
				d.SetActiveCard(bottomIndex)
			}
		} else if len(d.cardsByPosition[PositionSystem]) > 0 {
			subGridIndex := d.GetSidebarSubGridCardIndex(0)
			if subGridIndex != -1 {
				d.SetActiveCard(subGridIndex)
			}
		} else if len(d.cardsByPosition[PositionFooter]) > 0 {
			footerIndex := d.GetSidebarFooterCardIndex(0)
			if footerIndex != -1 {
				d.SetActiveCard(footerIndex)
			}
		} else {
			// Wrap to top of main grid
			if len(d.cardsByPosition[PositionMainGrid]) > 0 {
				d.SetActiveCard(0)
			}
		}

	case "sidebar-bottom":
		// From sidebar bottom cards, move down to sidebar sub-grid
		if len(d.cardsByPosition[PositionSystem]) > 0 {
			// Try to maintain column alignment
			targetSubCol := min(currentIndexInArea, 1) // Sidebar sub-grid has max 2 columns
			subGridIndex := d.GetSidebarSubGridCardByPosition(0, targetSubCol)
			if subGridIndex != -1 {
				d.SetActiveCard(subGridIndex)
			}
		} else if len(d.cardsByPosition[PositionFooter]) > 0 {
			// No sidebar sub-grid, move to sidebar footer cards
			targetFooterIndex := min(currentIndexInArea, len(d.cardsByPosition[PositionFooter])-1)
			footerIndex := d.GetSidebarFooterCardIndex(targetFooterIndex)
			if footerIndex != -1 {
				d.SetActiveCard(footerIndex)
			}
		} else {
			// No sidebar sub-grid or footer, wrap to top of main grid
			if len(d.cardsByPosition[PositionMainGrid]) > 0 {
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
		localIndex := d.GetActiveCardIndexInArea()
		row, col := d.GetMainGridPosition(localIndex)
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
		localIndex := d.GetActiveCardIndexInArea()
		row, col := d.GetMainGridPosition(localIndex)
		if col < d.Cols-1 {
			newIndex := d.GetMainGridCardIndex(row, col+1)
			if newIndex != -1 {
				d.SetActiveCard(newIndex)
			}
		}

	case "sidebar-bottom":
		if d.GetActiveCardIndexInArea() == 0 && len(d.cardsByPosition[PositionCenterPair]) > 1 {
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
		if d.GetActiveCardIndexInArea() == 0 && len(d.cardsByPosition[PositionFooter]) > 1 {
			footerIndex := d.GetSidebarFooterCardIndex(1)
			if footerIndex != -1 {
				d.SetActiveCard(footerIndex)
			}
		}
	}
}

func (d *DashboardGrid) moveToTopOfRightColumn() {
	// Priority: sidebar -> sidebar bottom cards -> sidebar sub-grid -> sidebar footer -> wrap to main
	if len(d.cardsByPosition[PositionSidebar]) > 0 {
		sidebarIndex := d.GetSidebarCardIndex()
		if sidebarIndex != -1 {
			d.SetActiveCard(sidebarIndex)
			return
		}
	}

	if len(d.cardsByPosition[PositionCenterPair]) > 0 {
		bottomIndex := d.GetSidebarBottomCardIndex(0)
		if bottomIndex != -1 {
			d.SetActiveCard(bottomIndex)
			return
		}
	}

	if len(d.cardsByPosition[PositionSystem]) > 0 {
		subGridIndex := d.GetSidebarSubGridCardIndex(0)
		if subGridIndex != -1 {
			d.SetActiveCard(subGridIndex)
			return
		}
	}

	if len(d.cardsByPosition[PositionFooter]) > 0 {
		footerIndex := d.GetSidebarFooterCardIndex(0)
		if footerIndex != -1 {
			d.SetActiveCard(footerIndex)
			return
		}
	}

	// Wrap to main grid
	if len(d.allCards) > 0 {
		d.SetActiveCard(0)
	}
}

func (d *DashboardGrid) moveToBottomOfRightColumn() {
	// Priority: sidebar footer -> sidebar sub-grid -> sidebar bottom cards -> sidebar -> wrap to middle
	if len(d.cardsByPosition[PositionFooter]) > 0 {
		lastFooterIndex := len(d.cardsByPosition[PositionFooter]) - 1
		footerIndex := d.GetSidebarFooterCardIndex(lastFooterIndex)
		if footerIndex != -1 {
			d.SetActiveCard(footerIndex)
			return
		}
	}

	if len(d.cardsByPosition[PositionSystem]) > 0 {
		lastSubIndex := len(d.cardsByPosition[PositionSystem]) - 1
		subGridIndex := d.GetSidebarSubGridCardIndex(lastSubIndex)
		if subGridIndex != -1 {
			d.SetActiveCard(subGridIndex)
			return
		}
	}

	if len(d.cardsByPosition[PositionCenterPair]) > 0 {
		lastBottomIndex := len(d.cardsByPosition[PositionCenterPair]) - 1
		bottomIndex := d.GetSidebarBottomCardIndex(lastBottomIndex)
		if bottomIndex != -1 {
			d.SetActiveCard(bottomIndex)
			return
		}
	}

	if len(d.cardsByPosition[PositionSidebar]) > 0 {
		sidebarIndex := d.GetSidebarCardIndex()
		if sidebarIndex != -1 {
			d.SetActiveCard(sidebarIndex)
			return
		}
	}

	// Wrap to middle or main grid
	if len(d.cardsByPosition[PositionEndpoints]) > 0 {
		middleIndex := d.GetMiddleCardIndex()
		if middleIndex != -1 {
			d.SetActiveCard(middleIndex)
			return
		}
	}

	if len(d.allCards) > 0 {
		d.SetActiveCard(len(d.allCards) - 1) // Last card in main grid
	}
}

func (d *DashboardGrid) moveToSidebarFooterOrWrap(subCol int) {
	if len(d.cardsByPosition[PositionFooter]) > 0 {
		// Try to maintain column alignment
		targetFooterIndex := min(subCol, len(d.cardsByPosition[PositionFooter])-1)
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
	if len(d.allCards) > 0 {
		d.SetActiveCard(0)
	}
}
