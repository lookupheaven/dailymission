import XLSX from 'xlsx'
import callingModel from '../models/callingModel.js'

function todayDt() {
  const now = new Date()
  return String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
}

function validDate(dt) {
  return /^\d{4}$/.test(dt)
}

const callingController = {
  // ── 조회 ──────────────────────────────────────────────
  getToday(req, res) {
    const dt = todayDt()
    const data = callingModel.findByDate(dt)
    if (!data) return res.status(404).json({ error: `No data for today (${dt})` })
    res.json(data)
  },

  getByDate(req, res) {
    const { date } = req.params
    if (!validDate(date)) return res.status(400).json({ error: 'MMDD 형식으로 입력하세요 (예: 0523)' })
    const data = callingModel.findByDate(date)
    if (!data) return res.status(404).json({ error: `${date} 데이터 없음` })
    res.json(data)
  },

  getList(req, res) {
    const limit  = Math.min(Number(req.query.limit)  || 20, 100)
    const offset = Number(req.query.offset) || 0
    const data   = callingModel.findAll({ limit, offset })
    const { total } = callingModel.count()
    res.json({ total, limit, offset, data })
  },

  // ── 추가 ──────────────────────────────────────────────
  create(req, res) {
    const { dt, title, ko_text1, ko_text2, en_text1, en_text2 } = req.body
    if (!validDate(dt)) return res.status(400).json({ error: 'MMDD 형식으로 입력하세요 (예: 0523)' })
    if (callingModel.findByDate(dt)) return res.status(409).json({ error: `${dt} 이미 존재합니다` })
    callingModel.create({ dt, title, ko_text1, ko_text2, en_text1, en_text2 })
    res.status(201).json({ message: '추가 완료', dt })
  },

  // ── 수정 ──────────────────────────────────────────────
  update(req, res) {
    const { date } = req.params
    if (!validDate(date)) return res.status(400).json({ error: 'MMDD 형식으로 입력하세요' })
    if (!callingModel.findByDate(date)) return res.status(404).json({ error: `${date} 데이터 없음` })
    const { title, ko_text1, ko_text2, en_text1, en_text2 } = req.body
    callingModel.update(date, { title, ko_text1, ko_text2, en_text1, en_text2 })
    res.json({ message: '수정 완료', dt: date })
  },

  // ── 삭제 ──────────────────────────────────────────────
  remove(req, res) {
    const { date } = req.params
    if (!validDate(date)) return res.status(400).json({ error: 'MMDD 형식으로 입력하세요' })
    const result = callingModel.remove(date)
    if (result.changes === 0) return res.status(404).json({ error: `${date} 데이터 없음` })
    res.json({ message: '삭제 완료', dt: date })
  },

  // ── 엑셀 내보내기 ───────────────────────────────────────
  exportExcel(req, res) {
    const rows = callingModel.findAllNoLimit()
    const sheet = rows.map(r => ({
      '날짜(MMDD)': r.dt,
      '제목':       r.title,
      '한글본문1':  r.ko_text1,
      '한글본문2':  r.ko_text2,
      '영어본문1':  r.en_text1,
      '영어본문2':  r.en_text2,
    }))
    const ws = XLSX.utils.json_to_sheet(sheet)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Calling')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    res.setHeader('Content-Disposition', 'attachment; filename="calling_data.xlsx"')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(buf)
  },

  // ── 엑셀 가져오기 ───────────────────────────────────────
  importExcel(req, res) {
    if (!req.file) return res.status(400).json({ error: '파일이 없습니다' })
    const wb   = XLSX.read(req.file.buffer, { type: 'buffer' })
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

    let count = 0
    const errors = []
    for (const row of rows) {
      const dt = String(row['날짜(MMDD)'] ?? '').trim().padStart(4, '0')
      if (!validDate(dt)) { errors.push(`잘못된 날짜: ${row['날짜(MMDD)']}`); continue }
      callingModel.upsert({
        dt,
        title:    String(row['제목']      ?? ''),
        ko_text1: String(row['한글본문1'] ?? ''),
        ko_text2: String(row['한글본문2'] ?? ''),
        en_text1: String(row['영어본문1'] ?? ''),
        en_text2: String(row['영어본문2'] ?? ''),
      })
      count++
    }
    res.json({ message: `${count}개 처리 완료`, errors })
  },
}

export default callingController
