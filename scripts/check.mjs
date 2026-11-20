import { readFile, stat } from 'node:fs/promises';

const required = [
  'dist/index.html',
  'dist/styles.css',
  'dist/app.js',
  'dist/manifest.webmanifest',
  'dist/sw.js',
  'dist/assets/app-icon.svg',
  'dist/assets/app-icon-maskable.svg',
  'dist/assets/turkiye_iller.geojson',
  'dist/assets/ataturk-portre.png',
  'dist/assets/kapak-turkiye-kure.png',
  '.openai/hosting.json'
];

for (const file of required) {
  const info = await stat(file);
  if (!info.isFile() || info.size === 0) throw new Error(`Eksik veya boş dosya: ${file}`);
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
if ((html.match(/data-mode=/g) ?? []).length !== 4) throw new Error('Dört oyun modu kartı bulunamadı.');
for (const id of ['timer-pause', 'timer-disable', 'tribute-map']) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Yeni arayüz denetimi eksik: ${id}`);
}
for (const removedText of ['Her mod 81 ilin tamamıyla oynanır', 'İpucu: Türkçe karakter', 'Portre: maliozer']) {
  if (html.includes(removedText)) throw new Error(`Kaldırılması istenen metin hâlâ sayfada: ${removedText}`);
}

const app = await readFile('dist/app.js', 'utf8');
for (const behavior of ["querySelectorAll('[data-mode]')", 'mapReadyPromise', "addEventListener('touchend'", 'timerPauseButton.addEventListener']) {
  if (!app.includes(behavior)) throw new Error(`Etkileşim davranışı eksik: ${behavior}`);
}

const styles = await readFile('dist/styles.css', 'utf8');
if (!styles.includes('@media (min-width: 1001px)') || !styles.includes('overflow: hidden')) {
  throw new Error('Masaüstü tam ekran düzeni bulunamadı.');
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
