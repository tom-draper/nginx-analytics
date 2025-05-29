package env

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Env struct {
	Port             string
	AccessPath       string
	ErrorPath        string
	SystemMonitoring bool
	AuthToken        string
}

func LoadEnv() Env {
	// Load .env file if present
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	env := Env{
		Port: os.Getenv("PORT"),
		AccessPath:       os.Getenv("NGINX_ANALYTICS_ACCESS_PATH"),
		ErrorPath:        os.Getenv("NGINX_ANALYTICS_ERROR_PATH"),
		SystemMonitoring: os.Getenv("NGINX_ANALYTICS_SYSTEM_MONITORING") == "true",
		AuthToken:        os.Getenv("NGINX_ANALYTICS_AUTH_TOKEN"),
	}

	return env
}
