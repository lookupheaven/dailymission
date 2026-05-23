# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**Daily Mission (데일리미션)** — 날짜별 묵상 데이터를 제공하는 웹 서비스 + 운영자 관리 어드민.  
GitHub: https://github.com/lookupheaven/dailymission

## 주요 명령어

```powershell
# 서버 실행 (개발 — 파일 변경 시 자동 재시작)
cd backend
npm run dev

# 서버 실행 (운영)
npm start

# 최초 설치 / DB 재생성
npm install
npm run import          # js/callingdata_koen.js → backend/db/calling.db (366일)
```

> `npm run dev` / `npm start` 실행 시 3000번 포트를 자동으로 해제(`kill-port`)하고 시작한다.  
> Node.js v22 이상 필수 — `node:sqlite` 내장 모듈 사용. 모든 node 명령에 `--experimental-sqlite` 플래그가 붙는다.

## 아키텍처

```
code3/                          ← express.static 루트 (프론트엔드 직접 서빙)
├── index.html                  ← 메인 서비스 (오늘 묵상 자동 표시)
├── js/calling.js               ← fetch('/api/v1/calling/today') 후 DOM 렌더링
├── admin/                      ← 운영자 전용 (서버 세션 인증 후 접근)
│   ├── login.html              ← 공개 (세션 체크 미적용)
│   ├── index.html              ← 데이터 CRUD + 엑셀 import/export
│   ├── users.html              ← 운영자 계정 관리
│   └── manual.html             ← MANUAL.md를 marked.js로 렌더링
└── backend/
    ├── server.js               ← 진입점 (포트 바인딩)
    ├── app.js                  ← 미들웨어 순서 (session → /admin 보호 → static → API)
    ├── config/db.js            ← DatabaseSync 싱글턴, 테이블 초기화, admin seed
    ├── utils/password.js       ← PBKDF2-SHA512 해시/검증 (node:crypto)
    ├── middleware/auth.js      ← requireAuth (req.session.userId 확인)
    ├── models/                 ← DB 쿼리만 담당 (callingModel, userModel)
    ├── controllers/            ← 요청/응답 처리 (callingController, authController, userController)
    ├── routes/
    │   ├── auth.js             ← /api/auth (login, logout, me)
    │   └── v1/
    │       ├── calling.js      ← /api/v1/calling
    │       └── users.js        ← /api/v1/users
    └── scripts/import_data.js  ← 마이그레이션 (ES import로 callingdata_koen.js 직접 읽음)
```

## 핵심 설계 결정

**미들웨어 순서 (app.js):** session → `/admin` 보호 인라인 미들웨어 → `express.static` → API 라우터 순서가 중요. static보다 `/admin` 보호가 먼저여야 서버 사이드 리다이렉트가 작동한다.

**인증 범위:** `/admin/login.html`, `/admin/login.css`만 공개. 나머지 `/admin/*`는 세션 없으면 `login.html`로 리다이렉트. API는 `requireAuth` 미들웨어로 401 반환.

**calling API 공개/비공개 분리:** `GET /api/v1/calling/*`는 메인 사이트에서 인증 없이 사용하므로 공개. `POST / PUT / DELETE / export / import`는 라우터 내부에서 `requireAuth`를 개별 적용.

**고정 경로 우선순위:** `/api/v1/calling/today`, `/export`, `/list`를 `/:date` 앞에 등록해야 충돌을 피할 수 있다. `/api/v1/users/:id/password`도 `/:id` 앞에 등록.

**SQLite:** `node:sqlite`의 `DatabaseSync`를 `config/db.js`에서 싱글턴으로 export. 트랜잭션이 없는 경우 `db.prepare().run()` 사용, 일괄 처리는 `BEGIN/COMMIT` SQL로 직접 처리 (better-sqlite3의 `.transaction()` 헬퍼 없음).

**엑셀:** `multer({ storage: memoryStorage() })`로 파일을 디스크에 저장하지 않고 `req.file.buffer`로 바로 `xlsx.read()`.

## 환경 제약

- **Windows + Visual Studio 없음** → 네이티브 컴파일이 필요한 npm 패키지(`better-sqlite3`, `bcrypt` 등) 사용 불가. 순수 JS 또는 Node.js 내장 모듈로 대체.
- **프레임워크 없음** — 프론트엔드와 어드민 모두 vanilla JS. React/Vue 도입 불필요.
- **세션 저장소** — 기본 인메모리 세션. 서버 재시작 시 세션 소멸(재로그인 필요). 서버 재시작이 잦으면 파일/Redis 세션 스토어 도입 고려.

## 웹 접속 경로

| URL | 설명 |
|-----|------|
| `http://localhost:3000/` | 메인 서비스 |
| `http://localhost:3000/?cdate=0523` | 특정 날짜(MMDD) 지정 |
| `http://localhost:3000/admin/login.html` | 운영자 로그인 (초기: admin/adminpass) |
| `http://localhost:3000/admin/` | 데이터 관리 |
| `http://localhost:3000/admin/users.html` | 계정 관리 |
| `http://localhost:3000/admin/manual.html` | 운영 매뉴얼 |
