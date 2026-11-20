# Proje Karar Günlüğü

Bu dosya, geliştirme sırasında alınan önemli teknik ve ürün kararlarını sonraki çalışmalarda korumak için tutulur. Yeni bir karar mevcut davranışı değiştirdiğinde bu günlük de güncellenmelidir.

## Temel kararlar

- Proje, bağımlılık gerektirmeyen statik HTML, CSS ve JavaScript olarak geliştirilir. Yayın çıktısı `dist/` klasörüdür.
- Uygulama GitHub Pages üzerinden public olarak yayımlanır ve PWA olarak kurulabilir.
- Harita, `dist/assets/turkiye_iller.geojson` içindeki 81 ilin gerçek sınırlarından tarayıcıda SVG olarak oluşturulur.
- Oyunların tamamı klavye, fare ve dokunmatik ekranla kullanılabilir olmalıdır.
- Masaüstünde oyun ekranı tek görünüm alanına sığar; küçük ekranlarda içerik gerektiğinde dikey akabilir.
- Zamanlayıcı oyun açıldığı anda başlar. Kullanıcı süreyi durdurabilir, devam ettirebilir veya tamamen kapatabilir.
- Ana sayfa, Atatürk sayfası, oyun seçimi ve oyun ekranı tarayıcı geçmişine yazılır. Böylece görünür geri düğmeleriyle birlikte tarayıcının geri/ileri düğmeleri de çalışır.
- PWA önbelleği güncellemelerde sürümlenir ve uygulama dosyalarında ağ öncelikli strateji kullanılır. Bu karar, eski JavaScript’in oyunları bozmasını önlemek içindir.

## Görsel kararlar

- Ana kapakta Türkiye’ye odaklanan küre görseli kullanılır.
- Büyük `TÜRKİYE` yazısı koyu zümrüt yeşili, altın kenarlı ve kabartmalı görünür.
- Atatürk sayfası mevcut lisanslı portreyi, gerçek il sınırlarından üretilen Türkiye haritasıyla birlikte kullanır.
- Favicon küçük boyutta okunabilmesi için yazısızdır: koyu zümrüt zemin, altın çerçeve ve açık renk Türkiye silüeti.

## Hata kayıtları

- 2026-11-20: Sonuç penceresi oyun başında görünüyordu. Neden, `.finish-dialog` sınıfındaki `display: grid` kuralının HTML `hidden` niteliğini ezmesiydi. `.finish-dialog[hidden] { display: none !important; }` kuralıyla düzeltildi ve otomatik kontrole eklendi.

## Bakım notu

Önemli mimari, yayın, kullanıcı deneyimi veya veri kararı alındığında bu dosyaya tarihli kısa bir madde eklenmelidir.
