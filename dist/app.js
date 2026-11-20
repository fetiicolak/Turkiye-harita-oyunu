const state = {
  geo: null,
  provinces: [],
  mode: null,
  startedAt: null,
  elapsed: 0,
  timerId: null,
  timerEnabled: true,
  timerPaused: false,
  completed: new Set(),
  selected: null,
  current: null,
  wrongCount: 0,
  order: [],
  selectedPlate: 1,
  gameStarted: false,
  partialFinish: false,
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
const timerPauseButton = document.querySelector('#timer-pause');
const timerDisableButton = document.querySelector('#timer-disable');
const startGameButton = document.querySelector('#start-game-button');
const installButton = document.querySelector('#install-app');
const installGuide = document.querySelector('#install-guide');
const installGuideText = document.querySelector('#install-guide-text');
let deferredInstallPrompt = null;
let exitTimerWasRunning = false;
const modeMeta = {
  locate: { number: '01', title: 'Seç & Bil', description: 'Haritada bir ile dokun, ardından seçtiğin ilin adını yaz.', prompt: 'Önce haritadan bir şehir seç' },
  fill: { number: '02', title: "81'i Doldur", description: 'Aklına gelen illeri yaz. Her doğru cevap haritada yeşile dönüşür.', prompt: 'Şehir adını yaz ve haritayı doldur' },
  listen: { number: '03', title: 'Dinle & Bul', description: 'Söylenen ili haritada bul. Üç yanlış seçimden sonra konumu parlayacak.', prompt: 'Söylenen şehri haritada seç' },
  plate: { number: '04', title: 'Plaka Ustası', description: 'Bir plaka kodu seç ve karşılık gelen il adını yaz.', prompt: 'Plaka seç, il adını yaz' }
};
const screenHashes = {
  'welcome-screen': '#anasayfa',
  'tribute-screen': '#ataturk',
  'mode-screen': '#oyunlar',
  'game-screen': '#oyun'
};
const hashScreens = Object.fromEntries(Object.entries(screenHashes).map(([screen, hash]) => [hash, screen]));
const provinceAliases = {
  afyon: 'afyonkarahisar',
  urfa: 'sanliurfa',
  antep: 'gaziantep',
  maras: 'kahramanmaras',
  kmaras: 'kahramanmaras',
  icel: 'mersin',
  izmit: 'kocaeli',
  adapazari: 'sakarya'
};

function normalizeName(value = '') {
  return value.trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]/g, '');
}

function provinceMatches(province, value) {
  const answer = normalizeName(value);
  return province.normalized === answer || province.normalized === provinceAliases[answer];
}

function showScreen(id, { historyAction = 'push' } = {}) {
  const activeScreen = document.querySelector('.screen.is-active');
  if (activeScreen?.id === 'game-screen' && id !== 'game-screen') {
    stopTimer();
    window.speechSynthesis?.cancel?.();
  }
  screens.forEach((screen) => screen.classList.toggle('is-active', screen.id === id));
  if (id === 'game-screen' && state.mode && state.gameStarted && !state.finished) startTimer();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (historyAction !== 'none') {
    const currentDepth = Number(window.history.state?.appDepth ?? 0);
    const nextDepth = historyAction === 'replace' ? currentDepth : currentDepth + 1;
    const method = historyAction === 'replace' ? 'replaceState' : 'pushState';
    window.history[method]({ screen: id, appDepth: nextDepth }, '', screenHashes[id]);
  }
}

