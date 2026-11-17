# Dream Telecom SDYS (Satış & Dağıtım Yönetim Sistemi) - Dağıtım ve Kurulum Kılavuzu

Bu belge, projenin canlı sunucuda mevcut diğer Docker servisleriyle (`tescom-nginx`, `postgres`, `n8n`, `evrak-takip` vb.) çakışmadan nasıl ayağa kaldırılacağını ve `http://erp.dreamtelecom.com.tr/` adresinden nasıl yayına alınacağını adım adım açıklar.

---

## 🏗️ Sunucu Mimari Özeti

Mevcut sunucunuzda port `80` ve `443`'ü yöneten bir ana Nginx konteyneri (`tescom-nginx`) bulunmaktadır. Ayrıca `5000`, `5432`, `5433`, `5678`, `8000` gibi portlar diğer uygulamalar tarafından kullanılmaktadır.

Çakışmayı önlemek ve en temiz yalıtımı sağlamak için:
1. **Frontend Konteyneri (`dreamtelecom-frontend`):** Host sunucusunun boşta olan **`8088`** portuna bağlanır.
2. **Backend Konteyneri (`dreamtelecom-backend`):** Yalnızca Docker dahili ağı üzerinden frontend ile konuşur (dışarıya açık port gerektirmez).
3. **Veritabanı (`dreamtelecom-db`):** Kendine ait izole PostgreSQL 16 veritabanıdır (host portu işgal etmez).
4. **Ana Nginx (`tescom-nginx`):** `erp.dreamtelecom.com.tr` alan adından gelen istekleri ve WebSocket bağlantılarını `http://127.0.0.1:8088` adresine iletir.

---

## 🚀 Canlı Sunucuda Kurulum Adımları

### 1. Projeyi Sunucuya Klonlayın
Sunucunuza SSH ile bağlanıp uygun bir çalışma dizinine (örneğin `/opt` veya `~/apps`) gidin:

```bash
git clone https://github.com/HamidrezaToutounchi/DreamTelecomERP.git
cd DreamTelecomERP
```

---

### 2. Ortam Değişkenlerini Tanımlayın
Örnek yapılandırma dosyasını `.env` olarak kopyalayın:

```bash
cp .env.example .env
```

İhtiyacınıza göre `.env` dosyasını düzenleyebilirsiniz (`nano .env`). Varsayılan değerler üretim için hazırdır:
- `FRONTEND_PORT=8088`
- `POSTGRES_USER=postgres`
- `POSTGRES_PASSWORD=postgres_dt_crm_secure_2026!`
- `POSTGRES_DB=sdys_crm`
- `JWT_SECRET=dt_crm_jwt_super_secret_production_key_987654321`

---

### 3. Docker Konteynerlerini Başlatın
Aşağıdaki komut ile veritabanı, backend ve frontend konteynerleri derlenip arka planda başlatılır:

```bash
docker compose up -d --build
```

Konteynerlerin durumunu kontrol edin:
```bash
docker compose ps
```
`dreamtelecom-db`, `dreamtelecom-backend` ve `dreamtelecom-frontend` konteynerlerinin `Up` durumunda olduğunu göreceksiniz.

---

### 4. Başlangıç Verilerini Yükleyin (Seed)
Veritabanı tabloları `Prisma` tarafından otomatik oluşturulur. Tüm verileri sıfırlayıp yalnızca **1 adet Sistem Yöneticisi (Admin)** hesabı tanımlamak için:

```bash
docker compose exec dt-backend npx ts-node prisma/seed.ts
```

> **Giriş Bilgileri:**
> - **Sistem Yöneticisi (Admin):** `admin@dreamtelecom.com` | Şifre: `Admin123!`
> - **Rol:** `SALES_MANAGER` (Tüm yetkilere sahip Sistem Yöneticisi)
> *(Veritabanında başka hiçbir demo veri veya kullanıcı bırakılmaz, sistem sıfır olarak açılır.)*

---

### 5. Sunucunun Ana Nginx'ine (`tescom-nginx`) Alan Adını Tanımlayın

Proje kök dizinindeki `nginx-host-proxy.conf` dosyasını ana Nginx yapılandırmanıza ekleyin:

1. Konfigürasyonu Nginx conf klasörüne kopyalayın:
   ```bash
   # Örnek (tescom-nginx'in conf dizini nerede mount edilmişse):
   cp nginx-host-proxy.conf /etc/nginx/conf.d/erp.dreamtelecom.com.tr.conf
   ```
2. Nginx sözdizimini test edin ve yeniden yükleyin:
   ```bash
   docker exec tescom-nginx nginx -t
   docker exec tescom-nginx nginx -s reload
   ```

