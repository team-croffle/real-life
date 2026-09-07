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

아래 값을 `server/.env` 에 채운다. 새 변수를 추가하면 `.env.example` 을 같은 커밋에서 맞춘다.

| 변수                 | 필수 | 기본값 | 설명                                  |
| -------------------- | ---- | ------ | ------------------------------------- |
| `DATABASE_URL`       | O    | -      | `postgresql://user:pass@host:5432/db` |
| `PORT`               | X    | `3000` | HTTP 포트                             |
| `CORS_ORIGIN`        | X    | `*`    | 허용 오리진                           |
| `DATABASE_POOL_MAX`  | X    | `10`   | pg 커넥션 풀 최대 크기                |
| `NODE_ENV`           | X    | -      | `development` / `production`          |
| `JWT_ACCESS_SECRET`  | O    | -      | Access JWT 서명 키                    |
| `JWT_REFRESH_SECRET` | O    | -      | Refresh JWT 서명 키                   |

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

JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh

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

Access JWT 만료는 코드 상수 `ACCESS_TOKEN_EXPIRES` (**15분**)다. Access payload의 `sid`는 `refresh_tokens` 행 id다. 가드는 그 행이 폐기·만료되지 않았고 유저가 남아 있는지 확인한다. 로그아웃·탈퇴·refresh 회전 후에는 해당 access도 즉시 401이다.

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

| 메서드 | 경로                 | 설명                                                                          |
| ------ | -------------------- | ----------------------------------------------------------------------------- |
| GET    | `/api/health`        | 헬스체크                                                                      |
| POST   | `/api/auth/register` | 이메일 가입. 로그인 토큰 발급                                                 |
| POST   | `/api/auth/login`    | 이메일 로그인                                                                 |
| POST   | `/api/auth/refresh`  | Access/Refresh 재발급. 폐기된 refresh 재사용 시 해당 유저 refresh 전부 무효화 |
| POST   | `/api/auth/logout`   | 해당 refresh 폐기. 그 sid의 access도 즉시 무효                                |
| GET    | `/api/auth/me`       | 현재 유저 (Bearer access)                                                     |
| DELETE | `/api/auth/me`       | 회원 탈퇴. password 필요                                                      |
