package config

import (
	"github.com/tom-draper/nginx-analytics/cli/internal/env"
)

type Config struct {
	ServerURL        string
	AccessPath       string
	ErrorPath        string
	SystemMonitoring bool
	AuthToken        string
	LogFormat        string
}

var DefaultConfig = Config{
	ServerURL:        "",
	AccessPath:       "/var/log/nginx",
	ErrorPath:        "/var/log/nginx",
	SystemMonitoring: false,
	AuthToken:        "",
	LogFormat:        "$remote_addr - $remote_user [$time_local] \"$request\" $status $body_bytes_sent \"$http_referer\" \"$http_user_agent\"",
}

func LoadConfig() Config {
	env := env.LoadEnv()

	accessPath := resolveValue(env.AccessPath, DefaultConfig.AccessPath)
	// If an access path provided, use as default error path
	defaultErrorPath := DefaultConfig.ErrorPath
	if accessPath != DefaultConfig.AccessPath {
		defaultErrorPath = accessPath
	}

	return Config{
		ServerURL:        resolveValue(env.ServerURL, DefaultConfig.ServerURL),
		AccessPath:       accessPath,
		ErrorPath:        resolveValue(env.ErrorPath, defaultErrorPath),
		SystemMonitoring: resolveBool(env.SystemMonitoring, DefaultConfig.SystemMonitoring),
		AuthToken:        resolveValue(env.AuthToken, DefaultConfig.AuthToken),
		LogFormat:        resolveValue(env.LogFormat, DefaultConfig.LogFormat),
	}
}

func resolveValue(envVal, defaultVal string) string {
	if envVal != "" && envVal != defaultVal {
		return envVal
	}
	return defaultVal
}

func resolveBool(envVal, defaultVal bool) bool {
	if envVal {
		return true
	}
	return defaultVal
}
