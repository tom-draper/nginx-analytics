package ansi

import "regexp"

var ansiRegexp = regexp.MustCompile(`\x1b\[[0-9;]*m`)

func StripANSI(s string) string {
	return ansiRegexp.ReplaceAllString(s, "")
}
