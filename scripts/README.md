# Coolify Yerel Otomatik Dağıtım (Auto-Deploy) Sistemi

Bu dizindeki betikler, yerel ağda/localhost'ta çalışan Coolify örneğinizin GitHub değişikliklerini güvenli bir şekilde (dışarıya port/tünel açmadan) otomatik deploy etmesini sağlar.

## 🚀 Nasıl Çalışır? (Hibrit Mimari)

1. **Git Hook (Anında Tetikleme - Sıfır Bekleme):**
   - Bu bilgisayarda `git push` yaptığınızda `.git/hooks/pre-push` tetiklenir.
   - Push tamamlandıktan hemen sonra `scripts/coolify-deploy.js` çalıştırılır ve Coolify'a doğrudan deploy emri gönderilir.
   - Windows masaüstü bildirimi ile durum anlık olarak ekrana gelir.

2. **Arka Plan Gözlemcisi (Uzak Değişiklikler İçin):**
   - GitHub web üzerinden veya başka bir bilgisayardan kod pushlandığında, arka planda çalışan `coolify-poller.js` servisi her 60 saniyede bir remote commit'leri kontrol eder.
   - Yeni bir commit tespit ettiğinde otomatik olarak deploy sürecini başlatır.

3. **Debounce / Sıraya Alma Koruması:**
   - Bir deploy işlemi sürerken peş peşe yapılan push istekleri sistemi kilitlememesi için sıraya alınır veya filtrelenir.

## 🛠 Kullanım Komutları

* **`npm run sync:status`**  
  Arka plan servisinin çalışıp çalışmadığını, son derlenen commit'i ve Docker konteyner durumunu gösterir.

* **`npm run sync:start`**  
  Arka plan servisini başlatır ve Windows başlangıcına (Startup) otomatik başlatma kısayolunu ekler.

* **`npm run sync:stop`**  
  Arka plan servisini durdurur.

* **`npm run deploy`**  
  Beklemeden son commit'i hemen Coolify üzerinde deploy eder ve sonucu masaüstü bildirimiyle gösterir.

