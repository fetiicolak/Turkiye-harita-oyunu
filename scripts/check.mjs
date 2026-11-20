import { readFile, stat } from 'node:fs/promises';

const required = [
  'dist/index.html',
  'dist/styles.css',
  'dist/app.js',
  'dist/manifest.webmanifest',
  'dist/sw.js',
  'dist/assets/app-icon-192.png',
  'dist/assets/app-icon-512.png',
  'dist/assets/favicon.png',
  'dist/assets/turkiye_iller.geojson',
  'dist/assets/ataturk-portre.png',
  'dist/assets/kapak-turkiye-kure.png',
  'dist/assets/kapak-turkiye-kure-mobil.png',
  'dist/assets/linkedin-preview.png',
  'LICENSE',
  'playwright.config.mjs',
  'tests/app.spec.mjs',
  'docs/demo/turkiye-harita-oyunu-linkedin.mp4',
  'docs/screenshots/ana-sayfa.png',
  'docs/screenshots/oyun-secimi.png',
  'docs/screenshots/oyun-ekrani.png',
  'docs/screenshots/mobil-oyun-secimi.png',
  'docs/linkedin-post.md',
  '.openai/hosting.json'
];

for (const file of required) {
  const info = await stat(file);
  if (!info.isFile() || info.size === 0) throw new Error(`Eksik veya boş dosya: ${file}`);
}

for (const [file, expectedSize] of [['dist/assets/app-icon-192.png', 192], ['dist/assets/app-icon-512.png', 512], ['dist/assets/favicon.png', 64]]) {
  const png = await readFile(file);
  if (png.toString('ascii', 1, 4) !== 'PNG' || png.readUInt32BE(16) !== expectedSize || png.readUInt32BE(20) !== expectedSize) {
    throw new Error(`PNG ikon boyutu hatalı: ${file}`);
  }
}
const socialPreview = await readFile('dist/assets/linkedin-preview.png');
if (socialPreview.readUInt32BE(16) !== 1200 || socialPreview.readUInt32BE(20) !== 627) {
  throw new Error('LinkedIn sosyal önizleme görseli 1200×627 değil.');
}

const geo = JSON.parse(await readFile('dist/assets/turkiye_iller.geojson', 'utf8'));
if (geo.features?.length !== 81) throw new Error(`Haritada 81 yerine ${geo.features?.length ?? 0} il var.`);
const plates = geo.features.map((feature) => Number(feature.properties?.plaka)).sort((a, b) => a - b);
if (new Set(plates).size !== 81 || plates.some((plate, index) => plate !== index + 1)) {
  throw new Error('Plaka kodları 1–81 aralığında eksiksiz ve benzersiz değil.');
}
if (geo.features.some((feature) => !feature.properties?.il_adi || !feature.geometry?.coordinates?.length)) {
  throw new Error('İl adı veya geometri verisi eksik.');
}

const html = await readFile('dist/index.html', 'utf8');
for (const id of ['welcome-screen', 'tribute-screen', 'mode-screen', 'game-screen']) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Ekran bulunamadı: ${id}`);
}
if (!html.includes('rel="manifest"') || !html.includes('id="install-app"')) {
  throw new Error('PWA manifest bağlantısı veya yükleme düğmesi eksik.');
}
if (html.includes('favicon.svg') || html.includes('app-icon.svg')) throw new Error('Eski SVG ikon bağlantısı hâlâ HTML içinde.');
if ((html.match(/data-mode=/g) ?? []).length !== 4) throw new Error('Dört oyun modu kartı bulunamadı.');
for (const id of ['timer-pause', 'timer-disable', 'tribute-map', 'start-game-button', 'save-time-prompt', 'exit-button', 'exit-dialog', 'finish-missing', 'records-button', 'records-dialog', 'share-result']) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Yeni arayüz denetimi eksik: ${id}`);
}
if (!html.includes('styles.css?v=12') || !html.includes('app.js?v=12')) {
  throw new Error('Güncel önbellek sürümü HTML bağlantılarına eklenmemiş.');
}
for (const meta of ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:card']) {
  if (!html.includes(meta)) throw new Error(`Sosyal paylaşım meta etiketi eksik: ${meta}`);
}
if (html.includes('<datalist') || html.includes('list="province-list"')) {
  throw new Error('Şehir öneri listesi kaldırılmamış.');
}
if ((html.match(/Önceki sayfa/g) ?? []).length !== 3 || (html.match(/Sonraki sayfa/g) ?? []).length !== 3) {
  throw new Error('Tanıtım sayfalarının ileri/geri gezinme düğmeleri eksik.');
}
if ((html.match(/Sağa kaydır/g) ?? []).length !== 3 || (html.match(/Sola kaydır/g) ?? []).length !== 3) {
  throw new Error('Mobil kaydırma yönlendirmeleri eksik.');
}
for (const removedText of ['Her mod 81 ilin tamamıyla oynanır', 'İpucu: Türkçe karakter', 'Portre: maliozer']) {
  if (html.includes(removedText)) throw new Error(`Kaldırılması istenen metin hâlâ sayfada: ${removedText}`);
}

