const API_BASE = 'http://localhost:3000/api/v1'

const week = ['주일', '월', '화', '수', '목', '금', '토']
const params = new URLSearchParams(location.search)
const cdate = params.get('cdate')

const today = new Date()
const day = today.getDay()

const dt = cdate ?? (
  String(today.getMonth() + 1).padStart(2, '0') +
  String(today.getDate()).padStart(2, '0')
)

const s_mm = dt.substring(0, 2).replace(/^0+/, '')
const s_dd = dt.substring(2, 4).replace(/^0+/, '')
const dtstring = `${s_mm} 월 ${s_dd} 일 &nbsp;${week[day]}`

const greentitleEl = document.querySelector('.green-title')
const boxEls = document.querySelectorAll('.message-box')

async function fetchAndRender() {
  const url = cdate
    ? `${API_BASE}/calling/${dt}`
    : `${API_BASE}/calling/today`

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    greentitleEl.innerHTML = data.title
    boxEls[0].innerHTML = data.ko_text1 + '<br><br>' + data.ko_text2
    boxEls[1].innerHTML = data.en_text1 + '<br><br>' + data.en_text2
  } catch (err) {
    greentitleEl.innerHTML = dtstring
    boxEls[0].innerHTML = '데이터를 불러올 수 없습니다.'
    console.error(err)
  }
}

fetchAndRender()
