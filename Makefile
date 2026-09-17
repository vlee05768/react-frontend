# React ERP Frontend Makefile

.DEFAULT_GOAL := help
DOCKER_HUB_URL := hub.vincent-lee.org
IMAGE_NAME ?= erp-frontend-react
IMAGE_TAG ?= latest
CONTAINER_NAME ?= erp-frontend-react-container
GCP_PROJECT := erp-production-508010
GCP_REGION := asia-east1
GCP_REPOSITORY := erp-hub
GCP_REGISTRY_HOST := $(GCP_REGION)-docker.pkg.dev
GCP_REGISTRY := $(GCP_REGISTRY_HOST)/$(GCP_PROJECT)/$(GCP_REPOSITORY)
GCP_IMAGE := $(GCP_REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG)
GCP_PLATFORM := linux/amd64

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
	@echo "  docker-push-gcp    Preflight and push Docker image to GCP Artifact Registry"
	@echo "  docker-rebuild-gcp Build linux/amd64 image and push to GCP Artifact Registry"
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
	@cd ../deploy/prod && docker compose up -d

DOCKER_PLATFORM ?= linux/amd64

.PHONY: docker-build
docker-build:
	@echo "Building Docker image ($(DOCKER_PLATFORM)): $(IMAGE_NAME)"
	docker build --platform "$(DOCKER_PLATFORM)" -f "Dockerfile" -t "$(IMAGE_NAME):$(IMAGE_TAG)" .
	@echo "Docker image built successfully: $(IMAGE_NAME)"

.PHONY: docker-push
docker-push:
	@echo "Pushing Docker image: $(DOCKER_HUB_URL)/$(IMAGE_NAME):$(IMAGE_TAG)"
	docker tag "$(IMAGE_NAME):$(IMAGE_TAG)" "$(DOCKER_HUB_URL)/$(IMAGE_NAME):$(IMAGE_TAG)"
	docker push "$(DOCKER_HUB_URL)/$(IMAGE_NAME):$(IMAGE_TAG)"
	@echo "Docker image pushed successfully"

.PHONY: docker-rebuild
docker-rebuild: docker-build docker-push

.PHONY: gcp-preflight
gcp-preflight:
	@set -eu; \
		docker_config="$${DOCKER_CONFIG:-$$HOME/.docker}/config.json"; \
		if ! command -v gcloud >/dev/null 2>&1; then \
			echo "錯誤：找不到 gcloud，請先安裝 Google Cloud CLI。" >&2; exit 1; \
		fi; \
		if ! command -v docker >/dev/null 2>&1; then \
			echo "錯誤：找不到 docker，請先安裝並啟動 Docker。" >&2; exit 1; \
		fi; \
		project="$$(gcloud config get-value project 2>/dev/null)"; \
		if [ "$$project" != "$(GCP_PROJECT)" ]; then \
			echo "錯誤：目前 gcloud project 為 '$$project'，必須先設定為 $(GCP_PROJECT)。" >&2; \
			echo "請執行：gcloud config set project $(GCP_PROJECT)" >&2; exit 1; \
		fi; \
		if ! gcloud artifacts repositories describe "$(GCP_REPOSITORY)" --location="$(GCP_REGION)" --project="$(GCP_PROJECT)" >/dev/null 2>&1; then \
			echo "錯誤：Artifact Registry repository $(GCP_REPOSITORY) 不存在或目前帳號無法讀取。" >&2; \
			echo "如確認應建立，請由具權限的操作者執行：gcloud artifacts repositories create $(GCP_REPOSITORY) --repository-format=docker --location=$(GCP_REGION) --project=$(GCP_PROJECT)" >&2; exit 1; \
		fi; \
		if ! command -v docker-credential-gcloud >/dev/null 2>&1; then \
			echo "錯誤：找不到 docker-credential-gcloud，請先完成 gcloud Docker credential helper 設定。" >&2; \
			echo "請執行：gcloud auth configure-docker $(GCP_REGION)-docker.pkg.dev" >&2; exit 1; \
		fi; \
		if ! DOCKER_CONFIG="$$docker_config" python3 -c 'import json, os, sys; p=os.environ["DOCKER_CONFIG"]; c=json.load(open(p)); h=c.get("credHelpers", {}).get("$(GCP_REGISTRY_HOST)"); s=c.get("credsStore"); sys.exit(0 if h == "gcloud" or s == "gcloud" else 1)' >/dev/null 2>&1; then \
			echo "錯誤：Docker 尚未設定 $(GCP_REGISTRY_HOST) 的 gcloud credential helper。" >&2; \
			echo "請執行：gcloud auth configure-docker $(GCP_REGISTRY_HOST)" >&2; exit 1; \
		fi; \
		if ! printf '%s\n' '$(GCP_REGISTRY_HOST)' | docker-credential-gcloud get >/dev/null 2>&1; then \
			echo "錯誤：Docker credential helper 無法取得 $(GCP_REGISTRY_HOST) 的登入憑證。" >&2; \
			echo "請確認 gcloud 登入狀態後再試；不會在此流程讀取或列印秘密。" >&2; exit 1; \
		fi; \
		if ! docker info >/dev/null 2>&1; then \
			echo "錯誤：Docker daemon 未執行或目前帳號無法連線。" >&2; exit 1; \
		fi; \
		if ! docker image inspect "$(IMAGE_NAME):$(IMAGE_TAG)" >/dev/null 2>&1; then \
			echo "錯誤：本機映像 $(IMAGE_NAME):$(IMAGE_TAG) 不存在，請先執行 make docker-build。" >&2; exit 1; \
		fi; \
		echo "GCP preflight 通過：project=$(GCP_PROJECT), repository=$(GCP_REPOSITORY), image=$(IMAGE_NAME):$(IMAGE_TAG)"

