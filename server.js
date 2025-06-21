// 📁 File: server.js (Live Dashboard + Realtime Watch Hours + PNG Chart Sender)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const TELEGRAM_TOKEN = '7675336224:AAGbePwH6LFHj_ay0N0NVH6f-6atcRwykp0';
const TELEGRAM_CHAT_ID = '6941726242';

app.use(express.static('public'));

// Serve API endpoint for fetch-based dashboard
app.get('/api/jam-tayang', (req, res) => {
  try {
    const logs = fs.readFileSync('watch_log.csv', 'utf-8').split('\n').slice(1).filter(Boolean);
    const durations = logs.map(line => parseInt(line.split(',')[5]) || 0);
    const totalHours = (durations.reduce((a, b) => a + b, 0) / 3600).toFixed(1);
    res.json({ jam: totalHours });
  } catch (e) {
    res.status(500).json({ error: 'Gagal membaca file log' });
  }
});

// Generate daily chart and send to Telegram
async function sendDailyChart() {
  try {
    const logs = fs.readFileSync('watch_log.csv', 'utf-8').split('\n').slice(1).filter(Boolean);
    const daily = {};
    logs.forEach(line => {
      const parts = line.split(',');
      const date = new Date(parts[2]).toISOString().slice(0, 10);
      const dur = parseInt(parts[5]) || 0;
      daily[date] = (daily[date] || 0) + dur;
    });

    const labels = Object.keys(daily);
    const data = Object.values(daily).map(sec => (sec / 3600).toFixed(2));

    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 800, height: 400 });
    const buffer = await chartJSNodeCanvas.renderToBuffer({
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Jam Tayang per Hari', data, backgroundColor: 'rgba(75, 192, 192, 0.6)' }]
      },
      options: {
        plugins: { title: { display: true, text: 'Grafik Jam Tayang Harian' } },
        scales: { y: { beginAtZero: true } }
      }
    });

    const filePath = path.join(__dirname, 'chart.png');
    fs.writeFileSync(filePath, buffer);

    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('photo', fs.createReadStream(filePath));
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, formData, {
      headers: formData.getHeaders()
    });
  } catch (err) {
    console.error('❌ Gagal kirim grafik:', err.message);
  }
}

// WebSocket untuk real-time update
io.on('connection', socket => {
  console.log('🔌 Client connected');
  const interval = setInterval(() => {
    try {
      const logs = fs.readFileSync('watch_log.csv', 'utf-8').split('\n').slice(1).filter(Boolean);
      const durations = logs.map(l => parseInt(l.split(',')[5]) || 0);
      const totalHours = (durations.reduce((a, b) => a + b, 0) / 3600).toFixed(1);
      socket.emit('update', { totalHours });
    } catch (e) {
      socket.emit('update', { totalHours: 'N/A' });
    }
  }, 5000);

  socket.on('disconnect', () => clearInterval(interval));
});

server.listen(3000, () => console.log('🚀 Dashboard running at http://localhost:3000'));

// Optional: Send chart every 12 hours
setInterval(sendDailyChart, 12 * 60 * 60 * 1000);
