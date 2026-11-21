# T.C. SYDV Mütevelli Heyeti Gündem & Karar Sistemi - Word Tuvali (WYSIWYG Block Canvas) ve Kurumsal UI Yenileme Planı

## 1. Vizyon & Tasarım Taahhüdü (Design Commitment)
- **Stil & Kimlik**: Resmi T.C. Kamu Kurumu / GovTech Prestij Mimarisi (Kurumsal Lacivert `#0f172a` / `#1e3a8a`, Arduvaz `#334155`, Zümrüt Yeşili `#059669`, Kehribar `#d97706`, Kırmızı `#dc2626` — **Mor/Violet/Fuchsia Yasaklı**).
- **Word Tuvali (1-A)**: Masaüstünde gerçek `210mm` A4 kağıt tuvali üzerinde doğrudan yazım ve düzenleme; mobil ve tablette ise yatay kaydırma gerektirmeyen `%100` duyarlı akıllı belge görünümü. Baskı (`react-to-print`) sırasında birebir A4 (`mm`) ve `break-inside-avoid` standartları korunur.
- **Word Ribbon + Nesne Bazlı Blok Madde Sistemi (2-A)**:
  - Üstte sabit **Word Şeridi (Ribbon Toolbar)**: Aktif metin editörünü doğrudan kontrol eden yazı tipi, boyut, kalın, italik, altı çizili, hizalama, liste, sayfa kenar boşluğu/satır aralığı hızlı ayarı, Word/Excel aktarım, Sıralama ve Kaydet/Kesinleştir/Yazdır kontrolleri.
  - **Blok/Nesne Gündem Maddeleri**: Her gündem maddesi; kendi metni, alt maddeleri ve eki olan tablosu ile birlikte **tek bir sürüklenebilir nesne (Document Block)** olarak hareket eder.
  - Maddenin solunda sürükle-bırak tutamacı (`⠿`), sıra numarası girişi ve yukarı/aşağı okları; sağ üstünde ise maddeye odaklanıldığında veya üzerine gelindiğinde açılan **Yüzen Aksiyon Kapsülü (Floating Action Pill)** (Tablo Ekle/Ayarla, Alt Madde, Yaş/Cinsiyet, Madde Tipi, Sil) yer alır.
- **Kağıt Üstü Doğrudan Düzenleme & Tüm Sistem Kurumsal Yenileme (3-A)**:
  - Antet (Kurum Başlığı ve Logolar), Karar Tarihi/Saati/No, Gündem Maddeleri, Tablolar, Alt Karar Notu ve Mütevelli Heyeti İmzaları doğrudan A4 kağıdı üzerindeki gerçek yerlerinde görünür ve yetkili personel tarafından doğrudan kağıt üzerinde düzenlenir.
  - `components/Layout.tsx`, `app/page.tsx`, `app/members/page.tsx`, `app/settings/page.tsx`, `app/logs/page.tsx` ve `app/profile/page.tsx` kompakt, hızlı, %100 mobil uyumlu kamu kurumu tasarım diline yükseltilir.

## 2. Uygulama Adımları
1. **`components/RichTextEditor.tsx`**:
   - Hem bağımsız hem de Word sayfası içinde satır içi (`variant="inline"`) çalışabilen mod desteği.
   - Aktif editör örneğini (`onFocusEditor`) üstteki Word Ribbon çubuğuna bağlama yeteneği (böylece her maddede ayrı ayrı kaba araç çubuğu tekrarlanmaz, tek bir Word şeridinden aktif madde biçimlendirilir + seçili metin için kompakt hızlı araç çubuğu).
2. **`app/forms/[id]/page.tsx`**:
   - **Word Ribbon Üst Bar**: Belge başlığı, kayıt durumu, Mod seçimi (Canlı Word Düzenleme / Salt Baskı Önizleme), Biçimlendirme Şeridi (B, I, U, Hizalama, Liste, Yazı Boyutu, Satır Aralığı), Word'den Aktar, Hızlı Sırala, Kesinleştir ve Yazdır.
   - **Canlı A4 Belge Tuvali**:
     - **Antet Bloğu**: Sol/Sağ kurum logoları ve ortada doğrudan düzenlenebilir Kurum Başlığı.
     - **Karar Meta Bloğu**: Kağıt üzerinde `KARAR TARİHİ`, `KARAR NO`, `SAAT` ve `Toplantı Ertelendi` durumunun doğrudan tıklanarak veya satır içi düzenlenmesi.
     - **Blok/Nesne Gündem Maddeleri**: Her madde `draggable` bir blok nesnesidir. Sürüklenirken madde metni + tablosu + alt maddeleri tek bir kart/nesne olarak taşınır. Araya tek tıkla madde ekleme çizgisi (`+ Araya Madde Ekle`), tablo içi hızlı satır/sütun yönetimi, Excel yükleme/indirme ve Muhtaçlık Sınırı kontrolü doğrudan kağıt üzerindeki tablo bloğuna entegre edilir.
     - **Karar Notu & İmza Bloğu**: Kağıdın altında doğrudan düzenlenebilir Karar Notu ve üzerinde **"İmzacıları Seç / Düzenle"** hızlı açılır paneli bulunan gerçek zamanlı Heyet İmza dizilimi (Başkan üstte ortada, üyeler altta 4'lü/esnek sütunda).
3. **Kurumsal Arayüz & Mobil Uyumluluk (`Layout.tsx`, `app/page.tsx`, `app/members/page.tsx`, `app/settings/page.tsx`)**:
   - Sol menünün kompakt kurumsal tasarıma kavuşturulması.
   - Form listesi sayfasında (`app/page.tsx`) arama/filtreleme, durum rozetleri (Aktif, Kesinleşti, Ertelendi, Pasif, Şablon - mor yerine kurumsal kehribar/lacivert rozet), mobil uyumlu aksiyon butonları (mobilde `opacity-0` yüzünden görünmeyen butonların her zaman erişilebilir olması).
   - Üyeler ve Ayarlar sayfalarının daha kompakt ve mobil dostu hale getirilmesi.
4. **Doğrulama**:
   - `npx tsc --noEmit` ile tüm tip kontrollerinin sıfır hata ile geçmesi.
