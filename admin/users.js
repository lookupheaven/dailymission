const API = '/api/v1/users'
let currentUserId = null
let pwTargetId    = null

// ── 초기화 ─────────────────────────────────────────────────
async function init() {
  const res = await fetch('/api/auth/me')
  if (!res.ok) { window.location.href = '/admin/login.html'; return }
  const me = await res.json()
  currentUserId = me.id
  document.getElementById('header-user').textContent = `👤 ${me.username}`
  await loadTable()
}

// ── 테이블 ─────────────────────────────────────────────────
async function loadTable() {
  const tbody = document.getElementById('table-body')
  tbody.innerHTML = '<tr><td colspan="5" class="empty-row">로딩 중...</td></tr>'
  const res  = await fetch(API)
  const rows = await res.json()
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">사용자 없음</td></tr>'
    return
  }
  tbody.innerHTML = rows.map(u => `
    <tr>
      <td style="color:#94a3b8;font-size:.8rem">${u.id}</td>
      <td>
        <strong>${esc(u.username)}</strong>
        ${u.id === currentUserId ? ' <span class="me-badge">나</span>' : ''}
      </td>
      <td><span class="role-badge">${esc(u.role)}</span></td>
      <td style="font-size:.8rem;color:#64748b">${esc(u.created_at)}</td>
      <td>
        <div class="action-group">
          <button class="btn btn-sm btn-secondary" onclick="Users.openEdit(${u.id},'${esc(u.username)}','${esc(u.role)}')">수정</button>
          <button class="btn btn-sm btn-secondary" onclick="Users.openPw(${u.id},'${esc(u.username)}')">패스워드</button>
          <button class="btn btn-sm btn-danger" onclick="Users.remove(${u.id})"
            ${u.id === currentUserId ? 'disabled title="본인 계정"' : ''}>삭제</button>
        </div>
      </td>
    </tr>`).join('')
}

// ── Users 객체 ──────────────────────────────────────────────
const Users = {
  editId: null,

  openAdd() {
    Users.editId = null
    document.getElementById('modal-title').textContent = '계정 추가'
    document.getElementById('f-username').value  = ''
    document.getElementById('f-username').disabled = false
    document.getElementById('f-password').value  = ''
    document.getElementById('f-password').required = true
    document.getElementById('f-password-confirm').value = ''
    document.getElementById('pw-label').innerHTML = '패스워드 <span class="required">*</span>'
    document.getElementById('modal').classList.remove('hidden')
    setTimeout(() => document.getElementById('f-username').focus(), 50)
  },

  openEdit(id, username, role) {
    Users.editId = id
    document.getElementById('modal-title').textContent = `계정 수정 — ${username}`
    document.getElementById('f-username').value    = username
    document.getElementById('f-username').disabled = false
    document.getElementById('f-role').value        = role
    document.getElementById('f-password').value    = ''
    document.getElementById('f-password').required = false
    document.getElementById('f-password-confirm').value = ''
    document.getElementById('pw-label').innerHTML = '새 패스워드 <span class="hint">(변경 시에만 입력)</span>'
    document.getElementById('modal').classList.remove('hidden')
  },

  closeModal() {
    document.getElementById('modal').classList.add('hidden')
  },

  async submitForm(e) {
    e.preventDefault()
    const username  = document.getElementById('f-username').value.trim()
    const role      = document.getElementById('f-role').value
    const password  = document.getElementById('f-password').value
    const confirm   = document.getElementById('f-password-confirm').value

    if (!Users.editId && !password) { toast('패스워드를 입력하세요', 'error'); return }
    if (password && password !== confirm) { toast('패스워드가 일치하지 않습니다', 'error'); return }

    const btn = document.getElementById('submit-btn')
    btn.disabled = true

    try {
      let res
      if (Users.editId) {
        // 정보 수정
        res = await fetch(`${API}/${Users.editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, role }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        // 패스워드도 변경 요청
        if (password) {
          const pr = await fetch(`${API}/${Users.editId}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
          })
          const pj = await pr.json()
          if (!pr.ok) throw new Error(pj.error)
        }
        toast('수정 완료', 'success')
      } else {
        res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, role }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        toast('계정 추가 완료', 'success')
      }
      Users.closeModal()
      loadTable()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      btn.disabled = false
    }
  },

  openPw(id, username) {
    pwTargetId = id
    document.getElementById('pw-modal-title').textContent = `패스워드 변경 — ${username}`
    document.getElementById('pw-new').value     = ''
    document.getElementById('pw-confirm').value = ''
    document.getElementById('pw-modal').classList.remove('hidden')
    setTimeout(() => document.getElementById('pw-new').focus(), 50)
  },

  closePwModal() {
    document.getElementById('pw-modal').classList.add('hidden')
  },

  async submitPwForm(e) {
    e.preventDefault()
    const pw  = document.getElementById('pw-new').value
    const pw2 = document.getElementById('pw-confirm').value
    if (pw !== pw2) { toast('패스워드가 일치하지 않습니다', 'error'); return }
    try {
      const res  = await fetch(`${API}/${pwTargetId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast('패스워드 변경 완료', 'success')
      Users.closePwModal()
    } catch (err) {
      toast(err.message, 'error')
    }
  },

  async remove(id) {
    if (!confirm('이 계정을 삭제하시겠습니까?')) return
    try {
      const res  = await fetch(`${API}/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast('삭제 완료', 'success')
      loadTable()
    } catch (err) {
      toast(err.message, 'error')
    }
  },

  async logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/admin/login.html'
  },
}

// ── 유틸 ───────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

let toastTimer = null
function toast(msg, type = 'success') {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.className = `toast ${type}`
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3200)
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { Users.closeModal(); Users.closePwModal() }
})

// 추가 스타일 (인라인)
const style = document.createElement('style')
style.textContent = `
  .header-left { display:flex; align-items:center; gap:16px; }
  .back-link { color:#94a3b8; text-decoration:none; font-size:.85rem; }
  .back-link:hover { color:#fff; }
  .header-user { font-size:.85rem; color:#94a3b8; }
  .me-badge { background:#dbeafe; color:#1e40af; font-size:.72rem; padding:1px 6px; border-radius:10px; font-weight:600; }
  .role-badge { background:#f0fdf4; color:#166534; font-size:.78rem; padding:2px 8px; border-radius:4px; font-weight:600; }
  select { width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:.85rem; background:#fafafa; }
`
document.head.appendChild(style)

init()