.PHONY: docker-push-gcp
docker-push-gcp: gcp-preflight
	@echo "Pushing Docker image: $(GCP_IMAGE)"
	docker tag "$(IMAGE_NAME):$(IMAGE_TAG)" "$(GCP_IMAGE)"
	docker push "$(GCP_IMAGE)"
	@set -eu; \
		manifest="$$(docker manifest inspect --verbose "$(GCP_IMAGE)")"; \
		if ! printf '%s\n' "$$manifest" | python3 -c 'import json, sys; d=json.load(sys.stdin); items=d if isinstance(d, list) else [d]; platforms=[((p or {}).get("os"), (p or {}).get("architecture")) for x in items for p in ([x.get("platform"), (x.get("Descriptor") or {}).get("platform"), x] + [m.get("platform") for m in x.get("manifests", []) if isinstance(m, dict)]) if isinstance(p, dict)]; sys.exit(0 if ("linux", "amd64") in platforms else 1)' >/dev/null 2>&1; then \
			echo "錯誤：GCP image manifest 未確認包含 $(GCP_PLATFORM)。" >&2; exit 1; \
		fi; \
		digest="$$(gcloud artifacts docker images describe "$(GCP_IMAGE)" --format='value(image_summary.digest)' 2>/dev/null)"; \
		if [ -z "$$digest" ]; then \
			echo "錯誤：無法從 Artifact Registry 讀回 image digest。" >&2; exit 1; \
		fi; \
		echo "GCP image verified: image=$(GCP_IMAGE), tag=$(IMAGE_TAG), digest=$$digest, platform=$(GCP_PLATFORM)"

.PHONY: docker-build-gcp
docker-build-gcp:
	@echo "Building GCP Docker image ($(GCP_PLATFORM)): $(IMAGE_NAME)"
	docker build --platform "$(GCP_PLATFORM)" -f "Dockerfile" -t "$(IMAGE_NAME):$(IMAGE_TAG)" .
	@echo "GCP Docker image built successfully: $(IMAGE_NAME)"

.PHONY: docker-rebuild-gcp
docker-rebuild-gcp: docker-build-gcp
	+$(MAKE) --no-print-directory docker-push-gcp

.PHONY: docker-stop
docker-stop:
	@cd ../deploy/prod && docker compose down $(IGNORE)

.PHONY: clean
clean:
	docker rm -f "$(CONTAINER_NAME)" $(IGNORE)
	docker rmi -f "$(IMAGE_NAME):$(IMAGE_TAG)" $(IGNORE)
	docker rmi -f "$(DOCKER_HUB_URL)/$(IMAGE_NAME):$(IMAGE_TAG)" $(IGNORE)
	@echo "Cleanup completed"
