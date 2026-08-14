package config

import (
	"github.com/tom-draper/nginx-analytics/agent/internal/args"
	"github.com/tom-draper/nginx-analytics/agent/internal/env"
)

type Config struct {
	Port             string
	AccessPath       string
	ErrorPath        string
	SystemMonitoring bool
	AuthToken        string
	LogFormat        string
}

var DefaultConfig = Config{
	Port:             "5000",
	AccessPath:       "/var/log/nginx",
	ErrorPath:        "/var/log/nginx",
	SystemMonitoring: false,
	AuthToken:        "",
	LogFormat:        "$remote_addr - $remote_user [$time_local] \"$request\" $status $body_bytes_sent \"$http_referer\" \"$http_user_agent\"",
}

func LoadConfig() Config {
	env := env.LoadEnv()
	args := args.Parse(args.Arguments{
		Port:             DefaultConfig.Port,
		AccessPath:       DefaultConfig.AccessPath,
		ErrorPath:        DefaultConfig.ErrorPath,
		SystemMonitoring: DefaultConfig.SystemMonitoring,
		AuthToken:        DefaultConfig.AuthToken,
		LogFormat:        DefaultConfig.LogFormat,
	})

	accessPath := resolveValue(args.AccessPath, env.AccessPath, DefaultConfig.AccessPath)
	// If an access path provided, use as default error path
	defaultErrorPath := DefaultConfig.ErrorPath
	if accessPath != DefaultConfig.AccessPath {
		defaultErrorPath = accessPath
	}

	return Config{
		Port:             resolveValue(args.Port, env.Port, DefaultConfig.Port),
		AccessPath:       accessPath,
		ErrorPath:        resolveValue(args.ErrorPath, env.ErrorPath, defaultErrorPath),
		SystemMonitoring: resolveBool(args.SystemMonitoring, args.SystemMonitoringSet, env.SystemMonitoring, DefaultConfig.SystemMonitoring),
		AuthToken:        resolveValue(args.AuthToken, env.AuthToken, ""),
		LogFormat:        resolveValue(args.LogFormat, env.LogFormat, DefaultConfig.LogFormat),
	}
}

func resolveValue(argVal, envVal, defaultVal string) string {
	if argVal != "" && argVal != defaultVal {
		return argVal
	}
	if envVal != "" && envVal != defaultVal {
		return envVal
	}
	return defaultVal
}

func resolveBool(argVal, argSet, envVal, defaultVal bool) bool {
	if argSet {
		return argVal
	}
	if envVal {
		return true
	}
	return defaultVal
}
