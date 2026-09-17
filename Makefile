# React ERP Frontend Makefile

.DEFAULT_GOAL := help
IMAGE_NAME ?= erp-frontend-react
IMAGE_TAG ?= latest
CONTAINER_NAME ?= erp-frontend-react-container
DOCKER_PLATFORM ?= linux/amd64

.PHONY: help
help: ## Show available commands
	@echo "React ERP Frontend Build Tools"
	@echo ""
	@echo "Available commands:"
	@echo "  help           Show this help"
	@echo "  dev            Start development server"
	@echo "  build          Build production version"
	@echo "  docker-build   Build Docker image"
	@echo "  clean          Clean local Docker resources"

.PHONY: dev
dev:
	pnpm run dev

.PHONY: build
build:
	pnpm run build

.PHONY: docker-build
docker-build:
	@echo "Building Docker image ($(DOCKER_PLATFORM)): $(IMAGE_NAME)"
	docker build --platform "$(DOCKER_PLATFORM)" -f "Dockerfile" -t "$(IMAGE_NAME):$(IMAGE_TAG)" .
	@echo "Docker image built successfully: $(IMAGE_NAME)"

.PHONY: clean
clean:
	docker rm -f "$(CONTAINER_NAME)" 2>/dev/null || true
	docker rmi -f "$(IMAGE_NAME):$(IMAGE_TAG)" 2>/dev/null || true
	@echo "Cleanup completed"
