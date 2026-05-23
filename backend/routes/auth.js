import { Router } from 'express'
import authController from '../controllers/authController.js'

const router = Router()

router.post('/login',  authController.login)
router.post('/logout', authController.logout)
router.get('/me',      authController.me)

export default router
