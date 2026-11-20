# Türkiye Harita Oyunu

Türkiye'nin 81 ilini eğlenerek öğrenebileceğiniz, telefon ve bilgisayarda çalışan ücretsiz bir harita oyunudur.

## Oyunu aç

[Türkiye Harita Oyunu'nu oyna](https://fetiicolak.github.io/Turkiye-harita-oyunu/)

## Dört farklı oyun

- **Seç & Bil:** Haritada bir ile dokunun ve ilin adını tahmin edin.
- **81'i Doldur:** Bildiğiniz il isimlerini yazarak dilsiz haritayı doldurun.
- **Dinle & Bul:** Sesli söylenen ili haritada seçin. Üç yanlış seçimden sonra doğru konum parlar.
- **Plaka Ustası:** 1–81 arasındaki plaka kodlarını doğru illerle eşleştirin.

## Süreyi kontrol et

Bir oyunu seçtikten sonra sol paneldeki **Başla** düğmesine basın; süre tam o anda çalışmaya başlar. Oyun ekranının üst kısmındaki seçeneklerle süreyi durdurabilir, kaldığınız yerden devam ettirebilir veya kapatabilirsiniz. Oyun bittiğinde sürenizi isterseniz kullandığınız cihaza kaydedebilirsiniz.

Oyunu 81 ili tamamlamadan bırakmak için **Çıkış** düğmesini kullanabilirsiniz. İlerlemenizi sonuç olarak bitirirseniz tamamlanan ve eksik kalan iller gösterilir; ilerleme ve süre yalnızca onay verirseniz cihazınıza kaydedilir. **Kaydetmeden çık** seçeneği doğrudan oyun seçimine döner.

Şehir cevapları yalnızca serbest metin olarak yazılır; uygulama şehir listesini göstermez. `Afyon`, `Urfa`, `Antep`, `Maraş`, `İçel`, `İzmit` ve `Adapazarı` gibi yaygın kısa veya eski kullanımlar da kabul edilir.

## Sayfalar arasında gezin

Sayfaların sağ üstündeki **Önceki sayfa** ve **Sonraki sayfa** düğmelerini veya tarayıcınızın geri ve ileri düğmelerini kullanabilirsiniz. Bilgisayarda ana sayfa ve Atatürk sayfasında herhangi bir tuşa basarak ilerleyebilirsiniz. Telefonda sola kaydırarak ilerleyebilir, sağa kaydırarak önceki sayfaya dönebilirsiniz.

Harita üzerinde imleci bir ilin üzerine getirdiğinizde ilin adı bütün oyun modlarında gösterilir.

## Uygulama olarak yükle

Sitedeki **Uygulamayı indir** düğmesini kullanarak oyunu desteklenen cihazlarda ana ekrana ekleyebilirsiniz. Kurulduktan sonra daha önce açılmış oyun dosyaları çevrimdışı da kullanılabilir.

## Geliştiriciler için

Proje, derleme gerektirmeyen statik HTML, CSS ve JavaScript kullanır. Yerel olarak çalıştırmak için:

```powershell
npx serve dist
```

Otomatik kontrolleri çalıştırmak için:

```powershell
npm run check
```

Teknik kararların geçmişi [Chat.md](Chat.md) dosyasında tutulur.

## Veri ve görsel kaynakları

- İl sınırları: OpenStreetMap katkıcıları ve `theaiagent/turkiye_iller_geojson` (ODbL 1.0).
- Atatürk portresi: `maliozer/ataturk_blackwhite_portrait` (MIT).
- PWA uygulama ikonu ve favicon: OpenAI ImageGen ile proje için üretilmiştir.

