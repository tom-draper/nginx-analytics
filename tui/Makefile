APP_NAME := nginx-analytics
BUILD_DIR := bin
CMD_DIR := ./cmd/$(APP_NAME)

.PHONY: all build run clean

all: build

build:
	@echo "Building $(APP_NAME)..."
	go build -o $(BUILD_DIR)/$(APP_NAME) $(CMD_DIR)

run: build
	@echo "Running $(APP_NAME)..."
	./$(BUILD_DIR)/$(APP_NAME)

clean:
	@echo "Cleaning..."
	rm -rf $(BUILD_DIR)
