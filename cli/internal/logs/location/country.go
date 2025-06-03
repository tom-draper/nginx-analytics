package location

import (
	"strings"
)

// Get country code from location string
func GetCountryCode(location string) string {
	if len(location) >= 2 {
		return strings.ToUpper(location[:2]) // assuming location is country code
	}
	return "UN" // unknown
}

// Convert ISO country code to flag emoji
func CountryFlagEmoji(code string) string {
	if len(code) != 2 {
		return "🏳️"
	}
	// Unicode regional indicator symbols are A=🇦 (0x1F1E6)
	r1 := 0x1F1E6 + int(code[0]-'A')
	r2 := 0x1F1E6 + int(code[1]-'A')
	return string([]rune{rune(r1), rune(r2)})
}
