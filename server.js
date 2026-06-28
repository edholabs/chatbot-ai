require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Inisialisasi modul
const { initWhatsApp, sendWhatsAppMessage, getWAStatus } = require('./whatsapp');
const { initTelegram, sendTelegramMessage } = require('./telegram');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sajikan file statis untuk Web UI Dashboard
app.use(express.static(path.join(__dirname, 'public')));

// API Status untuk Dashboard UI
app.get('/api/status', (req, res) => {
    const wa = getWAStatus();
    res.json({
        whatsapp: wa,
        telegram: {
            status: process.env.ENABLE_TELEGRAM === 'true' && process.env.TELEGRAM_BOT_TOKEN ? 'connected' : 'disconnected'
        },
        ai: {
            status: process.env.ENABLE_AI_REPLY === 'true' && process.env.GEMINI_API_KEY ? 'active' : 'inactive'
        },
        timestamp: new Date().toISOString()
    });
});

// Outbound API (Fonnte-like endpoint) untuk ZafaLink utama mengirim notifikasi
app.post('/api/send', async (req, res) => {
    const { provider, to, message } = req.body;
    
    if (!to || !message) {
        return res.status(400).json({ error: 'Target (to) and message are required' });
    }

    try {
        let result;
        if (provider === 'telegram') {
            result = await sendTelegramMessage(to, message);
            res.json({ success: true, provider: 'telegram', result });
        } else {
            // Default to WhatsApp
            result = await sendWhatsAppMessage(to, message);
            res.json({ success: true, provider: 'whatsapp', result });
        }
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`🚀 ZafaLink Messaging Gateway running on port ${port}`);
    console.log(`🌐 Dashboard UI tersedia di http://localhost:${port}`);
    
    // Mulai koneksi ke WA dan Telegram jika diaktifkan di .env
    if (process.env.ENABLE_WHATSAPP === 'true') {
        initWhatsApp();
    }
    if (process.env.ENABLE_TELEGRAM === 'true') {
        initTelegram();
    }
});
