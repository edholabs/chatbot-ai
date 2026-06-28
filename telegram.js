const TelegramBot = require('node-telegram-bot-api');
const { handleMessageWithAI } = require('./ai');

let bot;

function initTelegram() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.log('⚠️ TELEGRAM_BOT_TOKEN belum di-set di .env. Telegram Bot dimatikan.');
        return;
    }

    bot = new TelegramBot(token, { polling: true });
    
    console.log('✅ Telegram Bot berhasil terhubung (Polling Mode)!');

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!text) return;
        console.log(`📩 Pesan Telegram baru dari ${chatId}: ${text}`);

        // Teruskan ke AI
        if (process.env.ENABLE_AI_REPLY === 'true') {
            try {
                // Memberikan prefix telegram_ agar terpisah history-nya dari WA
                const sessionId = `telegram_${chatId}`; 
                const aiResponse = await handleMessageWithAI(sessionId, text);
                
                if (aiResponse) {
                    bot.sendMessage(chatId, aiResponse);
                }
            } catch (error) {
                console.error('❌ Gagal memproses pesan dengan AI (Telegram):', error);
            }
        }
    });
}

async function sendTelegramMessage(chatId, message) {
    if (!bot) {
        throw new Error('Telegram Bot is not connected yet.');
    }
    const result = await bot.sendMessage(chatId, message);
    return result;
}

module.exports = { initTelegram, sendTelegramMessage };
