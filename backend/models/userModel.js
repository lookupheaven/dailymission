import db from '../config/db.js'

const userModel = {
  findAll() {
    return db.prepare('SELECT id, username, role, created_at FROM users ORDER BY id').all()
  },

  findById(id) {
    return db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(id)
  },

  findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  },

  create({ username, password, role = 'admin' }) {
    return db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, password, role)
  },

  update(id, { username, role }) {
    return db.prepare('UPDATE users SET username = ?, role = ? WHERE id = ?').run(username, role, id)
  },

  updatePassword(id, password) {
    return db.prepare('UPDATE users SET password = ? WHERE id = ?').run(password, id)
  },

  remove(id) {
    return db.prepare('DELETE FROM users WHERE id = ?').run(id)
  },

  count() {
    return db.prepare('SELECT COUNT(*) as cnt FROM users').get()
  },
}

export default userModel
