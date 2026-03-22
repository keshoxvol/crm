# VSZ CRM

## Правила

- Миграции БД: только Liquibase, только новые changeset, без потери данных.
- Критический функционал обязательно покрывается тестами.
- Подробно: `docs/development-rules.md`.

## Cloud контур (Docker)

```bash
docker compose -f docker-compose.cloud.yml build
docker compose -f docker-compose.cloud.yml up -d
```

Если на локальной машине установлена Java 21, можно отдельно собрать backend перед Docker-сборкой:

```bash
cd cloud/backend
GRADLE_USER_HOME=/Users/pc/Desktop/projects/crm/.gradle ./gradlew clean bootJar
```

Порты:
- frontend: http://localhost:3000
- backend: http://localhost:8080/api/public/health
- postgres: localhost:5433

Остановка:

```bash
docker compose -f docker-compose.cloud.yml down
```

Альтернатива через `Makefile`:

```bash
make cloud-build
make cloud-up
```

## Локальная разработка без Docker

Требования:
- Java `23` (или `21`)
- Node.js + npm
- Docker (только для инфраструктуры: PostgreSQL и S3)

1. Поднять инфраструктуру:

```bash
make local-infra-up
```

Сервисы:
- PostgreSQL: `localhost:5432` (db/user/pass: `crm_cloud` / `crm` / `crm`)
- S3 (MinIO API): `http://localhost:9000`
- MinIO Console: `http://localhost:9001` (`minio` / `minio123`)

Backend:

Если ранее запускали cloud-контур, сначала освободите порты:

```bash
make cloud-down
```

```bash
cd cloud/backend
GRADLE_USER_HOME=/Users/pc/Desktop/projects/crm/.gradle ./gradlew -PjavaVersion=23 bootRun --args='--spring.profiles.active=local'
```

Frontend:

```bash
cd cloud/frontend
npm install
npm run dev
```

Порты:
- frontend dev: http://localhost:15173
- backend local: http://localhost:18080

Для локального backend нужен PostgreSQL с БД `crm_cloud` и пользователем `crm`/`crm` на `localhost:5432`.

Быстрый запуск через `Makefile`:

```bash
make local-infra-up
make local-backend
make local-frontend
```

Остановка инфраструктуры:

```bash
make local-infra-down
```

## Первая фича: Клиенты (MVP)

Backend API:
- `POST /api/clients` — создать клиента
- `PATCH /api/clients/{id}` — редактировать клиента
- `GET /api/clients` — список клиентов (фильтры: `q`, `status`, `source`, `temperature`, `modelInterest`)
- `GET /api/clients/{id}` — карточка клиента
- `GET /api/clients/{id}/history` — история изменений карточки

Примечание: endpoints защищены Spring Security (требуется авторизация).

## Модуль пользователей (MVP)

Backend API:
- `POST /api/users` — создать пользователя
- `GET /api/users` — таблица пользователей
- `PATCH /api/users/{id}` — изменить пользователя

## Авторизация

Backend API:
- `POST /api/auth/login` — вход по email/паролю
- `GET /api/auth/me` — текущий пользователь

Все бизнес-endpoint'ы закрыты для неавторизованных пользователей.

Тестовый superadmin, создается автоматически при старте backend:
- email: `admin@vsz.local`
- password: `admin123`

## Тесты backend

Если локально нет Java 21, тесты можно запускать в Docker:

```bash
docker run --rm -v "$PWD/cloud/backend:/app" -w /app eclipse-temurin:21-jdk bash -lc "./gradlew --no-daemon test"
```
