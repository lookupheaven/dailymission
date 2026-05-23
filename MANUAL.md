# Daily Mission (데일리미션) — 운영 매뉴얼

> **GitHub:** https://github.com/lookupheaven/dailymission  
> **최종 수정:** 2026-05-23

---

## 목차

1. [시스템 구성](#1-시스템-구성)
2. [환경 요구사항](#2-환경-요구사항)
3. [최초 설치](#3-최초-설치-최초-1회)
4. [웹 접속 경로](#4-웹-접속-경로)
5. [서버 실행](#5-서버-실행)
6. [서버 종료](#6-서버-종료)
7. [운영자 어드민 사용법](#7-운영자-어드민-사용법)
8. [데이터 관리](#8-데이터-관리)
9. [API 목록](#9-api-목록)
10. [GitHub 코드 관리](#10-github-코드-관리)
11. [트러블슈팅](#11-트러블슈팅)

---

## 1. 시스템 구성

```
code3/
├── index.html                      # 메인 서비스 페이지
├── css/                            # 스타일시트
├── images/                         # 이미지
├── js/
│   ├── calling.js                  # 프론트엔드 (API 호출)
│   └── callingdata_koen.js         # 원본 데이터 소스 (마이그레이션용)
├── admin/                          # 운영자 관리 화면
│   ├── index.html                  # 데이터 관리
│   ├── users.html                  # 계정 관리
│   └── login.html                  # 로그인
├── backend/                        # API 서버
│   ├── server.js                   # 서버 진입점
│   ├── app.js                      # Express 설정
│   ├── config/db.js                # SQLite 연결
│   ├── controllers/                # 비즈니스 로직
│   ├── models/                     # DB 쿼리
│   ├── routes/                     # API 라우터
│   ├── middleware/auth.js          # 인증 미들웨어
│   ├── utils/password.js           # 패스워드 해시
│   ├── db/calling.db               # SQLite DB
│   └── scripts/import_data.js     # 데이터 마이그레이션
├── .gitignore
└── MANUAL.md
```

---

## 2. 환경 요구사항

| 항목 | 버전 |
|------|------|
| Node.js | **v22 이상** (node:sqlite 내장 모듈 사용) |
| npm | v10 이상 |

```powershell
# 버전 확인
node --version
npm --version
```

---

## 3. 최초 설치 (최초 1회)

```powershell
# 1. GitHub에서 코드 받기
git clone https://github.com/lookupheaven/dailymission.git
cd dailymission

# 2. 패키지 설치
cd backend
npm install

# 3. DB 초기화 (366일 데이터 마이그레이션)
npm run import
```

마이그레이션 성공 시:
```
기본 관리자 계정 생성: admin / adminpass
Done: 366 records imported → backend/db/calling.db
```

> ⚠️ 최초 로그인 후 반드시 admin 패스워드를 변경하세요.

---

## 4. 웹 접속 경로

| 용도 | URL |
|------|-----|
| **메인 서비스** | http://localhost:3000/ |
| **운영자 로그인** | http://localhost:3000/admin/login.html |
| **데이터 관리** | http://localhost:3000/admin/ |
| **계정 관리** | http://localhost:3000/admin/users.html |

### 특정 날짜 조회 (메인 서비스)
```
http://localhost:3000/?cdate=0523
```
> `cdate` 파라미터 생략 시 오늘 날짜 자동 표시

---

## 5. 서버 실행

### 개발 환경 (파일 변경 시 자동 재시작)

```powershell
cd C:\Projects\code3\backend
npm run dev
```

### 운영 환경

```powershell
cd C:\Projects\code3\backend
npm start
```

정상 시작 메시지:
```
Server running on http://localhost:3000
```

> `npm run dev` / `npm start` 실행 전 포트 충돌을 자동으로 해제합니다.

---

## 6. 서버 종료

### 방법 1 — 실행 중인 터미널에서

```
Ctrl + C
```

### 방법 2 — 백그라운드 실행 중일 때 (PowerShell)

```powershell
# 3000번 포트 점유 프로세스 확인 후 종료
$pid = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess
if ($pid) { Stop-Process -Id $pid -Force; Write-Output "서버 종료됨" }
```

---

## 7. 운영자 어드민 사용법

### 로그인

```
접속: http://localhost:3000/admin/login.html
초기 계정: admin / adminpass
```

### 데이터 관리 화면 기능

| 버튼 | 기능 |
|------|------|
| **+ 새 항목** | 날짜별 묵상 데이터 추가 |
| **수정** | 기존 데이터 수정 |
| **삭제** | 데이터 삭제 |
| **⬇ 엑셀 다운로드** | 전체 데이터 `.xlsx` 내보내기 |
| **⬆ 엑셀 업로드** | 엑셀 파일로 일괄 입력 |
| **👥 계정 관리** | 운영자 계정 관리 페이지 이동 |
| **로그아웃** | 세션 종료 |

### 계정 관리 화면 기능

| 버튼 | 기능 |
|------|------|
| **+ 계정 추가** | 새 운영자 계정 생성 |
| **수정** | 아이디 변경 |
| **패스워드** | 패스워드 변경 |
| **삭제** | 계정 삭제 (본인 계정 삭제 불가) |

### 엑셀 파일 컬럼 형식

엑셀 업로드 시 아래 컬럼명을 정확히 맞춰야 합니다.

| 컬럼명 | 설명 | 예시 |
|--------|------|------|
| `날짜(MMDD)` | 월일 4자리 | `0523` |
| `제목` | 날짜·테마 제목 | `5월 23일 묵상` |
| `한글본문1` | 한글 묵상 본문 | |
| `한글본문2` | 한글 성경 구절 | |
| `영어본문1` | 영어 묵상 본문 | |
| `영어본문2` | 영어 성경 구절 | |

> 엑셀 다운로드 후 형식을 확인하고 같은 형식으로 작성하세요.

---

## 8. 데이터 관리

### 어드민에서 직접 수정 (권장)

```
http://localhost:3000/admin/ 접속 → 수정 버튼
```

### 엑셀 일괄 업데이트

```
1. ⬇ 엑셀 다운로드 → 파일 수정
2. ⬆ 엑셀 업로드 → 자동 반영 (기존 날짜 덮어쓰기)
```

### 원본 JS 파일로 전체 재마이그레이션

`js/callingdata_koen.js` 수정 후:

```powershell
cd C:\Projects\code3\backend
npm run import
```

---

## 9. API 목록

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/v1/calling/today` | 오늘 묵상 | 불필요 |
| GET | `/api/v1/calling/:date` | 날짜별 묵상 (MMDD) | 불필요 |
| GET | `/api/v1/calling/list` | 목록 (페이징) | 불필요 |
| GET | `/api/v1/calling/export` | 엑셀 다운로드 | 필요 |
| POST | `/api/v1/calling/import` | 엑셀 업로드 | 필요 |
| POST | `/api/v1/calling` | 데이터 추가 | 필요 |
| PUT | `/api/v1/calling/:date` | 데이터 수정 | 필요 |
| DELETE | `/api/v1/calling/:date` | 데이터 삭제 | 필요 |
| POST | `/api/auth/login` | 로그인 | 불필요 |
| POST | `/api/auth/logout` | 로그아웃 | 필요 |
| GET | `/api/auth/me` | 현재 세션 확인 | 필요 |
| GET | `/api/v1/users` | 계정 목록 | 필요 |
| POST | `/api/v1/users` | 계정 추가 | 필요 |
| PUT | `/api/v1/users/:id` | 계정 수정 | 필요 |
| PUT | `/api/v1/users/:id/password` | 패스워드 변경 | 필요 |
| DELETE | `/api/v1/users/:id` | 계정 삭제 | 필요 |

---

## 10. GitHub 코드 관리

### 변경사항 저장 및 업로드

```powershell
cd C:\Projects\code3

git add .
git commit -m "변경 내용 간략히 설명"
git push
```

### 서버에서 최신 코드 받기

```powershell
cd C:\Projects\code3
git pull

# 패키지 변경이 있을 경우
cd backend
npm install

# 서버 재시작
npm start
```

### 주요 Git 명령어

```powershell
git status          # 변경된 파일 목록 확인
git log --oneline   # 커밋 히스토리 확인
git diff            # 변경 내용 상세 확인
```

---

## 11. 트러블슈팅

### 포트 3000 사용 중 오류
```
Error: listen EADDRINUSE: address already in use :::3000
```
```powershell
$pid = (Get-NetTCPConnection -LocalPort 3000).OwningProcess
Stop-Process -Id $pid -Force
npm run dev
```

### DB 파일 없음 오류
```powershell
cd C:\Projects\code3\backend
npm run import
```

### 로그인이 안 될 때
- 패스워드 초기화: 어드민 → 계정 관리 → 패스워드 변경
- DB 재생성 시 초기 계정 복원: `npm run import` 재실행

### Node.js 버전 오류
```powershell
node --version   # v22 이상 확인
```

### PowerShell 스크립트 실행 오류
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
