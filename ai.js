const { GoogleGenerativeAI } = require('@google/generative-ai');

// Simpan riwayat chat sederhana di memory agar AI tahu konteks (Dalam skala besar sebaiknya pakai DB)
const chatSessions = {};

const systemPrompt = `
Anda adalah "Zafa Assistant", agen layanan pelanggan resmi untuk penyedia internet ZafaLink.
Tugas Anda adalah:
1. Membantu pelanggan menjawab pertanyaan seputar paket internet, tagihan, dan masalah koneksi.
2. Menjawab dengan sopan, ramah, dan profesional.
3. Gunakan bahasa Indonesia yang santai tapi jelas.
4. Jika ditanya harga, informasikan bahwa mereka bisa mengecek di zafalink.web.id atau tanyakan kebutuhan Mbps-nya.
5. Jika ada masalah yang tidak bisa diselesaikan, arahkan mereka untuk menghubungi Teknisi atau berikan format pesan: "Lapor Gangguan: [ID Pelanggan] - [Keluhan]".

Ingat: Jangan berikan informasi palsu. Jika Anda tidak tahu, katakan "Mohon maaf, saya belum memiliki informasi tersebut. Silakan hubungi admin kami."
`;

async function handleMessageWithAI(sessionId, message) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn('⚠️ GEMINI_API_KEY belum di-set di .env. AI Reply dimatikan.');
        return 'Mohon maaf, layanan AI sedang tidak aktif. Pesan Anda akan diteruskan ke Admin.';
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash', // Atau gemini-2.5-flash jika tersedia
        systemInstruction: systemPrompt 
    });

    try {
        // Inisialisasi history chat jika belum ada
        if (!chatSessions[sessionId]) {
            chatSessions[sessionId] = [];
        }

        const chat = model.startChat({
            history: chatSessions[sessionId]
        });

        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        // Update history (batas maksimal 20 history per user agar hemat memory/token)
        chatSessions[sessionId].push({ role: "user", parts: [{ text: message }] });
        chatSessions[sessionId].push({ role: "model", parts: [{ text: responseText }] });
        
        if (chatSessions[sessionId].length > 20) {
            chatSessions[sessionId] = chatSessions[sessionId].slice(-20);
        }

        return responseText;
    } catch (error) {
        console.error('Error saat menghubungi Gemini API:', error);
        return 'Maaf, sistem AI ZafaLink sedang sibuk. Silakan coba beberapa saat lagi.';
    }
}

module.exports = { handleMessageWithAI };
