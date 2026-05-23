/**
 * callingdata_koen.js → SQLite 마이그레이션 스크립트
 * 실행: (backend 폴더에서) npm run import
 */

import { callingdatas } from '../../js/callingdata_koen.js'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '../db/calling.db')

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

const insert = db.prepare(`
  INSERT OR REPLACE INTO calling (dt, title, ko_text1, ko_text2, en_text1, en_text2)
  VALUES (?, ?, ?, ?, ?, ?)
`)

let count = 0
db.exec('BEGIN')
try {
  for (const item of callingdatas) {
    if (item.dtidx === '0000') continue
    insert.run(
      item.dtidx,
      item.dtdata[0] ?? '',
      item.dtdata[1] ?? '',
      item.dtdata[2] ?? '',
      item.dtdata[3] ?? '',
      item.dtdata[4] ?? ''
    )
    count++
  }
  db.exec('COMMIT')
} catch (err) {
  db.exec('ROLLBACK')
  throw err
}

console.log(`Done: ${count} records imported → ${DB_PATH}`)
db.close()
