.PHONY: cloud-build cloud-up cloud-down cloud-logs local-infra-up local-infra-down local-infra-logs local-backend local-frontend test

-include .env
export

GRADLE_USER_HOME := $(CURDIR)/.gradle
JAVA_VERSION ?= 23
CLOUD_COMPOSE := docker compose -p crm-cloud -f docker-compose.cloud.yml
LOCAL_INFRA_COMPOSE := docker compose -p crm-local-infra -f docker-compose.local-infra.yml

cloud-build:
	$(CLOUD_COMPOSE) build

cloud-up:
	$(CLOUD_COMPOSE) up -d

cloud-down:
	$(CLOUD_COMPOSE) down

cloud-logs:
	$(CLOUD_COMPOSE) logs -f backend frontend postgres

local-infra-up:
	$(LOCAL_INFRA_COMPOSE) up -d

local-infra-down:
	$(LOCAL_INFRA_COMPOSE) down

local-infra-logs:
	$(LOCAL_INFRA_COMPOSE) logs -f postgres minio

local-backend:
	cd cloud/backend && GRADLE_USER_HOME=$(GRADLE_USER_HOME) ./gradlew -PjavaVersion=$(JAVA_VERSION) bootRun

local-frontend:
	cd cloud/frontend && npm install && npm run dev

test:
	cd cloud/backend && GRADLE_USER_HOME=$(GRADLE_USER_HOME) ./gradlew -PjavaVersion=$(JAVA_VERSION) test
