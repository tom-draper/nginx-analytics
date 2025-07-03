package env

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Env struct {
	ServerURL string
}

func LoadEnv() Env {
	// Load .env file if present
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	return Env{
		ServerURL: os.Getenv("NGINX_ANALYTICS_SERVER_URL"),
	}
}