*(Alternatif olarak doğrudan sunucu terminalinden `curl -I http://127.0.0.1:8088` diyerek uygulamanın yanıt verdiğini doğrulayabilirsiniz.)*

---

### 6. SSL / HTTPS Sertifikası (Önerilen)
Certbot ile ücretsiz Let's Encrypt SSL sertifikası tanımlamak için:

```bash
certbot --nginx -d erp.dreamtelecom.com.tr
```
veya Docker certbot ile sertifikanızı oluşturup `nginx-host-proxy.conf` dosyasındaki HTTPS bloğunu etkinleştirebilirsiniz.

---

## 🛠️ Yararlı Komutlar

- **Logları canlı izleme:**
  ```bash
  docker compose logs -f dt-backend
  docker compose logs -f dt-frontend
  ```
- **Konteynerleri durdurma:**
  ```bash
  docker compose down
  ```
- **Konteynerleri güncelleme (kod çekildikten sonra):**
  ```bash
  git pull origin main
  docker compose up -d --build
  ```
- **Yüklenen dosyalar (fotoğraflar):**
  Docker named volume olan `dreamtelecom_uploads` içinde kalıcı olarak saklanır.

---

## 🔒 Stok & Arıza Yönetimi Modülü Canlıya Alma (Production Deploy Kılavuzu)

Sistem canlıda gerçek verilerle çalıştığı için, yeni stok ve arıza yönetimi modülünü canlı sunucuya alırken **mutlaka** aşağıdaki adımları sırasıyla uygulayınız:

### 1. Adım: Canlı Veritabanı (PostgreSQL) Yedeğini Alın
Canlı veritabanı konteynerinden tam SQL dump yedeği alınız:
```bash
# Canlı DB yedeği (tarih ve saat damgalı)
docker exec dreamtelecom-db pg_dump -U postgres sdys_crm > sdys_crm_backup_$(date +%Y%m%d_%H%M%S).sql
```
Yedeğin dosya boyutunu kontrol ediniz:
```bash
ls -lh sdys_crm_backup_*.sql
```

### 2. Adım: Uploads Docker Volume Yedeğini Alın
Müşteri ve teklif evrakları ile yeni eklenecek stok belgelerinin saklandığı Docker volume'unun yedeğini alınız:
```bash
docker run --rm -v dreamtelecom_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

### 3. Adım: Yeni Kodu Çekin ve Canlı Konteynerleri Güncelleyin
```bash
# En güncel kodu çekin
git pull origin main

# Backend ve frontend konteynerlerini derleyip yeniden başlatın
docker compose up -d --build dt-backend dt-frontend
```

> **Önemli Not:** `docker-entrypoint.sh` içerisinde yer alan `npx prisma db push` komutu otomatik olarak çalışır. Yapılan tüm şema değişiklikleri **yalnızca eklemeli (additive only)** olduğu için mevcut hiçbir veri, müşteri, teklif veya kullanıcı kaydı silinmez ya da zarar görmez.

### 4. Adım: Başlangıç Tanımlarını Yükleyin (Idempotent Seed)
Varsayılan "Ana Depo" ve standart rol izin matrisini yüklemek için seed komutunu çalıştırınız (Mevcut admin hesabını veya verileri bozmaz, `upsert` ile çalışır):
```bash
docker compose exec dt-backend npx ts-node prisma/seed.ts
```

### 5. Adım: Canlı Sistem Doğrulama Kontrolleri
Aşağıdaki kontrolleri canlı arayüzde doğrulayınız:
1. `https://erp.dreamtelecom.com.tr/` adresine giriş yapınız (`admin@dreamtelecom.com`).
2. Sol menüde **Depolar**, **Tedarikçiler**, **Mal Kabul**, **Stok Çıkışı**, **Arıza & Servis (RMA)** ve **Stok Raporları** menülerinin geldiğini doğrulayınız.
3. Mevcut Teklifler ve Müşteriler sayfalarınızın eksiksiz görüntülendiğini ve çalıştığını teyit ediniz.

---

## 🔄 Geri Alma Prosedürü (Rollback Planı)

Olası beklenmedik bir durumda canlı sistemi güncelleme öncesi haline getirmek için:

1. **Kodu Önceki Commite Çekin:**
   ```bash
   git checkout <guncelleme_oncesi_commit_hash>
   docker compose up -d --build dt-backend dt-frontend
   ```

2. **İhtiyaç Halinde Veritabanı Yedeğini Geri Yükleyin:**
   ```bash
   cat sdys_crm_backup_<tarih_saat>.sql | docker exec -i dreamtelecom-db psql -U postgres -d sdys_crm
   ```
