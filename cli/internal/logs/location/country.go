package location

import (
	"fmt"
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
// func CountryFlagEmoji(code string) string {
// 	if len(code) != 2 {
// 		return "🏳️"
// 	}
// 	// Unicode regional indicator symbols are A=🇦 (0x1F1E6)
// 	r1 := 0x1F1E6 + int(code[0]-'A')
// 	r2 := 0x1F1E6 + int(code[1]-'A')
// 	return string([]rune{rune(r1), rune(r2)})
// }

func CountryCodeToEmoji(countryCode string) (string, error) {
	if len(countryCode) != 2 {
		return "", fmt.Errorf("invalid country code length: must be 2 characters")
	}

	countryCode = strings.ToUpper(countryCode)
	runes := []rune(countryCode)

	// Unicode regional indicator symbols start at 0x1F1E6 (A)
	emoji := ""
	for _, r := range runes {
		if r < 'A' || r > 'Z' {
			return "", fmt.Errorf("invalid character in country code")
		}
		emoji += string(rune(0x1F1E6 + (r - 'A')))
	}
	if emoji == "" {
		return "", fmt.Errorf("failed to convert country code to emoji")
	}
	return emoji, nil
}