function navigateBack(fallbackScreen) {
  if (Number(window.history.state?.appDepth ?? 0) > 0) window.history.back();
  else showScreen(fallbackScreen, { historyAction: 'replace' });
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function currentElapsed() {
  const runningSeconds = state.startedAt ? Math.floor((Date.now() - state.startedAt) / 1000) : 0;
  return state.elapsed + runningSeconds;
}

function renderTimer() {
  timer.textContent = state.timerEnabled ? formatTime(currentElapsed()) : '--:--';
}

function startTimer() {
  if (!state.gameStarted || !state.timerEnabled || state.timerPaused || state.timerId || state.finished) return;
  state.startedAt = Date.now();
  state.timerId = window.setInterval(renderTimer, 250);
  renderTimer();
}

function stopTimer() {
  if (state.startedAt) state.elapsed += Math.floor((Date.now() - state.startedAt) / 1000);
  window.clearInterval(state.timerId);
  state.timerId = null;
  state.startedAt = null;
  renderTimer();
}

function syncTimerControls() {
  timerPauseButton.textContent = state.timerPaused ? 'Devam et' : 'Durdur';
  timerPauseButton.setAttribute('aria-label', state.timerPaused ? 'Süreyi devam ettir' : 'Süreyi durdur');
  timerPauseButton.disabled = !state.timerEnabled || !state.gameStarted;
  timerDisableButton.textContent = state.timerEnabled ? 'Kapat' : 'Aç';
  timerDisableButton.setAttribute('aria-label', state.timerEnabled ? 'Süreyi kapat' : 'Süreyi aç');
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
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = province.name;
    path.append(title);
    path.addEventListener('click', () => handleProvinceClick(province));
    path.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleProvinceClick(province); }
    });
    fragment.append(path);
  });
  map.replaceChildren(fragment);
  const tributeMap = document.querySelector('#tribute-map');
  const tributeFragment = document.createDocumentFragment();
  state.provinces.forEach((province) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', provincePath(province.feature, bounds));
    path.setAttribute('class', 'province');
    tributeFragment.append(path);
  });
  tributeMap.replaceChildren(tributeFragment);
  document.querySelector('#map-loader')?.remove();
  document.querySelector('#map-shell').setAttribute('aria-busy', 'false');
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
  if (!state.mode || !state.gameStarted || state.finished) return;
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
  return `<form id="answer-form"><label class="field-label" for="answer-input">${label}</label><div class="answer-row"><input id="answer-input" class="answer-input" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Örn. Burdur"><button class="answer-button">${buttonText}</button></div></form>`;
}

