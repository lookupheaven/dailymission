import db from '../config/db.js'

const callingModel = {
  findByDate(dt) {
    return db.prepare('SELECT * FROM calling WHERE dt = ?').get(dt)
  },

  findAll({ limit = 20, offset = 0 } = {}) {
    return db.prepare('SELECT * FROM calling ORDER BY dt LIMIT ? OFFSET ?').all(limit, offset)
  },

  findAllNoLimit() {
    return db.prepare('SELECT * FROM calling ORDER BY dt').all()
  },

  count() {
    return db.prepare('SELECT COUNT(*) as total FROM calling').get()
  },

  create({ dt, title = '', ko_text1 = '', ko_text2 = '', en_text1 = '', en_text2 = '' }) {
    return db.prepare(`
      INSERT INTO calling (dt, title, ko_text1, ko_text2, en_text1, en_text2)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(dt, title, ko_text1, ko_text2, en_text1, en_text2)
  },

  update(dt, { title = '', ko_text1 = '', ko_text2 = '', en_text1 = '', en_text2 = '' }) {
    return db.prepare(`
      UPDATE calling SET title=?, ko_text1=?, ko_text2=?, en_text1=?, en_text2=? WHERE dt=?
    `).run(title, ko_text1, ko_text2, en_text1, en_text2, dt)
  },

  remove(dt) {
    return db.prepare('DELETE FROM calling WHERE dt = ?').run(dt)
  },

  upsert({ dt, title = '', ko_text1 = '', ko_text2 = '', en_text1 = '', en_text2 = '' }) {
    return db.prepare(`
      INSERT OR REPLACE INTO calling (dt, title, ko_text1, ko_text2, en_text1, en_text2)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(dt, title, ko_text1, ko_text2, en_text1, en_text2)
  },
}

export default callingModel
