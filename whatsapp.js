const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal'); // Tetap simpan kalau mau lihat di terminal
const { handleMessageWithAI } = require('./ai');

let sock;
let waStatus = 'disconnected'; // 'disconnected', 'connecting', 'qr_ready', 'connected'
let currentQR = '';

async function initWhatsApp() {
    waStatus = 'connecting';
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }), // Matikan log yang berisik
        browser: ['ZafaLink Gateway', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            currentQR = qr;
            waStatus = 'qr_ready';
            console.log('\n==================================================');
            console.log('📲 SCAN QR CODE INI DI DASHBOARD / TERMINAL');
            console.log('==================================================\n');
        }

        if (connection === 'close') {
            waStatus = 'disconnected';
            currentQR = '';
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('WA Connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
            
            if (shouldReconnect) {
                setTimeout(initWhatsApp, 5000); // Tunggu 5 detik sebelum reconnect
            }
        } else if (connection === 'open') {
            waStatus = 'connected';
            currentQR = '';
            console.log('✅ WhatsApp berhasil terhubung!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        // Ambil text dari pesan
        const messageType = Object.keys(msg.message)[0];
        let text = '';
        if (messageType === 'conversation') {
            text = msg.message.conversation;
        } else if (messageType === 'extendedTextMessage') {
            text = msg.message.extendedTextMessage.text;
        }

        if (!text) return;

        const senderId = msg.key.remoteJid;
        console.log(`📩 Pesan WA baru dari ${senderId}: ${text}`);

        // Teruskan ke AI
        if (process.env.ENABLE_AI_REPLY === 'true') {
            try {
                const aiResponse = await handleMessageWithAI(senderId, text);
                if (aiResponse) {
                    await sock.sendMessage(senderId, { text: aiResponse });
                }
            } catch (error) {
                console.error('❌ Gagal memproses pesan dengan AI (WA):', error);
            }
        }
    });
}

async function sendWhatsAppMessage(to, message) {
    if (!sock || waStatus !== 'connected') {
        throw new Error('WhatsApp is not connected yet.');
    }
    
    // Format nomor WA dari '0812...' menjadi '62812...@s.whatsapp.net'
    let formattedNumber = to.toString().replace(/[^0-9]/g, '');
    if (formattedNumber.startsWith('0')) {
        formattedNumber = '62' + formattedNumber.slice(1);
    }
    if (!formattedNumber.includes('@s.whatsapp.net')) {
        formattedNumber = formattedNumber + '@s.whatsapp.net';
    }

    const result = await sock.sendMessage(formattedNumber, { text: message });
    return result;
}

function getWAStatus() {
    return {
        status: waStatus,
        qr: currentQR
    };
}

module.exports = { initWhatsApp, sendWhatsAppMessage, getWAStatus };
