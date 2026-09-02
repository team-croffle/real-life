# real-life

NestJS 12 + Vue 3 기반 pnpm 모노레포. `server`(API) / `web`(클라이언트) / `shared`(공용 타입·상수) 세 워크스페이스로 구성된다.

## 기술 스택

- **서버**: NestJS 12, Drizzle ORM(PostgreSQL), AWS SDK v3(S3 호환, MinIO), `@google/genai`(Gemini API)
- **클라이언트**: Vue 3, Vite 8, Vue Router 5(파일 기반 라우팅), vue-i18n, Tailwind CSS v4
- **공용**: TypeScript(`shared` 워크스페이스로 타입/상수 단일 소스화)
- **툴링**: pnpm workspace, oxlint/oxfmt, husky + lint-staged, Docker Compose(Postgres, MinIO)

## 프로젝트 구조

```
real-life/
├── server/            # NestJS API 서버 (@nest-vue/server)
│   ├── src/
│   │   ├── common/        # 공통 필터 등
│   │   ├── database/      # DatabaseModule, Drizzle 스키마
│   │   ├── health/        # 헬스체크
│   │   └── users/         # 사용자 도메인 (controller/service/dto)
│   ├── drizzle/       # 마이그레이션 산출물
│   └── test/          # e2e 테스트
├── web/               # Vue 3 + Vite 클라이언트 (@nest-vue/web)
│   └── src/
│       ├── components/    # UI 컴포넌트
│       ├── composables/   # useApi 등
│       ├── i18n/          # vue-i18n 설정 및 로케일
│       └── routes/        # 파일 기반 라우트
├── shared/            # server/web 공용 타입·인터페이스·상수 (@nest-vue/shared)
│   └── src/
│       ├── constants/
│       └── types/
└── docker/            # Dockerfile, docker-compose(dev/prod)
```

## 시작하기

```bash
pnpm install                          # 리포지토리 루트에서 1회

pnpm docker:dev                       # Postgres, MinIO 등 개발용 인프라 기동

cp server/.env.example server/.env    # 환경 변수 설정 (server/README.md 참고)
cp web/.env.example web/.env          # 필요 시

pnpm dev                              # server + web 동시 실행
# 또는 개별 실행
pnpm dev:server
pnpm dev:web
```

- 서버: http://localhost:3000
- 클라이언트: http://localhost:5173

## 주요 스크립트

| 명령어 | 설명 |
| --- | --- |
| `pnpm dev` | server + web 동시 개발 서버 실행 |
| `pnpm build` | server + web 프로덕션 빌드 |
| `pnpm typecheck` | 전체 워크스페이스 타입체크 |
| `pnpm test` | 서버 단위 테스트 (Jest) |
| `pnpm lint` / `pnpm lint:fix` | oxlint |
| `pnpm format` / `pnpm format:check` | oxfmt |
| `pnpm db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle 마이그레이션 관리 |
| `pnpm docker:dev` / `docker:dev:down` | 개발용 Docker Compose |
| `pnpm docker:prod` | 프로덕션 Docker Compose 빌드/기동 |

## 더 알아보기

- 서버 상세(환경 변수, Drizzle, API 목록): [`server/README.md`](./server/README.md)
- 클라이언트 상세(라우팅, i18n, 스타일): [`web/README.md`](./web/README.md)
