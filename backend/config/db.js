import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { hashPassword } from '../utils/password.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH   = join(__dirname, '../db/calling.db')

const db = new DatabaseSync(DB_PATH)

db.exec(`
  CREATE TABLE IF NOT EXISTS calling (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    dt        TEXT    UNIQUE NOT NULL,
    title     TEXT    DEFAULT '',
    ko_text1  TEXT    DEFAULT '',
    ko_text2  TEXT    DEFAULT '',
    en_text1  TEXT    DEFAULT '',
    en_text2  TEXT    DEFAULT ''
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    UNIQUE NOT NULL,
    password   TEXT    NOT NULL,
    role       TEXT    DEFAULT 'admin',
    created_at TEXT    DEFAULT (datetime('now', 'localtime'))
  )
`)

// 최초 실행 시 기본 admin 계정 생성
const { cnt } = db.prepare('SELECT COUNT(*) as cnt FROM users').get()
if (cnt === 0) {
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(
    'admin',
    hashPassword('adminpass'),
    'admin'
  )
  console.log('기본 관리자 계정 생성: admin / adminpass')
}

export default db
