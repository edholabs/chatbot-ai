let qrCodeInstance = null;
let lastQrString = '';

function updateBadge(elementId, status) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    el.className = 'px-2 py-1 rounded text-xs font-semibold';
    
    switch(status) {
        case 'connected':
        case 'active':
            el.textContent = 'Active / Connected';
            el.classList.add('bg-green-500/20', 'text-green-400', 'border', 'border-green-500/30');
            break;
        case 'connecting':
            el.textContent = 'Connecting...';
            el.classList.add('bg-yellow-500/20', 'text-yellow-400', 'border', 'border-yellow-500/30');
            break;
        case 'qr_ready':
            el.textContent = 'Waiting Scan';
            el.classList.add('bg-blue-500/20', 'text-blue-400', 'border', 'border-blue-500/30');
            break;
        default:
            el.textContent = 'Disconnected';
            el.classList.add('bg-slate-800', 'text-slate-400', 'border', 'border-slate-700');
    }
}

async function fetchStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();

        // Update Telegram & AI Badges
        updateBadge('tgBadge', data.telegram.status);
        updateBadge('aiBadge', data.ai.status);
        
        // Update WA Badge (Beda element agar lebih besar)
        const waBadge = document.getElementById('waBadge');
        waBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold border';
        
        const qrContainer = document.getElementById('qrContainer');
        const connectedContainer = document.getElementById('connectedContainer');
        const loadingContainer = document.getElementById('loadingContainer');

        if (data.whatsapp.status === 'connected') {
            waBadge.textContent = 'Connected';
            waBadge.classList.add('bg-green-500/20', 'text-green-400', 'border-green-500/30');
            
            loadingContainer.classList.add('hidden');
            qrContainer.classList.add('hidden');
            connectedContainer.classList.remove('hidden');
            
        } else if (data.whatsapp.status === 'qr_ready') {
            waBadge.textContent = 'Waiting for Scan';
            waBadge.classList.add('bg-blue-500/20', 'text-blue-400', 'border-blue-500/30');
            
            loadingContainer.classList.add('hidden');
            connectedContainer.classList.add('hidden');
            qrContainer.classList.remove('hidden');

            // Render QR Code jika berubah
            if (data.whatsapp.qr && data.whatsapp.qr !== lastQrString) {
                lastQrString = data.whatsapp.qr;
                const qrDiv = document.getElementById('qrcode');
                qrDiv.innerHTML = ''; // bersihkan QR lama
                
                qrCodeInstance = new QRCode(qrDiv, {
                    text: lastQrString,
                    width: 256,
                    height: 256,
                    colorDark : "#0f172a",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });
            }
        } else {
            // connecting atau disconnected
            waBadge.textContent = data.whatsapp.status === 'connecting' ? 'Connecting...' : 'Disconnected';
            waBadge.classList.add('bg-slate-800', 'text-slate-400', 'border-slate-700');
            
            qrContainer.classList.add('hidden');
            connectedContainer.classList.add('hidden');
            loadingContainer.classList.remove('hidden');
            
            const loadingText = loadingContainer.querySelector('p');
            loadingText.textContent = data.whatsapp.status === 'connecting' ? 'Menghubungkan ke server...' : 'Koneksi terputus. Mencoba ulang...';
        }

    } catch (error) {
        console.error('Error fetching status:', error);
    }
}

// Fetch status setiap 2 detik
setInterval(fetchStatus, 2000);
fetchStatus();
