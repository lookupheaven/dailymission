import userModel from '../models/userModel.js'
import { verifyPassword } from '../utils/password.js'

const authController = {
  login(req, res) {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: '아이디와 패스워드를 입력하세요' })
    }
    const user = userModel.findByUsername(username)
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: '아이디 또는 패스워드가 올바르지 않습니다' })
    }
    req.session.userId   = user.id
    req.session.username = user.username
    req.session.role     = user.role
    res.json({ message: '로그인 성공', username: user.username, role: user.role })
  },

  logout(req, res) {
    req.session.destroy(() => res.json({ message: '로그아웃 완료' }))
  },

  me(req, res) {
    if (!req.session?.userId) return res.status(401).json({ error: '로그인 필요' })
    res.json({ id: req.session.userId, username: req.session.username, role: req.session.role })
  },
}

export default authController
