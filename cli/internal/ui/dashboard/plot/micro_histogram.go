package plot

import (
	"math"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/logger"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

// Braille dot patterns (each character represents a 2x4 grid of dots)
// Dots are numbered:
// 1 4
// 2 5
// 3 6
// 7 8
const (
	brailleDot1 = 1 << 0 // 0x01
	brailleDot2 = 1 << 1 // 0x02
	brailleDot3 = 1 << 2 // 0x04
	brailleDot4 = 1 << 3 // 0x08
	brailleDot5 = 1 << 4 // 0x10
	brailleDot6 = 1 << 5 // 0x20
	brailleDot7 = 1 << 6 // 0x40 (often for 8-dot Braille, below dot 3)
	brailleDot8 = 1 << 7 // 0x80 (often for 8-dot Braille, below dot 6)
)

var braillePatterns = [256]rune{
	// ... (your existing braille patterns array)
	// I'm including the full array here for completeness.
	// If you already have this in a shared utility, remove it from here.
	0x2800, 0x2801, 0x2802, 0x2803, 0x2804, 0x2805, 0x2806, 0x2807,
	0x2808, 0x2809, 0x280A, 0x280B, 0x280C, 0x280D, 0x280E, 0x280F,
	0x2810, 0x2811, 0x2812, 0x2813, 0x2814, 0x2815, 0x2816, 0x2817,
	0x2818, 0x2819, 0x281A, 0x281B, 0x281C, 0x281D, 0x281E, 0x281F,
	0x2820, 0x2821, 0x2822, 0x2823, 0x2824, 0x2825, 0x2826, 0x2827,
	0x2828, 0x2829, 0x282A, 0x282B, 0x282C, 0x282D, 0x282E, 0x282F,
	0x2830, 0x2831, 0x2832, 0x2833, 0x2834, 0x2835, 0x2836, 0x2837,
	0x2838, 0x2839, 0x283A, 0x283B, 0x283C, 0x283D, 0x283E, 0x283F,
	0x2840, 0x2841, 0x2842, 0x2843, 0x2844, 0x2845, 0x2846, 0x2847,
	0x2848, 0x2849, 0x284A, 0x284B, 0x284C, 0x284D, 0x284E, 0x284F,
	0x2850, 0x2851, 0x2852, 0x2853, 0x2854, 0x2855, 0x2856, 0x2857,
	0x2858, 0x2859, 0x285A, 0x285B, 0x285C, 0x285D, 0x285E, 0x285F,
	0x2860, 0x2861, 0x2862, 0x2863, 0x2864, 0x2865, 0x2866, 0x2867,
	0x2868, 0x2869, 0x286A, 0x286B, 0x286C, 0x286D, 0x286E, 0x286F,
	0x2870, 0x2871, 0x2872, 0x2873, 0x2874, 0x2875, 0x2876, 0x2877,
	0x2878, 0x2879, 0x287A, 0x287B, 0x287C, 0x287D, 0x287E, 0x287F,
	0x2880, 0x2881, 0x2882, 0x2883, 0x2884, 0x2885, 0x2886, 0x2887,
	0x2888, 0x2889, 0x288A, 0x288B, 0x288C, 0x288D, 0x288E, 0x288F,
	0x2890, 0x2891, 0x2892, 0x2893, 0x2894, 0x2895, 0x2896, 0x2897,
	0x2898, 0x2899, 0x289A, 0x289B, 0x289C, 0x289D, 0x289E, 0x289F,
	0x28A0, 0x28A1, 0x28A2, 0x28A3, 0x28A4, 0x28A5, 0x28A6, 0x28A7,
	0x28A8, 0x28A9, 0x28AA, 0x28AB, 0x28AC, 0x28AD, 0x28AE, 0x28AF,
	0x28B0, 0x28B1, 0x28B2, 0x28B3, 0x28B4, 0x28B5, 0x28B6, 0x28B7,
	0x28B8, 0x28B9, 0x28BA, 0x28BB, 0x28BC, 0x28BD, 0x28BE, 0x28BF,
	0x28C0, 0x28C1, 0x28C2, 0x28C3, 0x28C4, 0x28C5, 0x28C6, 0x28C7,
	0x28C8, 0x28C9, 0x28CA, 0x28CB, 0x28CC, 0x28CD, 0x28CE, 0x28CF,
	0x28D0, 0x28D1, 0x28D2, 0x28D3, 0x28D4, 0x28D5, 0x28D6, 0x28D7,
	0x28D8, 0x28D9, 0x28DA, 0x28DB, 0x28DC, 0x28DD, 0x28DE, 0x28DF,
	0x28E0, 0x28E1, 0x28E2, 0x28E3, 0x28E4, 0x28E5, 0x28E6, 0x28E7,
	0x28E8, 0x28E9, 0x28EA, 0x28EB, 0x28EC, 0x28ED, 0x28EE, 0x28EF,
	0x28F0, 0x28F1, 0x28F2, 0x28F3, 0x28F4, 0x28F5, 0x28F6, 0x28F7,
	0x28F8, 0x28F9, 0x28FA, 0x28FB, 0x28FC, 0x28FD, 0x28FE, 0x28FF,
}

func getBrailleChar(pattern int) string {
	if pattern < 0 || pattern > 255 {
		return " "
	}
	return string(braillePatterns[pattern])
}

type MicroHistogram struct {
	histogram []int
}

// NewMicroHistogramFromBins creates a MicroHistogram directly from a slice of integer bins.
// This is useful when the bins have already been calculated externally.
func NewMicroHistogramFromBins(bins []int) MicroHistogram {
	return MicroHistogram{histogram: bins}
}

// NewMicroHistogram creates histogram buckets from a slice of timestamps and returns a slice of bucket counts.
func NewMicroHistogram(timestamps []time.Time, bucketCount int) MicroHistogram {
	if len(timestamps) == 0 || bucketCount <= 0 {
		return MicroHistogram{histogram: make([]int, bucketCount)}
	}

	// Find min and max times
	minTime := timestamps[0]
	maxTime := timestamps[0]
	for _, t := range timestamps {
		if t.Before(minTime) {
			minTime = t
		}
		if t.After(maxTime) {
			maxTime = t
		}
	}

	// If all timestamps are the same, put everything into one bucket
	if minTime.Equal(maxTime) {
		histogram := make([]int, bucketCount)
		// Distribute the count across the first few buckets if bucketCount > 1
		// This makes single-point histograms visible across the graph.
		if bucketCount > 0 {
			histogram[0] = len(timestamps) // All data in the first bucket
		}
		return MicroHistogram{histogram: histogram}
	}

	// Calculate bucket duration
	totalDuration := maxTime.Sub(minTime)
	// Ensure bucketDuration is at least 1 nanosecond to avoid division by zero if totalDuration is 0
	if totalDuration == 0 {
		totalDuration = 1 * time.Nanosecond
	}
	bucketDuration := totalDuration / time.Duration(bucketCount)
	if bucketDuration == 0 { // Ensure minimum duration for small time ranges
		bucketDuration = 1 * time.Nanosecond
	}

	// Create histogram
	histogram := make([]int, bucketCount)
	for _, t := range timestamps {
		// Calculate bucket index, ensuring it's within bounds
		bucketIndex := int(t.Sub(minTime) / bucketDuration)
		if bucketIndex >= bucketCount {
			bucketIndex = bucketCount - 1 // Place at the last bucket if exactly maxTime
		}
		if bucketIndex < 0 { // Should not happen with minTime check, but for safety
			bucketIndex = 0
		}
		histogram[bucketIndex]++
	}

	return MicroHistogram{histogram: histogram}
}

type UserEvent struct {
	Timestamp time.Time
	UserID    string
}

func NewUserMicroHistogram(events []UserEvent, bucketCount int) MicroHistogram {
	if len(events) == 0 || bucketCount <= 0 {
		return MicroHistogram{histogram: make([]int, bucketCount)}
	}

	// Find min and max times
	minTime := events[0].Timestamp
	maxTime := events[0].Timestamp
	for _, e := range events {
		if e.Timestamp.Before(minTime) {
			minTime = e.Timestamp
		}
		if e.Timestamp.After(maxTime) {
			maxTime = e.Timestamp
		}
	}
	logger.Log.Println(minTime, maxTime)

	if minTime.Equal(maxTime) {
		buckets := make(map[string]struct{})
		for _, e := range events {
			buckets[e.UserID] = struct{}{}
		}
		histogram := make([]int, bucketCount)
		if bucketCount > 0 {
			histogram[0] = len(buckets) // All unique users in the first bucket
		}
		return MicroHistogram{histogram: histogram}
	}

	// Calculate bucket duration
	totalDuration := maxTime.Sub(minTime)
	if totalDuration == 0 {
		totalDuration = 1 * time.Nanosecond
	}
	bucketDuration := totalDuration / time.Duration(bucketCount)
	if bucketDuration == 0 {
		bucketDuration = 1 * time.Nanosecond
	}

	// Track unique users in each bucket
	buckets := make([]map[string]struct{}, bucketCount)
	for i := range buckets {
		buckets[i] = make(map[string]struct{})
	}

	for _, e := range events {
		bucketIndex := int(e.Timestamp.Sub(minTime) / bucketDuration)
		if bucketIndex >= bucketCount {
			bucketIndex = bucketCount - 1
		}
		if bucketIndex < 0 {
			bucketIndex = 0
		}
		buckets[bucketIndex][e.UserID] = struct{}{}
	}

	// Convert to histogram
	histogram := make([]int, bucketCount)
	for i, m := range buckets {
		histogram[i] = len(m)
	}

	return MicroHistogram{histogram: histogram}
}

func (h MicroHistogram) Render(width int, color lipgloss.Color) string { // Added 'color lipgloss.Color' parameter
	if len(h.histogram) == 0 || width <= 0 {
		return strings.Repeat(" ", width)
	}

	// Find max value for scaling
	maxVal := 0
	for _, val := range h.histogram {
		if val > maxVal {
			maxVal = val
		}
	}

	if maxVal == 0 {
		return strings.Repeat(" ", width)
	}

	brailleVerticalResolution := 8

	canvasWidthPixels := width * 2
	canvas := make([][]bool, brailleVerticalResolution)
	for i := range canvas {
		canvas[i] = make([]bool, canvasWidthPixels)
	}

	for canvasCol := 0; canvasCol < canvasWidthPixels; canvasCol++ {
		binIndex := (canvasCol * len(h.histogram)) / canvasWidthPixels
		if binIndex >= len(h.histogram) {
			binIndex = len(h.histogram) - 1
		}

		binValue := h.histogram[binIndex]

		barHeightPixels := float64(binValue) * float64(brailleVerticalResolution) / float64(maxVal)

		for y := 0; y < int(math.Ceil(barHeightPixels)); y++ {
			canvasRow := brailleVerticalResolution - 1 - y
			if canvasRow >= 0 && canvasRow < brailleVerticalResolution {
				canvas[canvasRow][canvasCol] = true
			}
		}
	}

	brailleLine := strings.Builder{}

	for brailleCol := 0; brailleCol < width; brailleCol++ {
		pattern := 0

		canvasColLeft := brailleCol * 2
		canvasColRight := brailleCol * 2 + 1

		dotMap := []struct {
			yOffset int
			xOffset int
			bit     int
		}{
			{0, 0, brailleDot1},
			{1, 0, brailleDot2},
			{2, 0, brailleDot3},
			{3, 0, brailleDot7},

			{0, 1, brailleDot4},
			{1, 1, brailleDot5},
			{2, 1, brailleDot6},
			{3, 1, brailleDot8},
		}

		for _, dm := range dotMap {
			canvasY := dm.yOffset
			canvasX := -1

			if dm.xOffset == 0 {
				canvasX = canvasColLeft
			} else {
				canvasX = canvasColRight
			}

			if canvasY >= 0 && canvasY < brailleVerticalResolution && canvasX >= 0 && canvasX < len(canvas[0]) {
				if canvas[canvasY][canvasX] {
					pattern |= dm.bit
				}
			}
		}
		brailleChar := getBrailleChar(pattern)
		brailleLine.WriteString(brailleChar)
	}

	// Apply the passed-in color to the barStyle
	// If no color is passed (e.g. lipgloss.Color("")), you might want a default
	if color == "" {
		color = styles.Blue // Default color if none provided
	}
	barStyle := lipgloss.NewStyle().Foreground(color)
	return barStyle.Render(brailleLine.String())
}

// // Render now produces a Braille micro-histogram string.
// // It assumes a height of 1 terminal row, using 8 "sub-pixels" vertically.
// func (h MicroHistogram) Render(width int) string {
// 	if len(h.histogram) == 0 || width <= 0 {
// 		return strings.Repeat(" ", width)
// 	}

// 	// Find max value for scaling
// 	maxVal := 0
// 	for _, val := range h.histogram {
// 		if val > maxVal {
// 			maxVal = val
// 		}
// 	}

// 	if maxVal == 0 {
// 		return strings.Repeat(" ", width)
// 	}

// 	// Braille characters provide 4 vertical "pixels" per terminal row (dots 1,2,3,7 and 4,5,6,8)
// 	// For a micro-histogram, we use 1 terminal row, so 8 "sub-pixels" for maximum resolution.
// 	brailleVerticalResolution := 8

// 	// --- Canvas initialization ---
// 	// The canvas needs to be twice as wide as the output graph width
// 	// because each Braille character represents 2 horizontal "pixels".
// 	canvasWidthPixels := width * 2
// 	canvas := make([][]bool, brailleVerticalResolution)
// 	for i := range canvas {
// 		canvas[i] = make([]bool, canvasWidthPixels)
// 	}

// 	// --- Draw bars on canvas ---
// 	// Iterate through each horizontal pixel column on the canvas
// 	for canvasCol := 0; canvasCol < canvasWidthPixels; canvasCol++ {
// 		// Map the canvas pixel column back to a histogram bin index
// 		// This distributes the histogram bins across the canvas width
// 		binIndex := (canvasCol * len(h.histogram)) / canvasWidthPixels
// 		if binIndex >= len(h.histogram) {
// 			binIndex = len(h.histogram) - 1 // Safety check for last pixel
// 		}

// 		binValue := h.histogram[binIndex]

// 		// Calculate bar height in terms of canvas "pixels" (0 to brailleVerticalResolution-1)
// 		// Scale the bin value to the full vertical resolution of the Braille character
// 		barHeightPixels := float64(binValue) * float64(brailleVerticalResolution) / float64(maxVal)

// 		// Fill canvas from bottom up for the current bar
// 		for y := 0; y < int(math.Ceil(barHeightPixels)); y++ {
// 			canvasRow := brailleVerticalResolution - 1 - y // Fill from the bottom up (inverted Y-axis for drawing)
// 			if canvasRow >= 0 && canvasRow < brailleVerticalResolution {
// 				canvas[canvasRow][canvasCol] = true
// 			}
// 		}
// 	}

// 	// --- Convert canvas to Braille string ---
// 	brailleLine := strings.Builder{}

// 	// Iterate for the single terminal row (brailleRow is 0)
// 	// Iterate for each Braille character column in the output
// 	for brailleCol := 0; brailleCol < width; brailleCol++ {
// 		pattern := 0

// 		// Calculate the corresponding pixel columns on the high-resolution canvas
// 		canvasColLeft := brailleCol * 2
// 		canvasColRight := brailleCol * 2 + 1

// 		// Define the mapping of Braille dots to canvas pixel positions for a single Braille character.
// 		// yOffset (0-3) maps to vertical position within the 2x4 braille cell.
// 		// xOffset (0-1) maps to horizontal position (left or right column of dots).
// 		dotMap := []struct {
// 			yOffset int // Vertical sub-row (0-3 for 4 sub-rows per Braille char row)
// 			xOffset int // Horizontal sub-column (0 for left dots, 1 for right dots)
// 			bit     int // The Braille dot bitmask
// 		}{
// 			{0, 0, brailleDot1}, // Top-most Y, Left X -> Dot 1
// 			{1, 0, brailleDot2}, // 2nd Y, Left X -> Dot 2
// 			{2, 0, brailleDot3}, // 3rd Y, Left X -> Dot 3
// 			{3, 0, brailleDot7}, // Bottom-most Y, Left X -> Dot 7

// 			{0, 1, brailleDot4}, // Top-most Y, Right X -> Dot 4
// 			{1, 1, brailleDot5}, // 2nd Y, Right X -> Dot 5
// 			{2, 1, brailleDot6}, // 3rd Y, Right X -> Dot 6
// 			{3, 1, brailleDot8}, // Bottom-most Y, Right X -> Dot 8
// 		}

// 		// Iterate through all 8 potential dots for the current Braille character
// 		for _, dm := range dotMap {
// 			canvasY := dm.yOffset // Since we are generating a 1-row graph, brailleRow is 0, so canvasY is just yOffset.
// 			canvasX := -1         // Initialize canvasX for the current dot

// 			// Determine which canvas column to check based on xOffset
// 			if dm.xOffset == 0 { // Left dots (1,2,3,7)
// 				canvasX = canvasColLeft
// 			} else { // Right dots (4,5,6,8)
// 				canvasX = canvasColRight
// 			}

// 			// Check if the current canvas pixel exists and is set
// 			if canvasY >= 0 && canvasY < brailleVerticalResolution && canvasX >= 0 && canvasX < len(canvas[0]) {
// 				if canvas[canvasY][canvasX] {
// 					pattern |= dm.bit // Set the corresponding Braille dot bit
// 				}
// 			}
// 		}
// 		brailleChar := getBrailleChar(pattern)
// 		brailleLine.WriteString(brailleChar)
// 	}

// 	barStyle := lipgloss.NewStyle().Foreground(styles.Green) // Use a consistent color
// 	return barStyle.Render(brailleLine.String())
// }
