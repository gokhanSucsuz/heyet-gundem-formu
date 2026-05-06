# Proje Analizi: Gündem Hazırlama Uygulaması

## 1. Mimari Yapı ve Teknoloji Yığını
- **Framework:** Next.js (App Router kullanılıyor, SSR/SSG uyumlu)
- **Veritabanı:** MongoDB (Özel bir `MongoTable` adaptörü ile `/api/db/[collection]` üzerinden CRUD işlemleri yapılıyor)
- **Durum Yönetimi (State Management):** Yerel taslaklar için `localStorage` (Optimistic UI) ve senkronizasyon için özel bir `useLiveQuery` hook'u kullanılıyor.
- **Stil ve UI:** TailwindCSS, Lucide Icons. Modern, temiz (glassmorphism etkileri) ve duyarlı bir tasarım dili benimsenmiş.
- **Zengin Metin Editörü:** Tiptap kullanılarak özel bir `RichTextEditor` bileşeni oluşturulmuş.

## 2. Temel Modüller
- **Gündem/Form Editörü (`app/forms/[id]`):** Uygulamanın kalbi. Toplantı bilgilerinin, gündem maddelerinin (alt maddeler ve dinamik tablolar dahil) ve karar metinlerinin girildiği gelişmiş form yapısı. Kesinleştirme (locking) mekanizması ile veriler güvenceye alınıyor.
- **Önizleme ve Yazdırma (PrintPreview):** A4 formatına sadık, özel CSS kurallarıyla donatılmış (`@media print`), dinamik filigran (watermark) ve çoklu imza düzenine sahip gelişmiş yazdırma bileşeni.
- **Üye Yönetimi (`app/members`):** Mütevelli heyet üyelerinin ve vekillerin yönetildiği, sürükle-bırak (veya yön tuşlarıyla) sıralama yapılabilen modül. Vali (ilk üye) için özel mizanpaj kuralları entegre edilmiş.
- **Ayarlar (`app/settings`):** Sayfa kenar boşlukları, filigran, logo, satır/madde aralığı gibi tüm yazdırma ve görünüm detaylarının yönetildiği global konfigürasyon modülü.

## 3. Veri Akışı ve Güvenlik
- **Optimistic UI:** Kullanıcı deneyimini kesintiye uğratmamak için form değişiklikleri önce yerel taslağa (`localStorage`) kaydediliyor, ardından buluta senkronize ediliyor.
- **Kilitleme (Locking):** Bir gündem formu kesinleştirildiğinde (ertelenme durumu hariç), üzerinde değişiklik yapılması engelleniyor ve o anki imzacılar `signatureSnapshots` olarak donduruluyor.

## 4. Geliştirme İhtiyaçları ve Bildirim Sistemi İçin Altyapı
- Mevcut durumda sistemde bir kullanıcı/oturum yönetimi (Authentication) açıkça görünmüyor (veya tek kullanıcı/kurum mantığıyla çalışıyor).
- Bildirim sistemi entegrasyonu için veritabanında yeni bir `notifications` koleksiyonu oluşturulması ve API rotalarının güncellenmesi gerekecek.
