/**
 * डिजिटल सूचना पाटी नियन्त्रक लजिक (UI Controller Engine)
 */

const $ = id => document.getElementById(id);
const np = num => String(num).replace(/\d/g, d => '०१२३४५६७८९'[d]);

let sliderElements = [];
let dotElements = [];
let currentSlideIndex = 0;
let sliderTimer = null;

// १. मुख्य युआई रेन्डर गर्ने पाइपलाइन
function initializeBoard(data) {
  if (!data) return;

  // A. हेडर र लोगो
  if (data.header) {
    if (data.header.title) $('hdr-title').textContent = data.header.title;
    if (data.header.subtitle) $('hdr-sub').innerHTML = data.header.subtitle;
    if (data.header.slogan) $('hdr-slogan').textContent = data.header.slogan;
    if (data.header.logo) {
      const img = document.createElement('img');
      img.src = data.header.logo;
      img.alt = "Palika Logo";
      img.onerror = () => img.remove();
      $('emblem-box').appendChild(img);
    }
  }

  // B. पुछार (Footer)
  if (data.footer) {
    if (data.footer.hours) $('ft-hours').textContent = data.footer.hours;
    if (data.footer.hotline) $('ft-hotline').textContent = data.footer.hotline;
    if (data.footer.email) $('ft-email').textContent = data.footer.email;
  }

  // C. नागरिक बडापत्र सूची
  const charterContainer = $('charter-list');
  charterContainer.innerHTML = (data.charters || []).map((item, idx) => `
    <div class="charter-row">
      <span class="c-no">${np(idx + 1)}</span>
      <span class="c-title">${item.s}</span>
      <span class="c-fee">${item.f}</span>
      <span class="c-time">${item.t}</span>
    </div>
  `).join('');

  startAutoScroll(
    charterContainer,
    data.settings?.charterScrollStep || 65,
    data.settings?.charterScrollDelayMs || 4000
  );

  // D. नवीनतम सूचना
  $('news-container').innerHTML = (data.news || []).slice(0, data.settings?.newsCount || 6).map(n => `
    <div class="news-item ${n.b}">
      <div class="news-header-meta">
        <span class="news-tag">${n.l}</span>
        <time>${n.d}</time>
      </div>
      <p>${n.t}</p>
    </div>
  `).join('');

  // E. कोठा तथा शाखा विवरण (कार्ड स्लाइडर)
  roomsData = data.rooms || [];
  roomsDelayMs = data.settings?.roomsSlideDelayMs || 5000;
  renderRooms();
  window.matchMedia('(max-width: 1100px)').addEventListener('change', renderRooms);
  setupRoomsSwipe();
  let rzT;
  const rerender = () => { clearTimeout(rzT); rzT = setTimeout(renderRooms, 250); };
  window.addEventListener('resize', rerender);
  window.addEventListener('load', renderRooms);

  // F. पदाधिकारी विवरण
  $('officials-list').innerHTML = (data.person || []).map(p => `
    <div class="official-box">
      <div class="official-photo">
        ${p.n ? p.n[0] : '•'}
        <img src="${p.i}" alt="${p.r}" onerror="this.remove()">
      </div>
      <div class="official-info">
        <div class="official-role">${p.r}</div>
        <div class="official-name">${p.n}</div>
        <div class="official-contact">${p.c}</div>
      </div>
    </div>
  `).join('');

  // G. स्लाइडर सेटअप
  setupSlider(data.slides || [], data.settings?.slideDurationSeconds || 8);
}

// २. स्लाइडर नियन्त्रक
function setupSlider(slides, durationSec) {
  const container = $('slides-container');
  const dotsContainer = $('slide-dots');

  container.innerHTML = slides.map(s => `
    <div class="slide-item" style="background: linear-gradient(135deg, ${s.g[0]}, ${s.g[1]})">
      <span class="fallback-icon">${s.e}</span>
      <img src="${s.src}" alt="${s.t}" onerror="this.remove()">
      <div class="slide-caption">
        <h3>${s.t}</h3>
        <p>${s.c}</p>
      </div>
    </div>
  `).join('');

  dotsContainer.innerHTML = slides.map(() => '<i></i>').join('');

  sliderElements = [...document.querySelectorAll('.slide-item')];
  dotElements = [...document.querySelectorAll('#slide-dots i')];

  goToSlide(0, durationSec);
}

