package config

import "testing"

func TestResolveBool(t *testing.T) {
	tests := []struct {
		name                     string
		argValue, argSet, envVal bool
		defaultVal, want         bool
	}{
		{"explicit false overrides environment", false, true, true, false, false},
		{"explicit true overrides environment", true, true, false, false, true},
		{"environment is used when flag is absent", false, false, true, false, true},
		{"default is used when unset", false, false, false, true, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := resolveBool(tt.argValue, tt.argSet, tt.envVal, tt.defaultVal); got != tt.want {
				t.Fatalf("resolveBool() = %t, want %t", got, tt.want)
			}
		})
	}
}
