# Daily Mission — 개발자 매뉴얼

> **GitHub:** https://github.com/lookupheaven/dailymission  
> **최종 수정:** 2026-05-23

---

## 목차

1. [기술 스택](#1-기술-스택)
2. [전체 아키텍처](#2-전체-아키텍처)
3. [백엔드 상세](#3-백엔드-상세)
4. [데이터베이스](#4-데이터베이스)
5. [인증 시스템](#5-인증-시스템)
6. [API 명세](#6-api-명세)
7. [프론트엔드 상세](#7-프론트엔드-상세)
8. [어드민 UI](#8-어드민-ui)
9. [엑셀 Import / Export](#9-엑셀-import--export)
10. [데이터 마이그레이션](#10-데이터-마이그레이션)
11. [환경 설정](#11-환경-설정)
12. [기능 확장 가이드](#12-기능-확장-가이드)

---

## 1. 기술 스택

### 백엔드
| 항목 | 기술 | 버전 | 용도 |
|------|------|------|------|
| 런타임 | Node.js | v24 (v22+) | 서버 실행 환경 |
| 웹 프레임워크 | Express.js | 4.x | HTTP 서버, 라우팅 |
| 데이터베이스 | SQLite | node:sqlite (내장) | 데이터 저장 |
| 세션 | express-session | 1.x | 로그인 상태 유지 |
| 엑셀 처리 | xlsx (SheetJS) | 0.18.x | import/export |
| 파일 업로드 | multer | 2.x | 엑셀 파일 수신 |
| 포트 관리 | kill-port | 2.x | 서버 재시작 시 포트 자동 해제 |

### 프론트엔드
| 항목 | 기술 | 용도 |
|------|------|------|
| 언어 | Vanilla JS (ES Module) | 메인 서비스 |
| 폰트 | Pretendard, Noto Serif KR | 한글 폰트 |
| 스타일 | 순수 CSS | 빌드 도구 없음 |
| 마크다운 렌더링 | marked.js (CDN) | 매뉴얼 페이지 |

### 개발 환경
| 항목 | 내용 |
|------|------|
| OS | Windows 11 |
| 패키지 관리 | npm |
| 모듈 방식 | ES Module (`"type": "module"`) |
| 빌드 도구 | 없음 (번들러 미사용) |

> **제약:** Windows에 Visual Studio 미설치 → 네이티브 컴파일 패키지(`bcrypt`, `better-sqlite3` 등) 사용 불가.  
> `node:crypto`, `node:sqlite` 등 Node.js 내장 모듈로 대체.

---

## 2. 전체 아키텍처

```
브라우저
  │
  ├─ GET /                → index.html (정적)
  │    └─ JS fetch        → GET /api/v1/calling/today
  │
  ├─ GET /admin/*         → 세션 확인 → admin/*.html (정적)
  │    └─ JS fetch        → /api/v1/calling/* , /api/v1/users/*, /api/auth/*
  │
  └─ Express 서버 (port 3000)
       ├─ session 미들웨어
       ├─ /admin 보호 미들웨어 (세션 없으면 login.html 리다이렉트)
       ├─ express.static  → 프론트엔드 파일 서빙 (code3/ 루트)
       ├─ /api/auth       → 로그인/로그아웃/세션확인
       ├─ /api/v1/calling → 묵상 데이터 CRUD
       └─ /api/v1/users   → 운영자 계정 CRUD
              │
              └─ SQLite DB (backend/db/calling.db)
                   ├─ calling 테이블 (366일 묵상 데이터)
                   └─ users 테이블 (운영자 계정)
```

### 요청 처리 흐름

```
HTTP 요청
  → app.js (미들웨어 체인)
    → routes/v1/calling.js (URL 매핑)
      → middleware/auth.js (인증 확인, 필요한 경우)
        → controllers/callingController.js (비즈니스 로직)
          → models/callingModel.js (DB 쿼리)
            → config/db.js (DatabaseSync 싱글턴)
              → calling.db
```

---

## 3. 백엔드 상세

### 3-1. 진입점 및 앱 설정

**`backend/server.js`** — 포트 바인딩만 담당

```js
import app from './app.js'
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
```

**`backend/app.js`** — 미들웨어 등록 순서가 핵심

```
1. cors()                          // CORS 허용
2. express.json()                  // JSON 바디 파싱
3. session()                       // 세션 초기화
4. /admin 보호 미들웨어             // ← static보다 먼저 등록해야 동작
5. express.static(FRONTEND_DIR)    // 정적 파일 (code3/ 루트)
6. /api/auth 라우터                // 인증 API
7. /api/v1/calling 라우터          // 묵상 API
8. /api/v1/users 라우터            // 계정 API
9. 404 핸들러
```

> `/admin` 보호 미들웨어가 `express.static` 앞에 있어야 정적 파일 서빙 전에 세션을 확인할 수 있다.

### 3-2. 폴더별 역할

| 폴더/파일 | 역할 |
|-----------|------|
| `server.js` | 포트 바인딩 진입점 |
| `app.js` | Express 앱 조립 (미들웨어 + 라우터 연결) |
| `config/db.js` | SQLite 연결 싱글턴, 테이블 자동 생성, admin 계정 seed |
| `utils/password.js` | 패스워드 해시/검증 (순수 함수) |
| `middleware/auth.js` | `requireAuth` — API 인증 가드 |
| `models/` | DB 쿼리 함수 모음 (SQL만 존재, 로직 없음) |
| `controllers/` | 요청 파싱 → model 호출 → 응답 반환 |
| `routes/` | URL 패턴과 컨트롤러 함수 매핑 |
| `scripts/` | 1회성 실행 스크립트 (마이그레이션) |

### 3-3. ES Module 방식

`package.json`에 `"type": "module"` 설정으로 전체 백엔드가 ES Module 방식.

```js
// 올바른 import (확장자 .js 필수)
import callingModel from '../models/callingModel.js'

// __dirname 대체 패턴 (ESM에서 __dirname 없음)
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const __dirname = dirname(fileURLToPath(import.meta.url))
```

### 3-4. npm 스크립트

```json
"prestart": "kill-port 3000 || true",
"start":   "node --experimental-sqlite server.js",
"predev":  "kill-port 3000 || true",
"dev":     "node --experimental-sqlite --watch server.js",
"import":  "node --experimental-sqlite scripts/import_data.js"
```

- `--experimental-sqlite`: Node.js 내장 sqlite 모듈 활성화 플래그
- `--watch`: 파일 변경 감지 자동 재시작 (Node.js 18+ 내장)
- `pre*`: npm이 메인 스크립트 전에 자동 실행

---

## 4. 데이터베이스

### 4-1. 연결 방식

`node:sqlite`의 `DatabaseSync` — 동기식 API (async/await 불필요).

```js
// config/db.js
import { DatabaseSync } from 'node:sqlite'
const db = new DatabaseSync('/path/to/calling.db')
export default db  // 싱글턴으로 전체 공유
```

### 4-2. 테이블 스키마

**calling** — 묵상 데이터

```sql
CREATE TABLE calling (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  dt        TEXT    UNIQUE NOT NULL,   -- 날짜 키 (MMDD, 예: '0523')
  title     TEXT    DEFAULT '',        -- 제목
  ko_text1  TEXT    DEFAULT '',        -- 한글 묵상 본문
  ko_text2  TEXT    DEFAULT '',        -- 한글 성경 구절
  en_text1  TEXT    DEFAULT '',        -- 영어 묵상 본문
  en_text2  TEXT    DEFAULT ''         -- 영어 성경 구절
)
```

**users** — 운영자 계정

```sql
CREATE TABLE users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT    UNIQUE NOT NULL,
  password   TEXT    NOT NULL,          -- PBKDF2 해시 (salt:hash 형식)
  role       TEXT    DEFAULT 'admin',
  created_at TEXT    DEFAULT (datetime('now', 'localtime'))
)
```

### 4-3. 쿼리 패턴

```js
// 단건 조회
db.prepare('SELECT * FROM calling WHERE dt = ?').get(dt)

// 목록 조회
db.prepare('SELECT * FROM calling ORDER BY dt LIMIT ? OFFSET ?').all(limit, offset)

// 삽입/수정
db.prepare('INSERT INTO calling (...) VALUES (?, ?, ...)').run(v1, v2, ...)

// 트랜잭션 (node:sqlite는 .transaction() 헬퍼 없음)
db.exec('BEGIN')
try   { /* 여러 .run() */ db.exec('COMMIT') }
catch { db.exec('ROLLBACK'); throw err }
```

> **INSERT OR REPLACE:** 동일 `dt`가 있으면 덮어씀. 마이그레이션과 엑셀 import에서 사용.

### 4-4. DB 파일 위치

```
backend/db/calling.db   ← .gitignore로 git 제외
```

DB가 없는 환경에서는 `npm run import` 실행 시 자동 생성.  
`config/db.js` 로드 시 테이블이 없으면 자동으로 `CREATE TABLE IF NOT EXISTS` 실행.

---

## 5. 인증 시스템

### 5-1. 패스워드 해시 (`utils/password.js`)

Node.js 내장 `crypto` 모듈의 **PBKDF2-SHA512** 사용.

```js
// 해시 생성
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')       // 32자 랜덤 salt
  const hash = pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`                           // DB 저장 형식
}

// 검증
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  const test = pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return hash === test
}
```

- 반복 횟수: **100,000회** (브루트포스 저항)
- 출력 길이: **64바이트**
- DB 저장 형식: `"salt16hex:hash64hex"`

### 5-2. 세션 관리 (`express-session`)

```js
session({
  secret: process.env.SESSION_SECRET || 'jesus-calling-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }  // 8시간
})
```

로그인 성공 시 세션에 저장되는 값:

```js
req.session.userId   = user.id
req.session.username = user.username
req.session.role     = user.role
```

> **세션 저장소:** 기본 인메모리. 서버 재시작 시 세션 소멸(재로그인 필요).  
> 운영 환경에서 세션 영속성이 필요하면 `connect-sqlite3` 등 파일 기반 스토어 도입 필요.

### 5-3. 인증 보호 범위

| 구분 | 방식 | 적용 대상 |
|------|------|---------|
| **어드민 페이지** | 서버 사이드 리다이렉트 | `/admin/*` (login.html, login.css 제외) |
| **쓰기 API** | `requireAuth` 미들웨어 → 401 반환 | calling CRUD, export, import, users |
| **읽기 API** | 공개 | `GET /api/v1/calling/*` |

### 5-4. 인증 흐름

```
1. POST /api/auth/login  { username, password }
     → DB에서 username 조회
     → verifyPassword() 검증
     → 성공: session에 userId/username/role 저장
     → 실패: 401

2. 이후 요청
     → requireAuth: req.session.userId 존재 여부 확인
     → 없으면 401 / 있으면 next()

3. POST /api/auth/logout
     → req.session.destroy()
```

---

## 6. API 명세

### Base URL
```
http://localhost:3000
```

### 묵상 데이터 API (`/api/v1/calling`)

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/v1/calling/today` | 불필요 | 오늘 날짜 묵상 |
| GET | `/api/v1/calling/list?limit=20&offset=0` | 불필요 | 목록 페이징 |
| GET | `/api/v1/calling/:date` | 불필요 | 날짜 지정 조회 (MMDD) |
| GET | `/api/v1/calling/export` | 필요 | 전체 엑셀 다운로드 |
| POST | `/api/v1/calling` | 필요 | 새 데이터 추가 |
| POST | `/api/v1/calling/import` | 필요 | 엑셀 일괄 업로드 |
| PUT | `/api/v1/calling/:date` | 필요 | 데이터 수정 |
| DELETE | `/api/v1/calling/:date` | 필요 | 데이터 삭제 |

**응답 형식 (단건)**
```json
{
  "id": 143,
  "dt": "0523",
  "title": "5월 23일",
  "ko_text1": "한글 본문...",
  "ko_text2": "성경 구절...",
  "en_text1": "English text...",
  "en_text2": "Scripture..."
}
```

**응답 형식 (목록)**
```json
{
  "total": 366,
  "limit": 20,
  "offset": 0,
  "data": [ { ... }, { ... } ]
}
```

### 인증 API (`/api/auth`)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/login` | 로그인 `{ username, password }` |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 현재 세션 사용자 정보 |

### 계정 API (`/api/v1/users`) — 전체 인증 필요

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/v1/users` | 전체 계정 목록 |
| POST | `/api/v1/users` | 계정 추가 `{ username, password, role }` |
| PUT | `/api/v1/users/:id` | 계정 정보 수정 `{ username, role }` |
| PUT | `/api/v1/users/:id/password` | 패스워드 변경 `{ password }` |
| DELETE | `/api/v1/users/:id` | 계정 삭제 (본인 삭제 불가) |

### 에러 응답 형식

```json
{ "error": "에러 메시지" }
```

| HTTP 코드 | 의미 |
|-----------|------|
| 400 | 잘못된 입력값 |
| 401 | 인증 필요 / 로그인 실패 |
| 404 | 데이터 없음 |
| 409 | 중복 데이터 |

### 라우트 등록 주의사항

`/:date` 같은 파라미터 경로보다 고정 경로를 **반드시 먼저** 등록해야 충돌을 피할 수 있다.

```js
router.get('/today',  ...)   // ✅ 먼저
router.get('/export', ...)   // ✅ 먼저
router.get('/list',   ...)   // ✅ 먼저
router.get('/:date',  ...)   // 마지막

router.put('/:id/password', ...)  // ✅ 먼저
router.put('/:id',          ...)  // 마지막
```

---

## 7. 프론트엔드 상세

### 7-1. 메인 서비스 (`index.html` + `js/calling.js`)

빌드 도구 없는 순수 HTML + ES Module 방식.

```html
<!-- index.html -->
<script type="module" defer src="./js/calling.js"></script>
```

**`js/calling.js` 동작 순서:**

```
1. URL 파라미터 ?cdate=MMDD 확인
2. 없으면 오늘 날짜를 MMDD 형식으로 생성
3. fetch('/api/v1/calling/today') 또는 fetch('/api/v1/calling/0523')
4. 응답 데이터를 DOM에 innerHTML로 삽입
   - .green-title  ← data.title
   - .message-box[0] ← data.ko_text1 + data.ko_text2
   - .message-box[1] ← data.en_text1 + data.en_text2
5. 오류 시 날짜 문자열만 표시
```

**API_BASE 설정 (배포 시 변경 필요):**
```js
// js/calling.js 상단
const API_BASE = 'http://localhost:3000/api/v1'
// 운영: 'https://도메인/api/v1' 으로 변경
```

### 7-2. CSS 구조

| 파일 | 적용 범위 |
|------|---------|
| `css/common.css` | 전체 공통 레이아웃 |
| `css/results.css` | 묵상 내용 표시 영역 |
| `css/card.css` | 카드 컴포넌트 |
| `css/message.css` | 메시지 박스 |
| `css/questions.css` | 질문 화면 |

### 7-3. 외부 폰트 (CDN)

```html
<!-- Pretendard (한글 가변 폰트) -->
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard.../pretendardvariable-dynamic-subset.css">

<!-- Noto Serif KR (묵상 본문용 명조체) -->
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600">
```

---

## 8. 어드민 UI

### 8-1. 페이지 구성

| 파일 | URL | 설명 |
|------|-----|------|
| `admin/login.html` | `/admin/login.html` | 로그인 (공개) |
| `admin/index.html` | `/admin/` | 데이터 관리 (인증) |
| `admin/users.html` | `/admin/users.html` | 계정 관리 (인증) |
| `admin/manual.html` | `/admin/manual.html` | 매뉴얼 (인증) |

### 8-2. 공통 패턴 (admin.js, users.js)

모든 어드민 페이지는 초기화 시 인증을 확인한다.

```js
async function init() {
  const res = await fetch('/api/auth/me')
  if (!res.ok) { window.location.href = '/admin/login.html'; return }
  const me = await res.json()
  document.getElementById('header-user').textContent = `👤 ${me.username}`
  await loadTable()
}
```

**XSS 방지:** 테이블 렌더링 시 모든 데이터를 `esc()` 함수로 이스케이프.

```js
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
```

### 8-3. 어드민 CSS (`admin/admin.css`, `admin/login.css`)

| 파일 | 적용 페이지 |
|------|-----------|
| `admin.css` | index, users, manual (인증 후 페이지 공통) |
| `login.css` | login.html 전용 (공개 페이지, 별도 분리) |

> `login.css`를 별도 파일로 분리한 이유: `admin.css`는 서버의 `/admin` 보호 미들웨어로 인증 없이 접근 불가. 로그인 페이지는 스타일 파일도 공개여야 하므로 분리.

### 8-4. 매뉴얼 페이지 (`manual.html`)

```js
// MANUAL.md 파일을 fetch 후 marked.js로 렌더링
const res = await fetch('/MANUAL.md')
const md  = await res.text()
document.getElementById('manual-body').innerHTML = marked.parse(md)
```

---

## 9. 엑셀 Import / Export

### 엑셀 컬럼 형식

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `날짜(MMDD)` | 텍스트 | `0523` 형식 4자리 |
| `제목` | 텍스트 | 날짜/테마 제목 |
| `한글본문1` | 텍스트 | 한글 묵상 본문 |
| `한글본문2` | 텍스트 | 한글 성경 구절 |
| `영어본문1` | 텍스트 | 영어 묵상 본문 |
| `영어본문2` | 텍스트 | 영어 성경 구절 |

### Export 흐름

```js
// 1. DB에서 전체 데이터 조회
const rows = callingModel.findAllNoLimit()

// 2. SheetJS로 워크시트 생성
const ws = XLSX.utils.json_to_sheet(rows.map(...))
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Calling')

// 3. Buffer로 변환 후 응답
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
res.setHeader('Content-Disposition', 'attachment; filename="calling_data.xlsx"')
res.send(buf)
```

### Import 흐름

```js
// 1. multer(memoryStorage)로 파일 수신 → req.file.buffer
// 2. XLSX.read()로 파싱
const wb   = XLSX.read(req.file.buffer, { type: 'buffer' })
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })

// 3. 행 순회하며 upsert (INSERT OR REPLACE)
for (const row of rows) {
  callingModel.upsert({ dt, title, ko_text1, ko_text2, en_text1, en_text2 })
}
```

---

## 10. 데이터 마이그레이션

### 원본 데이터 구조 (`js/callingdata_koen.js`)

```js
export const callingdatas = [
  {
    idx: '1',
    dtidx: '0101',           // MMDD 형식 날짜 키
    dtdata: [
      '제목',                 // [0] title
      '한글 본문 1',           // [1] ko_text1
      '한글 성경 구절',         // [2] ko_text2
      '영어 본문 1',           // [3] en_text1
      '영어 성경 구절',         // [4] en_text2
    ]
  },
  ...
]

export const dtmap = { "0101": 1, "0102": 2, ... }  // 날짜 → 배열 인덱스
```

### 마이그레이션 스크립트 (`scripts/import_data.js`)

```
실행: cd backend && npm run import
```

- `callingdatas` 배열을 순회하며 `dtidx !== '0000'`인 항목만 DB에 `INSERT OR REPLACE`
- `BEGIN/COMMIT` 트랜잭션으로 일괄 처리 (속도 + 원자성)
- 스크립트 실행 후 `db.close()` 호출

---

## 11. 환경 설정

### 포트 변경

```powershell
# 환경변수로 포트 지정
$env:PORT = "8080"
npm start
```

### 세션 시크릿 변경 (운영 필수)

```powershell
$env:SESSION_SECRET = "강력한-랜덤-문자열"
npm start
```

또는 `.env` 파일 사용 (`.gitignore`에 포함됨):
```
PORT=3000
SESSION_SECRET=your-secret-key-here
```

> 현재는 `dotenv` 패키지 미설치. 필요 시 `npm install dotenv` 후 `server.js` 상단에 `import 'dotenv/config'` 추가.

### `.gitignore` 제외 항목

```
backend/node_modules/   # 패키지 (npm install로 재생성)
backend/db/calling.db   # DB 파일 (npm run import로 재생성)
.env                    # 환경변수 (서버마다 별도 설정)
```

---

## 12. 기능 확장 가이드

### 새 API 엔드포인트 추가 절차

```
1. models/ 에 DB 쿼리 함수 추가
2. controllers/ 에 요청 처리 함수 추가
3. routes/ 에 URL 매핑 추가
   - 고정 경로를 /:param 보다 먼저 등록할 것
4. app.js에서 인증 범위 결정 (공개 vs requireAuth)
```

### 새 어드민 페이지 추가 절차

```
1. admin/새페이지.html 생성 (admin.css 링크)
2. 초기화 함수에서 /api/auth/me 확인 (미인증 → login.html 리다이렉트)
3. 기존 페이지 헤더에 링크 버튼 추가
4. app.js의 /admin 보호 미들웨어는 자동 적용됨 (추가 설정 불필요)
```

### 세션 영속성 추가 (서버 재시작 후 로그인 유지)

```powershell
npm install connect-sqlite3
```

```js
// app.js
import connectSqlite3 from 'connect-sqlite3'
const SQLiteStore = connectSqlite3(session)

app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: './backend/db' }),
  ...
}))
```

### dotenv 환경변수 적용

```powershell
npm install dotenv
```

```js
// server.js 최상단에 추가
import 'dotenv/config'
```
