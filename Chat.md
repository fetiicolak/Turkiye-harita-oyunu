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
- PWA önbelleği güncellemelerde sürümlenir ve uygulama dosyalarında ağ öncelikli strateji kullanılır. Bu karar, eski JavaScript’in oyunları bozmasını önlemek içindir.

## Görsel kararlar

- Ana kapakta Türkiye’ye odaklanan küre görseli kullanılır.
- Büyük `TÜRKİYE` yazısı koyu zümrüt yeşili, altın kenarlı ve kabartmalı görünür.
- Atatürk sayfası mevcut lisanslı portreyi, gerçek il sınırlarından üretilen Türkiye haritasıyla birlikte kullanır.
- Favicon küçük boyutta okunabilmesi için yazısızdır: koyu zümrüt zemin, altın çerçeve ve açık renk Türkiye silüeti.

## Hata kayıtları

- 2026-11-20: Sonuç penceresi oyun başında görünüyordu. Neden, `.finish-dialog` sınıfındaki `display: grid` kuralının HTML `hidden` niteliğini ezmesiydi. `.finish-dialog[hidden] { display: none !important; }` kuralıyla düzeltildi ve otomatik kontrole eklendi.
- 2026-11-20: Plaka oyununda doğru cevaptan sonra ilk eksik plakaya dönülüyordu. Sonraki seçim, cevaplanan plakadan sonraki ilk eksik kodu bulacak; listenin sonunda gerekirse başa saracak şekilde değiştirildi.

## Bakım notu

Önemli mimari, yayın, kullanıcı deneyimi veya veri kararı alındığında bu dosyaya tarihli kısa bir madde eklenmelidir.
