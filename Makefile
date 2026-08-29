# React ERP Frontend Makefile

.DEFAULT_GOAL := help
DOCKER_HUB_URL := hub.vincent-lee.org
IMAGE_NAME ?= erp-frontend-react
IMAGE_TAG = latest
CONTAINER_NAME ?= erp-frontend-react-container

ifeq ($(OS),Windows_NT)
  DEVNULL := 2>nul
  IGNORE  := || exit /B 0
else
  DEVNULL := 2>/dev/null
  IGNORE  := || true
endif

.PHONY: help
help: ## Show available commands
	@echo "React ERP Frontend Build Tools"
	@echo ""
	@echo "Available commands:"
	@echo "  help           Show this help"
	@echo "  dev            Start development server"
	@echo "  build          Build production version"
	@echo "  docker-prod    Start production with Docker"
	@echo "  docker-build   Build Docker image"
	@echo "  docker-push    Push Docker image to Hub"
	@echo "  docker-rebuild Rebuild Docker image and push"
	@echo "  docker-stop    Stop Docker environments"
	@echo "  clean          Clean Docker resources"

.PHONY: dev
dev:
	pnpm run dev

.PHONY: build
build:
	pnpm run build

.PHONY: docker-prod
docker-prod:
	@cd deploy/prod && docker compose up -d

DOCKER_PLATFORM ?= linux/amd64

.PHONY: docker-build
docker-build:
	@echo "Building Docker image ($(DOCKER_PLATFORM)): $(IMAGE_NAME)"
	docker build --platform $(DOCKER_PLATFORM) -f deploy/prod/Dockerfile -t $(IMAGE_NAME):$(IMAGE_TAG) .
	@echo "Docker image built successfully: $(IMAGE_NAME)"

.PHONY: docker-push
docker-push:
	@echo "Pushing Docker image: $(DOCKER_HUB_URL)/$(IMAGE_NAME):$(IMAGE_TAG)"
	docker tag $(IMAGE_NAME):$(IMAGE_TAG) $(DOCKER_HUB_URL)/$(IMAGE_NAME):$(IMAGE_TAG)
	docker push $(DOCKER_HUB_URL)/$(IMAGE_NAME):$(IMAGE_TAG)
	@echo "Docker image pushed successfully"

.PHONY: docker-rebuild
docker-rebuild: docker-build docker-push

.PHONY: docker-stop
docker-stop:
	@cd deploy/prod && docker compose down $(IGNORE)

.PHONY: clean
clean:
	docker rm -f $(CONTAINER_NAME) $(IGNORE)
	docker rmi -f $(IMAGE_NAME):$(IMAGE_TAG) $(IGNORE)
	docker rmi -f $(DOCKER_HUB_URL)/$(IMAGE_NAME):$(IMAGE_TAG) $(IGNORE)
	@echo "Cleanup completed"