const app = await readFile('dist/app.js', 'utf8');
for (const behavior of ["querySelectorAll('[data-mode]')", 'mapReadyPromise', "addEventListener('touchend'", 'navigator.maxTouchPoints', 'timerPauseButton.addEventListener']) {
  if (!app.includes(behavior)) throw new Error(`Etkileşim davranışı eksik: ${behavior}`);
}
for (const behavior of ["addEventListener('popstate'", "querySelectorAll('[data-back]')", 'navigateBack']) {
  if (!app.includes(behavior)) throw new Error(`Sayfa geçmişi davranışı eksik: ${behavior}`);
}
for (const behavior of ['function beginGame()', 'provinceAliases', 'p.plate > province.plate', 'title.textContent = province.name', "localStorage.setItem('turkiye-harita-sureleri'", 'finishGame({ partial: true })', 'swipeRoutes', 'function renderRecords()', 'navigator.share', 'navigator.clipboard.writeText']) {
  if (!app.includes(behavior)) throw new Error(`Yeni oyun davranışı eksik: ${behavior}`);
}
if (!app.includes("if (!state.gameStarted) {\n    navigateBack('mode-screen')")) {
  throw new Error('Başlamamış oyundan doğrudan çıkış davranışı eksik.');
}

const styles = await readFile('dist/styles.css', 'utf8');
if (!styles.includes('@media (min-width: 1001px)') || !styles.includes('overflow: hidden')) {
  throw new Error('Masaüstü tam ekran düzeni bulunamadı.');
}
if (!styles.includes('.finish-dialog[hidden]')) throw new Error('Sonuç penceresinin gizleme düzeltmesi eksik.');
if (!styles.includes("background-image: url('assets/kapak-turkiye-kure-mobil.png')") || !styles.includes('background-size: cover')) {
  throw new Error('Mobil kapakta tam ekran dikey görsel ayarı eksik.');
}
if (!styles.includes('.screen-nav button small { display: none;') || !styles.includes('@media (any-pointer: coarse)')) {
  throw new Error('Kaydırma açıklamalarının yalnızca mobilde gösterilmesi sağlanmamış.');
}
if (!styles.includes('@media (max-width: 1180px) and (orientation: portrait)') || !styles.includes('padding-bottom: 4vh')) {
  throw new Error('Telefon/tablet ana sayfa düzeni eksik.');
}

const manifest = JSON.parse(await readFile('dist/manifest.webmanifest', 'utf8'));
if (manifest.display !== 'standalone' || !manifest.start_url || manifest.icons?.length < 2) {
  throw new Error('PWA manifesti yüklenebilir uygulama gereksinimlerini karşılamıyor.');
}

const serviceWorker = await readFile('dist/sw.js', 'utf8');
for (const asset of ['index.html', 'app.js', 'turkiye_iller.geojson']) {
  if (!serviceWorker.includes(asset)) throw new Error(`Çevrimdışı önbellekte eksik varlık: ${asset}`);
}

console.log('Kontrol başarılı: 81 il ve tüm oyun ekranları hazır.');
