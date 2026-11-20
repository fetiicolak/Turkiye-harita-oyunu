const state = {
  geo: null,
  provinces: [],
  mode: null,
  startedAt: null,
  elapsed: 0,
  timerId: null,
  completed: new Set(),
  selected: null,
  current: null,
  wrongCount: 0,
  order: [],
  selectedPlate: 1,
  finished: false
};

const screens = [...document.querySelectorAll('.screen')];
const map = document.querySelector('#turkey-map');
const controls = document.querySelector('#dynamic-controls');
const feedback = document.querySelector('#feedback');
const timer = document.querySelector('#timer');
const progress = document.querySelector('#progress');
const plateBoard = document.querySelector('#plate-board');
const soundButton = document.querySelector('#sound-button');
const modeMeta = {
  locate: { number: '01', title: 'Seç & Bil', description: 'Haritada bir ile dokun, ardından seçtiğin ilin adını yaz.', prompt: 'Önce haritadan bir şehir seç' },
  fill: { number: '02', title: "81'i Doldur", description: 'Aklına gelen illeri yaz. Her doğru cevap haritada yeşile dönüşür.', prompt: 'Şehir adını yaz ve haritayı doldur' },
  listen: { number: '03', title: 'Dinle & Bul', description: 'Söylenen ili haritada bul. Üç yanlış seçimden sonra konumu parlayacak.', prompt: 'Söylenen şehri haritada seç' },
  plate: { number: '04', title: 'Plaka Ustası', description: 'Bir plaka kodu seç ve karşılık gelen il adını yaz.', prompt: 'Plaka seç, il adını yaz' }
};

function normalizeName(value = '') {
  return value.trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]/g, '');
}

