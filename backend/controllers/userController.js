import userModel from '../models/userModel.js'
import { hashPassword } from '../utils/password.js'

const userController = {
  list(req, res) {
    res.json(userModel.findAll())
  },

  create(req, res) {
    const { username, password, role = 'admin' } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: '아이디와 패스워드는 필수입니다' })
    }
    if (password.length < 4) {
      return res.status(400).json({ error: '패스워드는 4자 이상이어야 합니다' })
    }
    if (userModel.findByUsername(username)) {
      return res.status(409).json({ error: '이미 존재하는 아이디입니다' })
    }
    userModel.create({ username, password: hashPassword(password), role })
    res.status(201).json({ message: '계정 생성 완료' })
  },

  update(req, res) {
    const id = Number(req.params.id)
    const { username, role = 'admin' } = req.body
    if (!username) return res.status(400).json({ error: '아이디는 필수입니다' })
    const existing = userModel.findByUsername(username)
    if (existing && existing.id !== id) {
      return res.status(409).json({ error: '이미 존재하는 아이디입니다' })
    }
    userModel.update(id, { username, role })
    if (req.session.userId === id) req.session.username = username
    res.json({ message: '계정 수정 완료' })
  },

  changePassword(req, res) {
    const id = Number(req.params.id)
    const { password } = req.body
    if (!password || password.length < 4) {
      return res.status(400).json({ error: '패스워드는 4자 이상이어야 합니다' })
    }
    userModel.updatePassword(id, hashPassword(password))
    res.json({ message: '패스워드 변경 완료' })
  },

  remove(req, res) {
    const id = Number(req.params.id)
    if (req.session.userId === id) {
      return res.status(400).json({ error: '본인 계정은 삭제할 수 없습니다' })
    }
    const { changes } = userModel.remove(id)
    if (changes === 0) return res.status(404).json({ error: '사용자 없음' })
    res.json({ message: '계정 삭제 완료' })
  },
}

export default userController
