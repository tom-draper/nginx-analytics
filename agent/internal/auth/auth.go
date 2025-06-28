package auth

import (
	"net/http"
	"strings"
)

func IsAuthenticated(r *http.Request, authToken string) bool {
	if authToken == "" {
		return true
	}

	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return false
	}

	if !strings.HasPrefix(authHeader, "Bearer ") {
		return false
	}

	providedAuthToken := strings.TrimPrefix(authHeader, "Bearer ")
	return providedAuthToken == authToken
}