function goToSlide(index, durationSec) {
  if (!sliderElements.length) return;
  currentSlideIndex = (index + sliderElements.length) % sliderElements.length;

  sliderElements.forEach((el, i) => el.classList.toggle('active', i === currentSlideIndex));
  dotElements.forEach((el, i) => el.classList.toggle('active', i === currentSlideIndex));

  $('slide-count').textContent = `${np(currentSlideIndex + 1)} / ${np(sliderElements.length)}`;

  clearInterval(sliderTimer);
  sliderTimer = setInterval(() => {
    goToSlide(currentSlideIndex + 1, durationSec);
  }, durationSec * 1000);
}

// कोठा कार्ड स्लाइडर
let roomsData = [];
let roomsDelayMs = 5000;
let roomsPage = 0;
let roomsPages = 1;
let roomsTimer = null;

function renderRooms() {
  const track = $('rooms-container');
  const dots = $('rooms-dots');
  const compact = window.matchMedia('(max-width: 1100px)').matches;
  let perPage = 4;
  if (!compact) {
    // पाटीको उचाइ अनुसार कति पङ्क्ति अटाउँछ भनेर आफैँ हिसाब गर्ने (२ कार्ड प्रति पङ्क्ति)
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const rows = Math.max(1, Math.floor((track.clientHeight - 1.0 * rem + 0.5 * rem) / (3.8 * rem + 0.5 * rem)));
    perPage = rows * 2;
  }

  const pages = [];
  for (let i = 0; i < roomsData.length; i += perPage) pages.push(roomsData.slice(i, i + perPage));
  roomsPages = pages.length || 1;
  roomsPage = 0;

  track.innerHTML = '<div class="rooms-track" id="rooms-track">' + pages.map(pg => `
    <div class="rooms-page">${pg.map(r => `
      <div class="room-card">
        <span class="r-no">${r.no}</span>
        <div class="r-body">
          <span class="r-name">${r.name}</span>
          <span class="r-floor">${r.floor} तल्ला</span>
        </div>
      </div>`).join('')}
    </div>`).join('') + '</div>';

  dots.innerHTML = pages.length > 1 ? pages.map(() => '<i></i>').join('') : '';
  [...dots.children].forEach((d, i) => d.addEventListener('click', () => goToRoomsPage(i)));
  goToRoomsPage(0);
}

function goToRoomsPage(i) {
  roomsPage = (i + roomsPages) % roomsPages;
  const t = $('rooms-track');
  if (t) t.style.transform = `translateX(-${roomsPage * 100}%)`;
  [...$('rooms-dots').children].forEach((d, k) => d.classList.toggle('active', k === roomsPage));

  clearInterval(roomsTimer);
  if (roomsPages > 1) roomsTimer = setInterval(() => goToRoomsPage(roomsPage + 1), roomsDelayMs);
}

function setupRoomsSwipe() {
  let x0 = null;
  const el = $('rooms-container');
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) goToRoomsPage(roomsPage + (dx < 0 ? 1 : -1));
    x0 = null;
  });
}

// ३. स्मूथ अटो-स्क्रोलर (टेबुल लुप)
// मोबाइल/ट्याब्लेटमा सूची पूरै देखिन्छ (भित्री स्क्रोल हुँदैन), त्यसैले त्यहाँ केही हुँदैन
function startAutoScroll(element, stepPx, intervalMs) {
  setInterval(() => {
    if (element.scrollHeight > element.clientHeight + 2) {
      if (element.scrollTop + element.clientHeight >= element.scrollHeight - 6) {
        element.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        element.scrollBy({ top: stepPx, behavior: 'smooth' });
      }
    }
  }, intervalMs);
}

// ४. नेपाली पात्रो (Bikram Sambat) र प्रत्यक्ष घडी
const bsDaysInMonth = {
  2080: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2081: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2083: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 29, 31],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 29, 31],
  2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30]
};

const nepMonths = ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कार्तिक", "मंसिर", "पौष", "माघ", "फागुन", "चैत"];
const nepDays = ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार"];

