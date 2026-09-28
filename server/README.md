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

| 변수                   | 필수 | 기본값                  | 설명                                            |
| ---------------------- | ---- | ----------------------- | ----------------------------------------------- |
| `DATABASE_URL`         | O    | -                       | `postgresql://user:pass@host:5432/db`           |
| `PORT`                 | X    | `3000`                  | HTTP 포트                                       |
| `CORS_ORIGIN`          | X    | `http://localhost:5173` | 허용 오리진. credentials 쿠키라 `*` 불가        |
| `DATABASE_POOL_MAX`    | X    | `10`                    | pg 커넥션 풀 최대 크기                          |
| `NODE_ENV`             | X    | -                       | `development` / `production`                    |
| `BETTER_AUTH_SECRET`   | O    | -                       | 세션 서명 키. 32자 이상                         |
| `BETTER_AUTH_URL`      | X    | `http://localhost:3000` | 서버 origin. Better Auth baseURL                |
| `GOOGLE_CLIENT_ID`     | X    | -                       | 없으면 Google 로그인은 비활성                   |
| `GOOGLE_CLIENT_SECRET` | X    | -                       | OAuth 코드 교환용. ID 토큰 로그인에는 비워 둔다 |
| `SMTP_HOST`            | X    | `smtp.gmail.com`        | Gmail SMTP 호스트                               |
| `SMTP_PORT`            | X    | `587`                   | `587`은 STARTTLS, `465`는 SSL                   |
| `SMTP_USER`            | X    | -                       | Gmail 주소. 비밀번호 가입 메일 발송             |
| `SMTP_PASS`            | X    | -                       | Gmail **앱 비밀번호** (계정 비밀번호 아님)      |
| `MAIL_FROM`            | X    | `SMTP_USER`             | From 헤더. 비우면 SMTP_USER                     |
| `WEB_ORIGIN`           | X    | `CORS_ORIGIN`           | 인증 메일 링크 베이스 (`/verify-email?token=`)  |

세션은 Better Auth httpOnly 쿠키다. 웹은 `credentials: 'include'`로 쿠키를 실어 보낸다. 가드는 세션이 살아 있는지 본다.

Gmail SMTP: Google 계정에서 2단계 인증을 켠 뒤 [앱 비밀번호](https://myaccount.google.com/apppasswords)를 발급한다. 16자리를 공백 없이 `SMTP_PASS`에 넣고 `SMTP_USER`에 그 Gmail을 넣는다. SMTP가 없으면 이메일 가입은 503이다. SMTP가 있는데 발송만 실패하면 가입은 되고 재발송하면 된다.

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

BETTER_AUTH_SECRET=change-me-better-auth-secret-32chars
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

SMTP_USER=
SMTP_PASS=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
MAIL_FROM=
WEB_ORIGIN=http://localhost:5173

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

| 메서드 | 경로                               | 설명                                                                             |
| ------ | ---------------------------------- | -------------------------------------------------------------------------------- |
| POST   | `/api/account/register`            | 이메일 가입. 세션 없음. 인증 메일 발송                                           |
| GET    | `/api/auth/*`                      | Better Auth 핸들러. 로그인·로그아웃·세션·메일 인증·Google ID 토큰                |
| POST   | `/api/account/resend-verification` | 미인증 계정에 메일 재발송. 존재 여부는 응답에 안 남                              |
| GET    | `/api/account/me`                  | 현재 유저 (세션 쿠키)                                                            |
| POST   | `/api/account/onboarding`          | 세션 있는 계정의 닉네임·직업군 설정. 메일 인증 또는 Google 이후                  |
| DELETE | `/api/account/me`                  | 회원 탈퇴. 비밀번호 계정이면 password, Google만 있으면 idToken                   |
| POST   | `/api/quests`                      | 퀘스트 등록 (세션). 루틴 또는 마감. 골드·XP는 서버가 표로 계산하고 본문에만 넣음 |
| GET    | `/api/wallet`                      | 골드 잔액 (세션). 지갑이 없으면 0                                                |
| GET    | `/api/wallet/entries`              | 골드 내역 (세션). 최신순. `page` 기본 1, `size` 기본 20, 상한 100                |
| POST   | `/api/wallet/post-hoc-deductions`  | 사후 차감 (세션). 본문 `amount`. 외상 한도를 넘으면 400                          |
