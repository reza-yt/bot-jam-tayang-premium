# 🎬 YouTube Watch Hour Bot — Otomatisasi Jam Tayang

Bot ini dibuat untuk membantu **farming jam tayang YouTube** secara otomatis menggunakan playlist, rotasi akun/proxy, fingerprint spoofing, interaksi human-like, dan integrasi notifikasi ke Telegram.

---

## 🚀 Fitur Utama

### ✅ Pemutaran Playlist YouTube (Watch Hour Farming)
- Memutar playlist dari file `playlists.json`.
- Menggunakan browser Chromium otomatis.
- Simulasi interaksi manusia (scroll, mouse move, keypress).
- Pemutaran video selama 40–50 menit per akun.

### 🔄 Rotasi Proxy & Fingerprint
- Proxy dari `valid_proxies.txt`, format `http://ip:port:user:pass`.
- Spoof fingerprint: platform, bahasa, CPU, WebGL, user agent.
- Anti-bot: nonaktifkan `navigator.webdriver`, WebRTC, mediaDevices.

### ⏱ Sesi Otomatis (Auto Scheduler)
- Bisa jalankan 4 sesi per hari (`SESSIONS_PER_DAY`).
- 25 akun per sesi (`ACCOUNTS_PER_SESSION`).
- Delay antar sesi 6 jam (`SESSION_INTERVAL_HOURS`).
- Otomatis lanjut dari sesi terakhir jika script berhenti/crash.

### 📦 Manajemen Akun & Proxy
- `used_accounts.json`: menyimpan akun yang sudah digunakan.
- `blocked_proxies.txt`: menyimpan proxy yang gagal koneksi.
- `failed_accounts.json`: log proxy bermasalah untuk analisis ulang.

### 📊 Logging & Monitoring
- `watch_log.csv`: catatan pemakaian (proxy, playlist, durasi, timestamp).
- Resume sesi dari posisi terakhir (`session_state.json`).

### 📲 Telegram Notification
- Notifikasi ke Telegram setiap sesi mulai/sukses/error/selesai.
- Kirim menggunakan `axios` dan Telegram Bot API.

---

## 🧰 Struktur File

```
.
├── main.js                 # Bot utama
├── playlists.json          # Daftar playlist yang akan ditonton
├── valid_proxies.txt       # Daftar proxy format ip:port:user:pass
├── used_accounts.json      # Penyimpanan akun yang sudah digunakan
├── failed_accounts.json    # Akun/proxy gagal dipakai
├── session_state.json      # State untuk resume sesi
├── watch_log.csv           # Log durasi jam tayang
└── blocked_proxies.txt     # Proxy yang gagal digunakan
```

---

## 💻 Cara Install & Jalankan

### 1. Clone Repo & Install Dependency
```bash
git clone https://github.com/username/yt-watchbot.git
cd yt-watchbot
npm install playwright axios csv-writer
```

### 2. Siapkan File Berikut
- `playlists.json` → daftar playlist, contoh:
```json
{
  "playlist1": { "url": "https://www.youtube.com/playlist?list=XXX" },
  "playlist2": { "url": "https://www.youtube.com/playlist?list=YYY" }
}
```

- `valid_proxies.txt` → format:
```
http://ip:port:user:pass
http://ip2:port2:user2:pass2
```

### 3. Edit Telegram Bot Token
Ubah `TELEGRAM_TOKEN` dan `TELEGRAM_CHAT_ID` di `main.js`:
```js
const TELEGRAM_TOKEN = 'YOUR_BOT_TOKEN';
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID';
```

### 4. Jalankan Bot
```bash
node main.js
```

---

## ⚠️ Catatan & Tips
- Gunakan proxy **premium/residential** agar tidak terdeteksi bot.
- Jangan ulangi akun/proxy dalam waktu dekat.
- Gunakan delay antarsesi untuk menghindari flag YouTube.

---

## 👨‍💻 Developer
Bot ini dibuat untuk riset teknikal & eksperimen personal. Harap digunakan dengan bijak dan **tidak melanggar kebijakan YouTube**.