function showScreen(id) {
  screens.forEach((screen) => screen.classList.toggle('is-active', screen.id === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function startTimer() {
  if (state.startedAt || state.finished) return;
  state.startedAt = Date.now();
  state.timerId = window.setInterval(() => {
    state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
    timer.textContent = formatTime(state.elapsed);
  }, 250);
}

function stopTimer() {
  clearInterval(state.timerId);
  state.timerId = null;
  if (state.startedAt) state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
}

function setFeedback(message, type = '') {
  feedback.textContent = message;
  feedback.className = `feedback ${type}`.trim();
}

function clearMap() {
  map.querySelectorAll('.province').forEach((path) => path.className.baseVal = 'province');
  map.querySelectorAll('.map-label').forEach((label) => label.remove());
}

function provincePath(feature, bounds) {
  const { minX, minY, scale, offsetX, offsetY } = bounds;
  const project = ([lon, lat]) => [offsetX + (lon - minX) * scale, offsetY + (bounds.maxY - lat) * scale];
  const polygonPath = (polygon) => polygon.map((ring) => ring.map((point, index) => {
    const [x, y] = project(point);
    return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ') + ' Z').join(' ');
  return feature.geometry.type === 'MultiPolygon'
    ? feature.geometry.coordinates.map(polygonPath).join(' ')
    : polygonPath(feature.geometry.coordinates);
}

function featureCoordinates(feature) {
  const polygons = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [feature.geometry.coordinates];
  return polygons.flat(2);
}

function buildMap() {
  const all = state.geo.features.flatMap(featureCoordinates);
  const minX = Math.min(...all.map((p) => p[0]));
  const maxX = Math.max(...all.map((p) => p[0]));
  const minY = Math.min(...all.map((p) => p[1]));
  const maxY = Math.max(...all.map((p) => p[1]));
  const scale = Math.min(920 / (maxX - minX), 420 / (maxY - minY));
  const width = (maxX - minX) * scale;
  const height = (maxY - minY) * scale;
  const bounds = { minX, maxX, minY, maxY, scale, offsetX: (1000 - width) / 2, offsetY: (500 - height) / 2 };

  state.provinces = state.geo.features.map((feature) => {
    const coords = featureCoordinates(feature);
    const centroidLon = coords.reduce((sum, p) => sum + p[0], 0) / coords.length;
    const centroidLat = coords.reduce((sum, p) => sum + p[1], 0) / coords.length;
    return {
      feature,
      name: feature.properties.il_adi,
      plate: Number(feature.properties.plaka),
      normalized: normalizeName(feature.properties.il_adi),
      cx: bounds.offsetX + (centroidLon - minX) * scale,
      cy: bounds.offsetY + (maxY - centroidLat) * scale
    };
  }).sort((a, b) => a.plate - b.plate);

  const fragment = document.createDocumentFragment();
  state.provinces.forEach((province) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', provincePath(province.feature, bounds));
    path.setAttribute('class', 'province');
    path.setAttribute('data-plate', province.plate);
    path.setAttribute('tabindex', '0');
    path.setAttribute('role', 'button');
    path.setAttribute('aria-label', 'Haritadaki isimsiz il');
    path.addEventListener('click', () => handleProvinceClick(province));
    path.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleProvinceClick(province); }
    });
    fragment.append(path);
  });
  map.replaceChildren(fragment);
  document.querySelector('#map-loader').remove();
  document.querySelector('#map-shell').setAttribute('aria-busy', 'false');
  document.querySelector('#province-list').innerHTML = state.provinces.map((p) => `<option value="${p.name}"></option>`).join('');
  buildPlateBoard();
}

function pathFor(province) {
  return map.querySelector(`[data-plate="${province.plate}"]`);
}

function markTemporary(province, className) {
  const path = pathFor(province);
  path.classList.add(className);
  window.setTimeout(() => {
    if (!state.completed.has(province.plate)) path.classList.remove(className);
  }, 650);
}

function markComplete(province, withLabel = false) {
  state.completed.add(province.plate);
  const path = pathFor(province);
  path.classList.remove('wrong', 'selected', 'hint');
  path.classList.add('correct');
  path.setAttribute('aria-label', `${province.name}, tamamlandı`);
  if (withLabel) addPlateLabel(province);
  updateProgress();
  if (state.completed.size === 81) finishGame();
}

function addPlateLabel(province) {
  if (map.querySelector(`[data-label="${province.plate}"]`)) return;
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', province.cx);
  text.setAttribute('y', province.cy + 4);
  text.setAttribute('class', 'map-label');
  text.setAttribute('data-label', province.plate);
  text.textContent = province.plate.toString().padStart(2, '0');
  map.append(text);
}

function updateProgress() {
  progress.textContent = `${state.completed.size} / 81`;
}

function handleProvinceClick(province) {
  if (!state.mode || state.finished) return;
  startTimer();
  if (state.mode === 'locate') {
    if (state.completed.has(province.plate)) return setFeedback(`${province.name} zaten doğru bilindi. Başka bir il seç.`, 'success');
    map.querySelectorAll('.province.selected').forEach((el) => el.classList.remove('selected'));
    state.selected = province;
    pathFor(province).classList.add('selected');
    const chip = document.querySelector('#selected-chip');
    chip.innerHTML = 'Seçilen bölge: <strong>?</strong>';
    document.querySelector('#answer-input')?.focus();
    setFeedback('Şimdi seçtiğin ilin adını yaz.');
  } else if (state.mode === 'listen') {
    if (province.plate === state.current.plate) {
      markComplete(province);
      setFeedback(`Doğru! ${province.name} haritada bulundu.`, 'success');
      state.wrongCount = 0;
      window.setTimeout(nextSpokenProvince, 650);
    } else {
      state.wrongCount += 1;
      markTemporary(province, 'wrong');
      if (state.wrongCount >= 3) {
        pathFor(state.current).classList.add('hint');
        setFeedback(`Üç deneme oldu. ${state.current.name} haritada parlıyor!`, 'error');
        window.setTimeout(() => pathFor(state.current)?.classList.remove('hint'), 4000);
      } else setFeedback(`Bu ${province.name}. ${state.current.name} için tekrar dene. (${state.wrongCount}/3)`, 'error');
    }
  }
}

function inputTemplate(label, buttonText = 'Kontrol et') {
  return `<form id="answer-form"><label class="field-label" for="answer-input">${label}</label><div class="answer-row"><input id="answer-input" class="answer-input" list="province-list" autocomplete="off" placeholder="Örn. Burdur"><button class="answer-button">${buttonText}</button></div></form>`;
}

function setupLocate() {
  controls.innerHTML = `<div id="selected-chip" class="selected-chip">Seçilen bölge: <strong>Henüz yok</strong></div>${inputTemplate('ŞEHRİN ADI')}`;
  document.querySelector('#answer-form').addEventListener('submit', (event) => {
    event.preventDefault();
    startTimer();
    const input = document.querySelector('#answer-input');
    if (!state.selected) return setFeedback('Önce haritadan bir il seçmelisin.', 'error');
    if (normalizeName(input.value) === state.selected.normalized) {
      const correct = state.selected;
      markComplete(correct);
      document.querySelector('#selected-chip').innerHTML = `Doğru cevap: <strong>${correct.name}</strong>`;
      setFeedback(`Harika! ${correct.name} doğru. Yeni bir il seç.`, 'success');
      input.value = '';
      state.selected = null;
    } else {
      markTemporary(state.selected, 'wrong');
      setFeedback('Bu isim seçtiğin ille eşleşmiyor. Tekrar deneyebilirsin.', 'error');
      input.select();
    }
  });
}

function setupFill() {
  controls.innerHTML = inputTemplate('ŞEHİR GİRİNİZ', 'Ekle');
  document.querySelector('#answer-form').addEventListener('submit', (event) => {
    event.preventDefault();
    startTimer();
    const input = document.querySelector('#answer-input');
    const province = state.provinces.find((p) => p.normalized === normalizeName(input.value));
    if (!province) {
      setFeedback('Bu isimle bir il bulamadık. Yazımını kontrol et.', 'error');
      input.select();
    } else if (state.completed.has(province.plate)) {
      setFeedback(`${province.name} zaten haritada. Başka bir il yaz.`, 'error');
      input.select();
    } else {
      markComplete(province);
      setFeedback(`${province.name} haritaya eklendi!`, 'success');
      input.value = '';
    }
  });
}

function shuffle(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function speakCurrent() {
  if (!state.current) return;
  if (!('speechSynthesis' in window)) return setFeedback(`Ses özelliği bu tarayıcıda yok. Bulman gereken il: ${state.current.name}`, 'error');
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(state.current.name);
  utterance.lang = 'tr-TR';
  utterance.rate = .88;
  speechSynthesis.speak(utterance);
}

function nextSpokenProvince() {
  state.current = state.order.find((province) => !state.completed.has(province.plate)) || null;
  if (!state.current) return;
  state.wrongCount = 0;
  document.querySelector('#spoken-city').innerHTML = `Sıradaki şehir <strong>${state.current.name}</strong>`;
  speakCurrent();
}

function setupListen() {
  state.order = shuffle(state.provinces);
  controls.innerHTML = `<div id="spoken-city" class="spoken-city">Sıradaki şehir <strong>Hazırlanıyor…</strong></div><p style="color:var(--muted);font-size:.85rem;line-height:1.5">Şehrin adı erişilebilirlik için ekranda da gösterilir. Haritadaki doğru bölgeye dokun.</p>`;
  soundButton.classList.remove('is-hidden');
  nextSpokenProvince();
}

function buildPlateBoard() {
  plateBoard.innerHTML = Array.from({ length: 81 }, (_, index) => `<button class="plate-button" data-plate-button="${index + 1}">${String(index + 1).padStart(2, '0')}</button>`).join('');
  plateBoard.addEventListener('click', (event) => {
    const button = event.target.closest('[data-plate-button]');
    if (!button || state.mode !== 'plate') return;
    state.selectedPlate = Number(button.dataset.plateButton);
    plateBoard.querySelectorAll('.active').forEach((el) => el.classList.remove('active'));
    button.classList.add('active');
    document.querySelector('#plate-chip').innerHTML = `Seçili plaka: <strong>${String(state.selectedPlate).padStart(2, '0')}</strong>`;
    document.querySelector('#answer-input')?.focus();
  });
}

function setupPlate() {
  plateBoard.classList.remove('is-hidden');
  controls.innerHTML = `<div id="plate-chip" class="selected-chip">Seçili plaka: <strong>01</strong></div>${inputTemplate('BU PLAKA HANGİ İLE AİT?')}`;
  plateBoard.querySelector('[data-plate-button="1"]').classList.add('active');
  document.querySelector('#answer-form').addEventListener('submit', (event) => {
    event.preventDefault();
    startTimer();
    const input = document.querySelector('#answer-input');
    const province = state.provinces.find((p) => p.plate === state.selectedPlate);
    if (normalizeName(input.value) === province.normalized) {
      markComplete(province, true);
      plateBoard.querySelector(`[data-plate-button="${province.plate}"]`).classList.add('done');
      setFeedback(`${String(province.plate).padStart(2, '0')} — ${province.name}, doğru!`, 'success');
      input.value = '';
      const next = state.provinces.find((p) => !state.completed.has(p.plate));
      if (next) {
        state.selectedPlate = next.plate;
        plateBoard.querySelectorAll('.active').forEach((el) => el.classList.remove('active'));
        plateBoard.querySelector(`[data-plate-button="${next.plate}"]`).classList.add('active');
        document.querySelector('#plate-chip').innerHTML = `Seçili plaka: <strong>${String(next.plate).padStart(2, '0')}</strong>`;
      }
    } else {
      markTemporary(province, 'wrong');
      setFeedback(`${String(state.selectedPlate).padStart(2, '0')} plakası için bu cevap doğru değil.`, 'error');
      input.select();
    }
  });
}

function resetGame(mode = state.mode) {
  stopTimer();
  Object.assign(state, { mode, startedAt: null, elapsed: 0, timerId: null, completed: new Set(), selected: null, current: null, wrongCount: 0, order: [], selectedPlate: 1, finished: false });
  window.speechSynthesis?.cancel?.();
  clearMap();
  plateBoard.classList.add('is-hidden');
  plateBoard.querySelectorAll('.done,.active').forEach((el) => el.classList.remove('done', 'active'));
  soundButton.classList.add('is-hidden');
  timer.textContent = '00:00';
  updateProgress();
  setFeedback('Hazır olduğunda ilk hamleni yap.');
  document.querySelector('#finish-dialog').hidden = true;
  const meta = modeMeta[mode];
  document.querySelector('#mode-kicker').textContent = `OYUN ${meta.number}`;
  document.querySelector('#game-title').textContent = meta.title;
  document.querySelector('#game-description').textContent = meta.description;
  document.querySelector('#map-prompt').textContent = meta.prompt;
  if (mode === 'locate') setupLocate();
  if (mode === 'fill') setupFill();
  if (mode === 'listen') setupListen();
  if (mode === 'plate') setupPlate();
}

function startGame(mode) {
  showScreen('game-screen');
  resetGame(mode);
}

function finishGame() {
  state.finished = true;
  stopTimer();
  const dialog = document.querySelector('#finish-dialog');
  document.querySelector('#finish-summary').textContent = `${formatTime(state.elapsed)} içinde Türkiye'nin 81 ilini tamamladın.`;
  dialog.hidden = false;
}

document.querySelectorAll('[data-next]').forEach((button) => button.addEventListener('click', () => showScreen(button.dataset.next)));
document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => startGame(button.dataset.mode)));
document.querySelector('#back-button').addEventListener('click', () => { stopTimer(); window.speechSynthesis?.cancel?.(); showScreen('mode-screen'); });
document.querySelector('#restart-button').addEventListener('click', () => resetGame());
document.querySelector('#finish-restart').addEventListener('click', () => resetGame());
document.querySelector('#finish-menu').addEventListener('click', () => showScreen('mode-screen'));
soundButton.addEventListener('click', speakCurrent);

let welcomeKeyEnabled = true;
window.addEventListener('keydown', (event) => {
  if (!welcomeKeyEnabled || !document.querySelector('#welcome-screen').classList.contains('is-active')) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  welcomeKeyEnabled = false;
  showScreen('tribute-screen');
});

fetch('assets/turkiye_iller.geojson')
  .then((response) => {
    if (!response.ok) throw new Error('Harita verisi yüklenemedi.');
    return response.json();
  })
  .then((geo) => { state.geo = geo; buildMap(); })
  .catch((error) => {
    document.querySelector('#map-loader').textContent = error.message;
    console.error(error);
  });
