import { Router } from 'express'
import userController from '../../controllers/userController.js'

const router = Router()

router.get('/',                 userController.list)
router.post('/',                userController.create)
router.put('/:id/password',    userController.changePassword)  // /:id 보다 먼저
router.put('/:id',             userController.update)
router.delete('/:id',          userController.remove)

export default router
