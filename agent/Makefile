# Makefile for nginx-analytics agent

.PHONY: all build test clean run

all: build

build:
	@echo "Building agent..."
	go build -o bin/agent ./cmd/agent

test:
	@echo "Running tests..."
	go test ./...

clean:
	@echo "Cleaning up..."
	go clean
	rm -f bin/agent

run: build
	@echo "Running agent..."
	./bin/agent
