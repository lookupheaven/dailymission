import { Router } from 'express'
import multer from 'multer'
import callingController from '../../controllers/callingController.js'
import { requireAuth } from '../../middleware/auth.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// 공개 (메인 사이트에서 사용)
router.get('/today',  callingController.getToday)
router.get('/list',   callingController.getList)
router.get('/:date',  callingController.getByDate)

// 관리자 전용
router.get('/export',                               requireAuth, callingController.exportExcel)
router.post('/import', upload.single('file'),       requireAuth, callingController.importExcel)
router.post('/',                                    requireAuth, callingController.create)
router.put('/:date',                                requireAuth, callingController.update)
router.delete('/:date',                             requireAuth, callingController.remove)

export default router
