# Proje Karar Günlüğü

Bu dosya, geliştirme sırasında alınan önemli teknik ve ürün kararlarını sonraki çalışmalarda korumak için tutulur. Yeni bir karar mevcut davranışı değiştirdiğinde bu günlük de güncellenmelidir.

## Temel kararlar

- Proje, bağımlılık gerektirmeyen statik HTML, CSS ve JavaScript olarak geliştirilir. Yayın çıktısı `dist/` klasörüdür.
- Uygulama GitHub Pages üzerinden public olarak yayımlanır ve PWA olarak kurulabilir.
- Harita, `dist/assets/turkiye_iller.geojson` içindeki 81 ilin gerçek sınırlarından tarayıcıda SVG olarak oluşturulur.
- Oyunların tamamı klavye, fare ve dokunmatik ekranla kullanılabilir olmalıdır.
- Masaüstünde oyun ekranı tek görünüm alanına sığar; küçük ekranlarda içerik gerektiğinde dikey akabilir.
- Oyun ekranı önce hazır durumda açılır. Zamanlayıcı ve oyun etkileşimleri yalnızca sol paneldeki `Başla` düğmesine basılınca etkinleşir; kullanıcı süreyi daha sonra durdurabilir, devam ettirebilir veya tamamen kapatabilir.
- Ana sayfa, Atatürk sayfası, oyun seçimi ve oyun ekranı tarayıcı geçmişine yazılır. Böylece görünür geri düğmeleriyle birlikte tarayıcının geri/ileri düğmeleri de çalışır.
- Tanıtım ekranlarının gezinme düğmeleri sağ üstte `Önceki sayfa` ve `Sonraki sayfa` adlarıyla gösterilir. İlk ve son tanıtım ekranındaki geçersiz yön devre dışı bırakılır.
- Şehir cevaplarında açılır öneri listesi kullanılmaz. Yaygın kısa/eski adlar (`Afyon`, `Urfa`, `Antep`, `Maraş`, `İçel`, `İzmit`, `Adapazarı`) doğru il ile eşleştirilir.
- Tamamlanan süreler yalnızca kullanıcı onayıyla ve en fazla son 50 kayıt olacak şekilde cihazın yerel tarayıcı depolamasına kaydedilir; sunucuya gönderilmez.
- Oyun ekranındaki `Çıkış` düğmesi üç yol sunar: mevcut oyuna devam etme, kaydetmeden oyun seçimine dönme veya mevcut ilerlemeyi erken sonuçlandırma. Erken sonuçta eksik iller açıklanır ve kayıt onayı verilirse süreyle birlikte tamamlanan/eksik il bilgileri de cihazda saklanır.
- Oyun henüz `Başla` düğmesiyle başlatılmadıysa `Çıkış` doğrudan oyun seçimine döner; kaydedilecek ilerleme olmadığı için çıkış seçenekleri gösterilmez.
- İl adları tüm oyun modlarında SVG erişilebilir başlıklarıyla imleç üzerine gelindiğinde gösterilir.
- Mobil tanıtım ekranlarında sola kaydırma ileri, sağa kaydırma geri gezinir. Gezinme düğmelerinde bu hareketler alt açıklama olarak yer alır.
- PWA ikonu ve favicon, kuzey yarım küreden Türkiye'ye odaklanan aynı kare küre görselinin 512, 192 ve 64 piksel PNG türevleridir.
- LinkedIn ve diğer sosyal ağ bağlantı önizlemeleri için 1200×627 piksel özel kapak ve Open Graph/Twitter Card meta etiketleri kullanılır.
- Süre kayıtları oyun seçme ekranındaki `Kişisel Rekorlarım` penceresinde son 20 sonuç ve her modun en iyi tamamlama süresiyle gösterilir.
- `Kişisel Rekorlarım` düğmesi sayfa gezinmesiyle çakışmaması için oyun kartlarının altındaki orta alanda konumlandırılır; tablet ve telefonda sütun yapısına göre ortalanır.
- Sonuç ekranı Web Share API ile cihazın paylaşım menüsünü açar; desteklenmeyen tarayıcılarda sonuç metni ve oyun bağlantısı panoya kopyalanır.
- Playwright smoke testleri ana akışı, dört oyun modunu, başlamamış oyundan çıkışı, rekorları, tablet kaydırmasını, sosyal meta etiketlerini ve 81 il tamamlamasını sınar. GitHub Pages yayını bu testler geçmeden yapılmaz.
- README vitrini gerçek uygulama ekran görüntüleri ve 17,7 saniyelik MP4 demo içerir. Kaynak kod MIT lisanslıdır; harita verisi ve üçüncü taraf görseller kendi lisanslarını korur.
- PWA önbelleği güncellemelerde sürümlenir ve uygulama dosyalarında ağ öncelikli strateji kullanılır. Bu karar, eski JavaScript’in oyunları bozmasını önlemek içindir.

## Görsel kararlar

- Ana kapakta Türkiye’ye odaklanan küre görseli kullanılır.
- Büyük `TÜRKİYE` yazısı koyu zümrüt yeşili, altın kenarlı ve kabartmalı görünür.
- Atatürk sayfası mevcut lisanslı portreyi, gerçek il sınırlarından üretilen Türkiye haritasıyla birlikte kullanır.
- Favicon ve uygulama ikonu yazısızdır: kare çerçeve içinde kuzey yarım küreden görülen kürede Türkiye belirgin bir sınır ve arazi vurgusuyla merkezlenir.
- Mobil kapak, yatay masaüstü görselini zorla ölçeklemek yerine aynı tasarımın 941×1672 piksel dikey varyantını kullanır. Görsel `cover` ile tüm ekranı doldurur; Türkiye batıdan doğuya güvenli kadraj içinde kalır ve boş bant oluşmaz. Atatürk ekranındaki Türkiye SVG'si genişliği değişmeden portre üzerinde sola taşınmıştır.
- Gezinme düğmelerindeki `Sağa kaydır` ve `Sola kaydır` yardımcı metinleri masaüstünde gizlenir; dokunmatik/kaba işaretçili cihazlarda (`any-pointer: coarse`) gösterilir.
- Kaydırma desteği ekran genişliğine değil dokunmatik giriş (`ontouchstart` / `maxTouchPoints`) desteğine göre çalışır; böylece tabletler de kapsanır.
- 1180 piksele kadar dikey tabletler mobil kapak görselini kullanır. Telefonda ana sayfa alt dolgusu `4vh` değerine indirilerek metin grubu ekranın altındaki boş alanı dolduracak şekilde aşağı taşınır.

## Hata kayıtları

- 2026-11-20: Sonuç penceresi oyun başında görünüyordu. Neden, `.finish-dialog` sınıfındaki `display: grid` kuralının HTML `hidden` niteliğini ezmesiydi. `.finish-dialog[hidden] { display: none !important; }` kuralıyla düzeltildi ve otomatik kontrole eklendi.
- 2026-11-20: Plaka oyununda doğru cevaptan sonra ilk eksik plakaya dönülüyordu. Sonraki seçim, cevaplanan plakadan sonraki ilk eksik kodu bulacak; listenin sonunda gerekirse başa saracak şekilde değiştirildi.

## Bakım notu

Önemli mimari, yayın, kullanıcı deneyimi veya veri kararı alındığında bu dosyaya tarihli kısa bir madde eklenmelidir.