function setupLocate() {
  controls.innerHTML = `<div id="selected-chip" class="selected-chip">Seçilen bölge: <strong>Henüz yok</strong></div>${inputTemplate('ŞEHRİN ADI')}`;
  document.querySelector('#answer-form').addEventListener('submit', (event) => {
    event.preventDefault();
    startTimer();
    const input = document.querySelector('#answer-input');
    if (!state.selected) return setFeedback('Önce haritadan bir il seçmelisin.', 'error');
    if (provinceMatches(state.selected, input.value)) {
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
    const province = state.provinces.find((p) => provinceMatches(p, input.value));
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
}

function buildPlateBoard() {
  plateBoard.innerHTML = Array.from({ length: 81 }, (_, index) => `<button class="plate-button" data-plate-button="${index + 1}">${String(index + 1).padStart(2, '0')}</button>`).join('');
  plateBoard.addEventListener('click', (event) => {
    const button = event.target.closest('[data-plate-button]');
    if (!button || state.mode !== 'plate' || !state.gameStarted) return;
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
    if (provinceMatches(province, input.value)) {
      markComplete(province, true);
      plateBoard.querySelector(`[data-plate-button="${province.plate}"]`).classList.add('done');
      setFeedback(`${String(province.plate).padStart(2, '0')} — ${province.name}, doğru!`, 'success');
      input.value = '';
      const next = state.provinces.find((p) => p.plate > province.plate && !state.completed.has(p.plate))
        || state.provinces.find((p) => !state.completed.has(p.plate));
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
  Object.assign(state, { mode, startedAt: null, elapsed: 0, timerId: null, timerEnabled: true, timerPaused: false, completed: new Set(), selected: null, current: null, wrongCount: 0, order: [], selectedPlate: 1, gameStarted: false, partialFinish: false, finished: false });
  window.speechSynthesis?.cancel?.();
  clearMap();
  plateBoard.classList.add('is-hidden');
  plateBoard.querySelectorAll('.done,.active').forEach((el) => el.classList.remove('done', 'active'));
  soundButton.classList.add('is-hidden');
  timer.textContent = '00:00';
  syncTimerControls();
  updateProgress();
  setFeedback('Hazır olduğunda Başla düğmesine bas.');
  document.querySelector('#finish-dialog').hidden = true;
  document.querySelector('#exit-dialog').hidden = true;
  document.querySelector('#save-time-prompt').hidden = false;
  document.querySelector('#save-time-status').textContent = '';
  document.querySelectorAll('#save-time-prompt button').forEach((button) => { button.disabled = false; });
  const meta = modeMeta[mode];
  document.querySelector('#mode-kicker').textContent = `OYUN ${meta.number}`;
  document.querySelector('#game-title').textContent = meta.title;
  document.querySelector('#game-description').textContent = meta.description;
  document.querySelector('#map-prompt').textContent = meta.prompt;
  if (mode === 'locate') setupLocate();
  if (mode === 'fill') setupFill();
  if (mode === 'listen') setupListen();
  if (mode === 'plate') setupPlate();
  controls.setAttribute('inert', '');
  startGameButton.hidden = false;
  startGameButton.focus();
}

function beginGame() {
  if (!state.mode || state.gameStarted || state.finished) return;
  state.gameStarted = true;
  controls.removeAttribute('inert');
  startGameButton.hidden = true;
  syncTimerControls();
  setFeedback('Süre başladı. Başarılar!');
  startTimer();
  if (state.mode === 'listen') nextSpokenProvince();
  else document.querySelector('#answer-input')?.focus();
}

async function startGame(mode) {
  showScreen('game-screen');
  if (!state.geo) {
    document.querySelector('#game-title').textContent = 'Harita hazırlanıyor';
    setFeedback('81 ilin harita verisi yükleniyor…');
    try {
      await mapReadyPromise;
    } catch {
      setFeedback('Harita yüklenemedi. Bağlantını kontrol edip sayfayı yenile.', 'error');
      return;
    }
  }
  resetGame(mode);
}

function finishGame({ partial = false } = {}) {
  state.finished = true;
  state.partialFinish = partial;
  stopTimer();
  window.speechSynthesis?.cancel?.();
  const dialog = document.querySelector('#finish-dialog');
  const missing = state.provinces.filter((province) => !state.completed.has(province.plate));
  document.querySelector('#finish-kicker').textContent = partial ? 'OYUN TAMAMLANDI' : 'TÜRKİYE TAMAM!';
  document.querySelector('#finish-title').textContent = partial ? `${state.completed.size} il tamamlandı.` : '81 ilin hepsi sende.';
  document.querySelector('#finish-summary').textContent = state.timerEnabled
    ? `${formatTime(state.elapsed)} sürede ${state.completed.size} / 81 il tamamladın.`
    : `${state.completed.size} / 81 il tamamladın.`;
  const missingDetails = document.querySelector('#finish-missing');
  missingDetails.hidden = missing.length === 0;
  missingDetails.querySelector('summary').textContent = `Eksik illeri göster (${missing.length})`;
  document.querySelector('#finish-missing-list').textContent = missing.map((province) => province.name).join(', ');
  document.querySelector('#save-time-question').textContent = partial ? 'İlerlemenizi ve sürenizi kaydetmek ister misiniz?' : 'Sürenizi kaydetmek ister misiniz?';
  document.querySelector('#save-time-prompt').hidden = !state.timerEnabled && !partial;
  dialog.hidden = false;
}

function openExitDialog() {
  exitTimerWasRunning = Boolean(state.timerId);
  if (exitTimerWasRunning) stopTimer();
  document.querySelector('#exit-dialog').hidden = false;
}

function closeExitDialog({ resume = true } = {}) {
  document.querySelector('#exit-dialog').hidden = true;
  if (resume && exitTimerWasRunning) startTimer();
  exitTimerWasRunning = false;
}

function answerSaveTime(shouldSave) {
  const status = document.querySelector('#save-time-status');
  if (shouldSave) {
    try {
      const records = JSON.parse(localStorage.getItem('turkiye-harita-sureleri') || '[]');
      const missing = state.provinces.filter((province) => !state.completed.has(province.plate)).map((province) => province.name);
      records.push({ mode: state.mode, seconds: state.elapsed, completed: state.completed.size, missing, partial: state.partialFinish, savedAt: new Date().toISOString() });
      localStorage.setItem('turkiye-harita-sureleri', JSON.stringify(records.slice(-50)));
      status.textContent = state.partialFinish ? 'İlerlemeniz ve süreniz bu cihazda kaydedildi.' : 'Süreniz bu cihazda kaydedildi.';
    } catch {
      status.textContent = 'Süre kaydedilemedi. Tarayıcı depolamasını kontrol edin.';
    }
  } else status.textContent = 'Süreniz kaydedilmedi.';
  document.querySelectorAll('#save-time-prompt button').forEach((button) => { button.disabled = true; });
}

document.querySelectorAll('[data-next]').forEach((button) => button.addEventListener('click', () => showScreen(button.dataset.next)));
document.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => navigateBack(button.dataset.back)));
document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => startGame(button.dataset.mode)));
document.querySelector('#exit-button').addEventListener('click', openExitDialog);
document.querySelector('#exit-cancel').addEventListener('click', () => closeExitDialog());
document.querySelector('#exit-direct').addEventListener('click', () => {
  closeExitDialog({ resume: false });
  navigateBack('mode-screen');
});
document.querySelector('#exit-finish').addEventListener('click', () => {
  closeExitDialog({ resume: false });
  finishGame({ partial: true });
});
document.querySelector('#restart-button').addEventListener('click', () => resetGame());
document.querySelector('#finish-restart').addEventListener('click', () => resetGame());
document.querySelector('#finish-menu').addEventListener('click', () => navigateBack('mode-screen'));
startGameButton.addEventListener('click', beginGame);
document.querySelector('#save-time-yes').addEventListener('click', () => answerSaveTime(true));
document.querySelector('#save-time-no').addEventListener('click', () => answerSaveTime(false));
soundButton.addEventListener('click', speakCurrent);
timerPauseButton.addEventListener('click', () => {
  if (!state.timerEnabled || state.finished) return;
  if (state.timerPaused) {
    state.timerPaused = false;
    startTimer();
  } else {
    stopTimer();
    state.timerPaused = true;
  }
  syncTimerControls();
});
timerDisableButton.addEventListener('click', () => {
  if (state.finished) return;
  if (state.timerEnabled) {
    stopTimer();
    state.timerEnabled = false;
    state.timerPaused = false;
  } else {
    state.timerEnabled = true;
    state.timerPaused = false;
    if (state.gameStarted) startTimer();
  }
  renderTimer();
  syncTimerControls();
});

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function refreshInstallButton() {
  installButton.hidden = isStandalone();
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  refreshInstallButton();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  installButton.hidden = true;
  installGuide.hidden = true;
});

installButton.addEventListener('click', async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    refreshInstallButton();
    return;
  }
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  installGuideText.textContent = isIOS
    ? 'Safari’de Paylaş düğmesine dokun, aşağı kaydır ve ardından “Ana Ekrana Ekle” seçeneğini seç.'
    : 'Tarayıcı menüsünü açıp “Uygulamayı yükle” veya “Ana ekrana ekle” seçeneğini kullan.';
  installGuide.hidden = false;
});

