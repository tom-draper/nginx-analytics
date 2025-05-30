package data

import (
	"math"
	"math/rand"
	"time"
)

// GenerateSampleData creates sample data with random fluctuations
func GenerateSampleData(n int, min, max float64) []float64 {
	// Generate sample data with some random fluctuation
	data := make([]float64, n)
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	
	// Start with a value in the middle of the range
	value := min + (max-min)/2
	
	for i := 0; i < n; i++ {
		// Add some random fluctuation
		change := (max - min) * 0.05 * (r.Float64()*2 - 1)
		value += change
		
		// Keep within bounds
		if value < min {
			value = min
		}
		if value > max {
			value = max
		}
		
		// Add some sine wave pattern for more interesting data
		sinComponent := (max-min) * 0.1 * math.Sin(float64(i)/10)
		data[i] = value + sinComponent
	}
	
	return data
}
