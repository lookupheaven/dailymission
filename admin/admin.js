const API   = '/api/v1/calling'
const LIMIT = 30

const state = { page: 0, total: 0, search: '', editMode: false, editDt: null }

// ── 초기화 (로그인 확인) ────────────────────────────────────
async function init() {
  const res = await fetch('/api/auth/me')
  if (!res.ok) { window.location.href = '/admin/login.html'; return }
  const me = await res.json()
  document.getElementById('header-user').textContent = `👤 ${me.username}`
  await loadTable()
}

// ── 유틸 ───────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

let toastTimer = null
function toast(msg, type = 'success') {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.className = `toast ${type}`
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3200)
}

// ── 테이블 ─────────────────────────────────────────────────
async function loadTable() {
  const tbody = document.getElementById('table-body')
  tbody.innerHTML = '<tr><td colspan="5" class="empty-row">로딩 중...</td></tr>'

  try {
    if (state.search) {
      const res = await fetch(`${API}/${state.search}`)
      if (res.ok) {
        state.total = 1
        renderRows([await res.json()])
      } else {
        state.total = 0
        tbody.innerHTML = '<tr><td colspan="5" class="empty-row">검색 결과 없음</td></tr>'
      }
      updateFooter(); return
    }

    const offset = state.page * LIMIT
    const res    = await fetch(`${API}/list?limit=${LIMIT}&offset=${offset}`)
    const json   = await res.json()
    state.total  = json.total
    renderRows(json.data)
    updateFooter()
  } catch {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">데이터 로딩 실패</td></tr>'
  }
}

function renderRows(rows) {
  const tbody = document.getElementById('table-body')
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">데이터 없음</td></tr>'
    return
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><span class="dt-badge">${esc(r.dt)}</span></td>
      <td><span class="cell-text" title="${esc(r.title)}">${esc(r.title) || '—'}</span></td>
      <td><span class="cell-text" title="${esc(r.ko_text1)}">${esc(r.ko_text1) || '—'}</span></td>
      <td><span class="cell-text" title="${esc(r.en_text1)}">${esc(r.en_text1) || '—'}</span></td>
      <td>
        <div class="action-group">
          <button class="btn btn-sm btn-secondary" onclick="Admin.openEdit('${r.dt}')">수정</button>
          <button class="btn btn-sm btn-danger"    onclick="Admin.deleteEntry('${r.dt}')">삭제</button>
        </div>
      </td>
    </tr>`).join('')
}

function updateFooter() {
  const totalPages = Math.max(1, Math.ceil(state.total / LIMIT))
  document.getElementById('total-count').textContent = `총 ${state.total}개`
  document.getElementById('page-info').textContent   =
    state.search ? '' : `${state.page + 1} / ${totalPages} 페이지`
  document.getElementById('btn-prev').disabled = state.page === 0
  document.getElementById('btn-next').disabled = state.search || state.page >= totalPages - 1
}

// ── Admin 객체 ──────────────────────────────────────────────
const Admin = {
  prevPage() { if (state.page > 0) { state.page--; loadTable() } },
  nextPage() { state.page++; loadTable() },
  search(val) { state.search = val.trim(); state.page = 0; loadTable() },

  openAdd() {
    state.editMode = false; state.editDt = null
    document.getElementById('modal-title').textContent = '항목 추가'
    document.getElementById('entry-form').reset()
    document.getElementById('f-dt').disabled = false
    document.getElementById('modal').classList.remove('hidden')
    setTimeout(() => document.getElementById('f-dt').focus(), 50)
  },

  async openEdit(dt) {
    try {
      const res = await fetch(`${API}/${dt}`)
      if (!res.ok) throw new Error('데이터 없음')
      const d = await res.json()
      state.editMode = true; state.editDt = dt
      document.getElementById('modal-title').textContent = `수정 — ${dt}`
      document.getElementById('f-dt').value    = d.dt
      document.getElementById('f-dt').disabled = true
      document.getElementById('f-title').value = d.title
      document.getElementById('f-ko1').value   = d.ko_text1
      document.getElementById('f-ko2').value   = d.ko_text2
      document.getElementById('f-en1').value   = d.en_text1
      document.getElementById('f-en2').value   = d.en_text2
      document.getElementById('modal').classList.remove('hidden')
    } catch (err) { toast(err.message, 'error') }
  },

  closeModal() { document.getElementById('modal').classList.add('hidden') },

  async submitForm(e) {
    e.preventDefault()
    const body = {
      dt:       document.getElementById('f-dt').value.trim(),
      title:    document.getElementById('f-title').value,
      ko_text1: document.getElementById('f-ko1').value,
      ko_text2: document.getElementById('f-ko2').value,
      en_text1: document.getElementById('f-en1').value,
      en_text2: document.getElementById('f-en2').value,
    }
    const btn = document.getElementById('submit-btn')
    btn.disabled = true; btn.textContent = '저장 중...'
    try {
      const res = state.editMode
        ? await fetch(`${API}/${state.editDt}`, { method: 'PUT',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch(API,                       { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast(state.editMode ? '수정 완료' : '추가 완료', 'success')
      Admin.closeModal(); loadTable()
    } catch (err) { toast(err.message, 'error') }
    finally { btn.disabled = false; btn.textContent = '저장' }
  },

  async deleteEntry(dt) {
    if (!confirm(`[${dt}] 데이터를 삭제하시겠습니까?`)) return
    try {
      const res  = await fetch(`${API}/${dt}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast('삭제 완료', 'success'); loadTable()
    } catch (err) { toast(err.message, 'error') }
  },

  exportExcel() { window.location.href = `${API}/export`; toast('다운로드 시작', 'info') },

  async importExcel(input) {
    const file = input.files[0]; if (!file) return
    const fd = new FormData(); fd.append('file', file); input.value = ''
    toast('업로드 중...', 'info')
    try {
      const res  = await fetch(`${API}/import`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast(json.message, 'success')
      if (json.errors?.length) console.warn('Import 오류:', json.errors)
      loadTable()
    } catch (err) { toast(err.message, 'error') }
  },

  async logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/admin/login.html'
  },
}

// ── 이벤트 ─────────────────────────────────────────────────
document.addEventListener('keydown', e => { if (e.key === 'Escape') Admin.closeModal() })
document.getElementById('modal').addEventListener('click', e => { if (e.target === e.currentTarget) Admin.closeModal() })

// 헤더 user 스타일
const style = document.createElement('style')
style.textContent = '.header-user { font-size:.85rem; color:#94a3b8; }'
document.head.appendChild(style)

init()
