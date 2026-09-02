# @nest-vue/server

NestJS 12 + Drizzle ORM(PostgreSQL) 기반 API 서버.

## 실행

```bash
pnpm install                  # 리포지토리 루트에서 1회
cp server/.env.example server/.env

pnpm --filter @nest-vue/server dev     # 개발 (tsc watch + tsc-alias watch + node --watch)
pnpm --filter @nest-vue/server build   # 프로덕션 빌드
pnpm --filter @nest-vue/server start   # 빌드 결과 실행
```

Postgres와 MinIO는 `docker/docker-compose.dev.yaml` 로 띄우는 것을 권장한다.

```bash
pnpm docker:dev
```

## 환경 변수

`.env.example` 은 의도적으로 빈 파일이다. 아래 값을 `server/.env` 에 채운다.

| 변수                | 필수 | 기본값 | 설명                                  |
| ------------------- | ---- | ------ | ------------------------------------- |
| `DATABASE_URL`      | O    | -      | `postgresql://user:pass@host:5432/db` |
| `PORT`              | X    | `3000` | HTTP 포트                             |
| `CORS_ORIGIN`       | X    | `*`    | 허용 오리진                           |
| `DATABASE_POOL_MAX` | X    | `10`   | pg 커넥션 풀 최대 크기                |
| `NODE_ENV`          | X    | -      | `development` / `production`          |

### MinIO (S3 호환 오브젝트 스토리지)

`@aws-sdk/client-s3` v3 로 접근한다. MinIO 는 virtual-host 스타일 주소를 쓰지 않으므로
`forcePathStyle: true` 가 필요하다.

| 변수                   | 필수 | 기본값      | 설명                                                             |
| ---------------------- | ---- | ----------- | ---------------------------------------------------------------- |
| `S3_ENDPOINT`          | O    | -           | `http://localhost:9000` (compose 내부에서는 `http://minio:9000`) |
| `S3_ACCESS_KEY_ID`     | O    | -           | MinIO access key                                                 |
| `S3_SECRET_ACCESS_KEY` | O    | -           | MinIO secret key                                                 |
| `S3_BUCKET`            | O    | `nest-vue`  | 버킷 이름                                                        |
| `S3_REGION`            | X    | `us-east-1` | MinIO 는 무시하지만 SDK 가 요구한다                              |
| `S3_FORCE_PATH_STYLE`  | X    | `true`      | MinIO 는 반드시 `true`                                           |
| `S3_PUBLIC_URL`        | X    | -           | 외부에 노출할 객체 URL 베이스(리버스 프록시/CDN)                 |

### Gemini API

`@google/genai` 를 사용한다.

| 변수             | 필수 | 기본값             | 설명                       |
| ---------------- | ---- | ------------------ | -------------------------- |
| `GEMINI_API_KEY` | O    | -                  | Google AI Studio 에서 발급 |
| `GEMINI_MODEL`   | X    | `gemini-3.7-flash` | 사용할 모델 ID             |

### 예시

```dotenv
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nest_vue
DATABASE_POOL_MAX=10

S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=nest-vue
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_URL=http://localhost:9000/nest-vue

GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.7-flash
```

## Drizzle

```bash
pnpm db:generate   # 스키마 변경 → SQL 마이그레이션 생성 (server/drizzle)
pnpm db:migrate    # 마이그레이션 적용
pnpm db:push       # 마이그레이션 파일 없이 스키마 직접 반영 (로컬 전용)
pnpm db:studio     # Drizzle Studio
```

스키마는 `src/database/schema/` 에 두고 `src/database/schema/index.ts` 에서 재-export 한다.
`DatabaseModule` 은 전역 모듈이며 `DRIZZLE` 토큰으로 `DrizzleDb` 를 주입한다.

```ts
constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}
```

## 빌드 산출물 경로

`shared` 를 **소스 그대로** 참조하므로 `rootDir` 이 리포지토리 루트다.
따라서 출력이 `dist/server/src/main.js` + `dist/shared/src/*.js` 형태가 된다.
`tsc-alias` 가 `@nest-vue/shared`, `@/*` 경로 별칭을 상대 경로로 다시 써 준다.

## 테스트

```bash
pnpm --filter @nest-vue/server test       # 단위 (src/**/*.spec.ts)
pnpm --filter @nest-vue/server test:e2e   # e2e (test/**/*.e2e-spec.ts)
```

## API

| 메서드 | 경로                     | 설명                      |
| ------ | ------------------------ | ------------------------- |
| GET    | `/api/health`            | 헬스체크                  |
| GET    | `/api/users?page=&size=` | 사용자 목록(페이지네이션) |
| GET    | `/api/users/:id`         | 단건 조회                 |
| POST   | `/api/users`             | 생성                      |
| PATCH  | `/api/users/:id`         | 수정                      |
| DELETE | `/api/users/:id`         | 삭제                      |
