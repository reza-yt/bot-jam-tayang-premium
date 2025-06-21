// 📁 File: main.js (Final Version with Cookies Support for 100 Accounts)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const axios = require('axios');

const playlists = JSON.parse(fs.readFileSync('playlists.json', 'utf-8'));
const proxies = fs.readFileSync('valid_proxies.txt', 'utf-8').trim().split('\n');
let usedAccounts = JSON.parse(fs.existsSync('used_accounts.json') ? fs.readFileSync('used_accounts.json') : '{}');

const TELEGRAM_TOKEN = 'YOUR_BOT_TOKEN';
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID';
const SESSIONS_PER_DAY = 4;
const ACCOUNTS_PER_SESSION = 25;
const SESSION_INTERVAL_HOURS = 6;

const delay = ms => new Promise(res => setTimeout(res, ms));
const getRandom = arr => arr[Math.floor(Math.random() * arr.length)];
let proxyIndex = 0;

const watchLog = csvWriter({
  path: 'watch_log.csv',
  header: [
    { id: 'proxy', title: 'Proxy' },
    { id: 'playlist', title: 'PlaylistURL' },
    { id: 'start', title: 'StartTime' },
    { id: 'end', title: 'EndTime' },
    { id: 'duration', title: 'Duration(s)' }
  ],
  append: true
});

async function sendTelegramLog(message) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message
    });
  } catch (e) {
    console.error('❌ Gagal kirim log ke Telegram:', e.message);
  }
}

function parseProxy(proxy) {
  const [ip, port, user, pass] = proxy.replace('http://', '').split(':');
  return { server: `http://${ip}:${port}`, username: user, password: pass, raw: proxy };
}

function generateFingerprint() {
  return {
    platform: getRandom(['Win32', 'MacIntel', 'Linux x86_64']),
    language: getRandom(['en-US', 'id-ID', 'en-GB']),
    cpu: getRandom([2, 4, 8]),
    webglVendor: getRandom(['Intel Inc.', 'NVIDIA Corporation', 'AMD']),
    webglRenderer: getRandom(['Intel UHD 620', 'GeForce GTX 1050', 'Radeon Vega 8'])
  };
}

async function spoofFingerprint(page, fp) {
  await page.addInitScript(fp => {
    Object.defineProperty(navigator, 'platform', { get: () => fp.platform });
    Object.defineProperty(navigator, 'language', { get: () => fp.language });
    Object.defineProperty(navigator, 'languages', { get: () => [fp.language] });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => fp.cpu });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    const getParam = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (param) {
      if (param === 37445) return fp.webglVendor;
      if (param === 37446) return fp.webglRenderer;
      return getParam.call(this, param);
    };
    window.RTCPeerConnection = undefined;
    window.RTCSessionDescription = undefined;
    Object.defineProperty(navigator, 'mediaDevices', { value: {} });
  }, fp);
}

async function watchPlaylist(page, playlistUrl) {
  console.log('🌐 Opening:', playlistUrl);
  await page.goto(playlistUrl, { timeout: 30000 });
  await delay(3000);
  const watchSeconds = 2400 + Math.floor(Math.random() * 600);
  const start = new Date();
  await delay(watchSeconds * 1000);
  const end = new Date();
  return { start, end, duration: watchSeconds };
}

async function runSession(batchIndex) {
  const playlistUrls = Object.values(playlists);
  const sessionAccounts = proxies.slice(batchIndex * ACCOUNTS_PER_SESSION, (batchIndex + 1) * ACCOUNTS_PER_SESSION);
  await sendTelegramLog(`🚀 Sesi ${batchIndex + 1} dimulai dengan ${sessionAccounts.length} akun.`);

  const tasks = sessionAccounts.map(async (proxyRaw, i) => {
    const proxy = parseProxy(proxyRaw);
    const fingerprint = generateFingerprint();

    try {
      const browser = await chromium.launch({ headless: false, proxy });
      const context = await browser.newContext({
        userAgent: `Mozilla/5.0 (${fingerprint.platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118 Safari/537.36`,
        viewport: { width: 1280, height: 720 },
        locale: fingerprint.language,
        ignoreHTTPSErrors: true
      });

      // Load cookies
      const cookiePath = path.join(__dirname, 'cookies', `akun${batchIndex * ACCOUNTS_PER_SESSION + i + 1}.json`);
      if (fs.existsSync(cookiePath)) {
        const cookies = JSON.parse(fs.readFileSync(cookiePath));
        try {
          await context.addCookies(cookies);
          console.log(`🍪 Cookies akun${i + 1} dimuat`);
        } catch (err) {
          console.error(`⚠️ Gagal load cookies akun${i + 1}:`, err.message);
        }
      } else {
        console.warn(`⚠️ Cookie akun${i + 1} tidak ditemukan`);
      }

      const page = await context.newPage();
      await spoofFingerprint(page, fingerprint);

      const url = getRandom(playlistUrls).url;
      const result = await watchPlaylist(page, url);

      await watchLog.writeRecords([{ proxy: proxy.raw, playlist: url, ...result }]);
      usedAccounts[proxy.raw] = usedAccounts[proxy.raw] || [];
      usedAccounts[proxy.raw].push(new Date().toISOString());
      await sendTelegramLog(`✅ [${proxy.raw}] Selesai nonton playlist: ${url}`);
      await browser.close();
    } catch (err) {
      console.log(`❌ Gagal proxy ${proxy.raw}: ${err.message}`);
      fs.appendFileSync('blocked_proxies.txt', proxy.raw + '\n');
      await sendTelegramLog(`❌ Gagal proxy: ${proxy.raw}`);
    }
  });

  await Promise.allSettled(tasks);
  fs.writeFileSync('used_accounts.json', JSON.stringify(usedAccounts, null, 2));
  await sendTelegramLog(`✅ Sesi ${batchIndex + 1} selesai.`);
}

(async () => {
  for (let i = 0; i < SESSIONS_PER_DAY; i++) {
    console.log(`\n📦 Mulai sesi ke-${i + 1}`);
    await runSession(i);
    if (i < SESSIONS_PER_DAY - 1) {
      await sendTelegramLog(`⏳ Menunggu ${SESSION_INTERVAL_HOURS} jam untuk sesi berikutnya...`);
      await delay(SESSION_INTERVAL_HOURS * 60 * 60 * 1000);
    }
  }
})();
