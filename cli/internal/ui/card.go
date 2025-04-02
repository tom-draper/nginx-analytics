package ui

import (
	"github.com/charmbracelet/lipgloss"
)

// Card represents a dashboard card with a title and data
type Card struct {
	Title string
	Data  []float64
	Color lipgloss.Color
}

// GetLatestValue returns the most recent value from the card's data
func (c Card) GetLatestValue() float64 {
	if len(c.Data) == 0 {
		return 0
	}
	return c.Data[len(c.Data)-1]
}

// GetMin returns the minimum value in the card's data
func (c Card) GetMin() float64 {
	if len(c.Data) == 0 {
		return 0
	}
	
	min := c.Data[0]
	for _, v := range c.Data {
		if v < min {
			min = v
		}
	}
	return min
}

// GetMax returns the maximum value in the card's data
func (c Card) GetMax() float64 {
	if len(c.Data) == 0 {
		return 0
	}
	
	max := c.Data[0]
	for _, v := range c.Data {
		if v > max {
			max = v
		}
	}
	return max
}