function getNepaliDate(adDate) {
  const baseAD = new Date(Date.UTC(2023, 3, 14)); // २०८० बैशाख १ गते = 14 April 2023
  const targetAD = new Date(Date.UTC(adDate.getFullYear(), adDate.getMonth(), adDate.getDate()));
  let diffDays = Math.round((targetAD - baseAD) / 86400000);

  let bsYear = 2080, bsMonth = 0, bsDay = 1;
  while (diffDays > 0) {
    const monthLength = (bsDaysInMonth[bsYear] || bsDaysInMonth[2083])[bsMonth];
    if (diffDays >= monthLength) {
      diffDays -= monthLength;
      bsMonth++;
      if (bsMonth > 11) {
        bsMonth = 0;
        bsYear++;
      }
    } else {
      bsDay += diffDays;
      diffDays = 0;
    }
  }

  return {
    year: bsYear,
    month: nepMonths[bsMonth],
    day: bsDay,
    dayName: nepDays[adDate.getDay()]
  };
}

// घडीको HTML एक पटक मात्र बनाउने, त्यसपछि अङ्क मात्र बदल्ने
let clkRefs = null;
function buildClock() {
  $('clk').innerHTML = `
    <span class="clk-unit" data-k="h">--</span><span class="clk-colon">:</span>
    <span class="clk-unit" data-k="m">--</span><span class="clk-colon">:</span>
    <span class="clk-unit clk-sec" data-k="s">--</span>
    <span class="clk-ampm" data-k="ap"></span>`.replace(/\n\s*/g, '');
  clkRefs = {};
  $('clk').querySelectorAll('[data-k]').forEach(el => clkRefs[el.dataset.k] = el);
}

function updateClock() {
  if (!clkRefs) buildClock();
  const now = new Date();

  const timeStr = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kathmandu',
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const [rawTime, ampm] = timeStr.split(' ');
  const [h, m, s] = rawTime.split(':');
  clkRefs.h.textContent = np(h);
  clkRefs.m.textContent = np(m);
  clkRefs.s.textContent = np(s);
  clkRefs.ap.textContent = ampm === 'PM' ? 'अपराह्न' : 'पूर्वाह्न';

  const bs = getNepaliDate(now);
  $('dt').textContent = `${bs.dayName}, ${np(bs.day)} ${bs.month} ${np(bs.year)}`;
}

// घडी सुरु गर्ने
updateClock();
setInterval(updateClock, 1000);

// ५. फुलस्क्रिन र किबोर्ड सर्टकट
const fsBtn = $('fs-btn');
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
    fsBtn.textContent = '⛶ बन्द गर्ने';
  } else {
    document.exitFullscreen().catch(() => {});
    fsBtn.textContent = '⛶ पूर्ण स्क्रिन';
  }
}
fsBtn.addEventListener('click', toggleFullscreen);

window.addEventListener('keydown', e => {
  if (e.code === 'KeyF') toggleFullscreen();
  if (e.code === 'ArrowRight') goToSlide(currentSlideIndex + 1, D.settings?.slideDurationSeconds || 8);
  if (e.code === 'ArrowLeft') goToSlide(currentSlideIndex - 1, D.settings?.slideDurationSeconds || 8);
});

// ६. एप्लिकेसन लोड सुरु
document.addEventListener('DOMContentLoaded', () => {
  if (typeof D !== 'undefined') {
    initializeBoard(D);
  } else {
    console.error("data.js फाइल फेला परेन वा लोड हुन सकेन।");
  }
});

// Helper to extract the full first letter/grapheme cluster for Devanagari
function getFirstGrapheme(str) {
  if (!str) return '•';
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('ne', { granularity: 'grapheme' });
    const iterator = segmenter.segment(str)[Symbol.iterator]();
    return iterator.next().value?.segment || str[0];
  }
  return Array.from(str)[0]; // fallback
}

// In initializeBoard():
// F. पदाधिकारी विवरण
$('officials-list').innerHTML = (data.person || []).map(p => `
  <div class="official-box">
    <div class="official-photo">
      ${getFirstGrapheme(p.n)}
      <img src="${p.i}" alt="${p.r}" onerror="this.remove()">
    </div>
    <div class="official-info">
      <div class="official-role">${p.r}</div>
      <div class="official-name">${p.n}</div>
      <div class="official-contact">${p.c}</div>
    </div>
  </div>
`).join('');