document.querySelector('#close-install-guide').addEventListener('click', () => { installGuide.hidden = true; });
refreshInstallButton();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch((error) => console.error('Service worker kaydı başarısız:', error));
  });
  let refreshingForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshingForUpdate) return;
    refreshingForUpdate = true;
    window.location.reload();
  });
}

window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const activeScreen = document.querySelector('.screen.is-active');
  const interactiveTarget = event.target.closest?.('button, input, textarea, select, a');
  if (interactiveTarget && activeScreen?.contains(interactiveTarget)) return;
  if (document.querySelector('#welcome-screen').classList.contains('is-active')) showScreen('tribute-screen');
  else if (document.querySelector('#tribute-screen').classList.contains('is-active')) showScreen('mode-screen');
});

window.addEventListener('popstate', (event) => {
  const screen = event.state?.screen || hashScreens[window.location.hash] || 'welcome-screen';
  showScreen(screen, { historyAction: 'none' });
});

const swipeRoutes = {
  'welcome-screen': { left: 'tribute-screen' },
  'tribute-screen': { left: 'mode-screen', right: 'welcome-screen' },
  'mode-screen': { right: 'tribute-screen' }
};

Object.entries(swipeRoutes).forEach(([screenId, routes]) => {
  const screen = document.querySelector(`#${screenId}`);
  let touchStart = null;
  screen.addEventListener('touchstart', (event) => {
    if (!window.matchMedia('(max-width: 640px)').matches) return;
    const touch = event.changedTouches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  screen.addEventListener('touchend', (event) => {
    if (!touchStart || !screen.classList.contains('is-active')) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (dx < 0 && routes.left) showScreen(routes.left);
    if (dx > 0 && routes.right) navigateBack(routes.right);
  }, { passive: true });
});

const mapReadyPromise = fetch('assets/turkiye_iller.geojson')
  .then((response) => {
    if (!response.ok) throw new Error('Harita verisi yüklenemedi.');
    return response.json();
  })
  .then((geo) => { state.geo = geo; buildMap(); })
  .catch((error) => {
    document.querySelector('#map-loader').textContent = error.message;
    console.error(error);
    throw error;
  });

showScreen(hashScreens[window.location.hash] || 'welcome-screen', { historyAction: 'replace' });
