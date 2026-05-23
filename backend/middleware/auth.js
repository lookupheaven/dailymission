export function requireAuth(req, res, next) {
  if (req.session?.userId) return next()
  res.status(401).json({ error: '로그인이 필요합니다' })
}
