// Multi-format Barcode + QR Scanner (BarcodeDetector + ZXing fallback)
// Supports common tracking symbologies: Code128, Code39, Code93, ITF, EAN-13/8, UPC-A/E, PDF417, Data Matrix, Aztec, QR.

let isScanning = false;
let videoEl = null;
let stream = null;
let rafId = null;
let barcodeDetector = null;
let zxingReader = null;
let zxingStopFn = null;
let lastResultValue = null;
let consecutiveHits = 0;

function ensureVideo(container) {
    if (!videoEl) {
        videoEl = document.createElement('video');
        videoEl.setAttribute('playsinline','');
        videoEl.setAttribute('autoplay','');
        videoEl.muted = true;
        videoEl.style.width = '100%';
        videoEl.style.maxHeight = '360px';
        videoEl.style.objectFit = 'cover';
        videoEl.style.background = '#000';
        container.innerHTML = '';
        container.appendChild(videoEl);
    }
    return videoEl;
}

async function startScanner() {
    if (isScanning) return;
    const container = document.getElementById('reader');
    if (!container) {
        console.error('#reader container not found');
        return;
    }
    document.getElementById('startScanBtn').style.display = 'none';
    document.getElementById('stopScanBtn').style.display = 'block';

    try {
        if ('BarcodeDetector' in window) {
            await startNative(container);
        } else {
            await startZXing(container);
        }
        isScanning = true;
    } catch (e) {
        console.error('Failed to start scanner:', e);
        showScanMessage('Camera access failed. Check permissions.', 'error');
        document.getElementById('startScanBtn').style.display = 'block';
        document.getElementById('stopScanBtn').style.display = 'none';
    }
}

async function startNative(container) {
    ensureVideo(container);
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30 }
            },
            audio: false
        });
    } catch (err) {
        handleCameraError(err);
        throw err;
    }
    videoEl.srcObject = stream;
    await videoEl.play();

    // Apply camera capabilities: focus, zoom, torch (if available)
    try {
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.() || {};
        const adv = {};
        if (caps.focusMode && caps.focusMode.includes('continuous')) adv.focusMode = 'continuous';
        if (caps.zoom && typeof caps.zoom.max === 'number') adv.zoom = Math.min(caps.zoom.max, 2);
        if (caps.torch) adv.torch = false;
        if (Object.keys(adv).length) await track.applyConstraints({ advanced: [adv] });
        if (caps.torch) injectTorchControl(track);
    } catch (_) {}

    const supportedFormats = await (BarcodeDetector.getSupportedFormats?.() || []);
    const preferred = ['code_128','code_39','code_93','itf','ean_13','ean_8','upc_a','upc_e','pdf417','data_matrix','aztec','qr_code'];
    const formats = supportedFormats.length ? preferred.filter(f => supportedFormats.includes(f)) : preferred;
    barcodeDetector = new BarcodeDetector({ formats });

    const loop = async () => {
        if (!isScanning || !barcodeDetector) return;
        try {
            const codes = await barcodeDetector.detect(videoEl);
            if (codes && codes.length) {
                handleCandidate((codes[0].rawValue || '').trim());
            }
        } catch (_) { /* ignore transient errors */ }
        rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
}

async function startZXing(container) {
    ensureVideo(container);
    const loaded = await loadZxingLibrary();
    if (!loaded) {
        // Fallback: limited QR-only scanning if html5-qrcode present
        if (typeof Html5Qrcode === 'function') {
            showScanMessage('Multi-format library unavailable; falling back to QR-only.', 'error');
            return startHtml5QrFallback();
        }
        showScanMessage('Unable to load barcode library. Enter tracking code manually.', 'error');
        throw new Error('ZXing load failed (all sources)');
    }
    const ZX = (window).ZXing;
    try {
        zxingReader = new ZX.BrowserMultiFormatReader();
    } catch (e) {
        console.error('ZXing initialization failed:', e);
        showScanMessage('Barcode engine init failed. Enter code manually.', 'error');
        throw e;
    }
    let devices = [];
    try {
        devices = await ZX.BrowserCodeReader.listVideoInputDevices();
    } catch (e) {
        console.warn('List video devices failed:', e);
    }
    let targetId = null;
    if (devices.length) {
        const back = devices.find(d => /back|rear|environment/i.test(d.label));
        targetId = (back || devices[devices.length - 1]).deviceId;
    }
    await new Promise((resolve) => {
        zxingStopFn = zxingReader.decodeFromVideoDevice(targetId || null, videoEl, (result, err) => {
            if (result) {
                const text = (result.getText ? result.getText() : result.text || '').trim();
                handleCandidate(text);
            }
            if (err && /NotAllowedError|SecurityError/.test(err.name)) {
                showScanMessage('Camera permission denied. Enable in browser settings.', 'error');
            }
        });
        setTimeout(resolve, 350);
    });

    // Apply capabilities on ZXing path too
    try {
        const tr = videoEl.srcObject?.getVideoTracks?.()[0];
        const caps = tr?.getCapabilities?.() || {};
        const adv = {};
        if (caps.focusMode && caps.focusMode.includes('continuous')) adv.focusMode = 'continuous';
        if (caps.zoom && typeof caps.zoom.max === 'number') adv.zoom = Math.min(caps.zoom.max, 2);
        if (caps.torch) adv.torch = false;
        if (Object.keys(adv).length) await tr.applyConstraints({ advanced: [adv] });
        if (caps.torch) injectTorchControl(tr);
    } catch (_) {}
}

// Torch control overlay
function injectTorchControl(track) {
    const container = document.getElementById('reader');
    if (!container || document.getElementById('torchToggle')) return;
    const btn = document.createElement('button');
    btn.id = 'torchToggle';
    btn.textContent = '🔦 Torch';
    btn.style.position = 'absolute';
    btn.style.bottom = '8px';
    btn.style.right = '8px';
    btn.style.background = 'rgba(0,0,0,0.6)';
    btn.style.color = '#fff';
    btn.style.border = '1px solid #444';
    btn.style.fontSize = '12px';
    btn.style.padding = '6px 8px';
    btn.style.borderRadius = '4px';
    btn.addEventListener('click', async () => {
        try {
            const settings = track.getSettings?.() || {};
            const isOn = !!settings.torch;
            await track.applyConstraints({ advanced: [{ torch: !isOn }] });
            showScanMessage(!isOn ? 'Torch enabled' : 'Torch disabled', 'success');
        } catch (_) {
            showScanMessage('Torch not supported on this device.', 'error');
        }
    });
    container.style.position = 'relative';
    container.appendChild(btn);
}

// Attempt to load ZXing from multiple CDNs sequentially.
async function loadZxingLibrary() {
    if ((window).ZXing) return true;
    const sources = [
        'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/index.min.js',
        'https://unpkg.com/@zxing/browser@0.1.5/umd/index.min.js'
    ];
    for (let i = 0; i < sources.length; i++) {
        try {
            await injectScript(sources[i] + (i > 0 ? ('?cb=' + Date.now()) : ''));
            if ((window).ZXing) return true;
        } catch (e) {
            console.warn('ZXing source failed:', sources[i], e);
        }
    }
    return false;
}

function injectScript(src) {
    return new Promise((resolve, reject) => {
        const existing = Array.from(document.getElementsByTagName('script')).find(s => s.src === src);
        if (existing) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Script load failed: ' + src));
        document.head.appendChild(s);
        // Failsafe timeout
        setTimeout(() => {
            if (!(window).ZXing) {
                reject(new Error('Timeout loading: ' + src));
            }
        }, 6000);
    });
}

// Fallback QR-only scanner using existing html5-qrcode script (if present)
function startHtml5QrFallback() {
    const readerId = 'reader';
    let qrInstance;
    try {
        qrInstance = new Html5Qrcode(readerId);
    } catch (e) {
        console.error('Html5Qrcode init failed:', e);
        showScanMessage('QR fallback unavailable. Enter code manually.', 'error');
        return;
    }
    qrInstance.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
            // Only QR; still pass to handler.
            handleCandidate(decodedText.trim());
        },
        () => { /* ignore not found */ }
    ).catch(err => {
        console.error('QR fallback start failed:', err);
        showScanMessage('QR fallback failed. Enter code manually.', 'error');
    });
}

function handleCandidate(value) {
    if (!value) return;
    // Debounce rapid misreads by requiring 2 identical consecutive detections
    if (value === lastResultValue) {
        consecutiveHits += 1;
    } else {
        lastResultValue = value;
        consecutiveHits = 1;
    }
    if (consecutiveHits >= 2) {
        onBarcodeDetected(value);
    }
}

function onBarcodeDetected(decodedText) {
    console.log('Barcode detected:', decodedText);
    const input = document.getElementById('trackingCode');
    if (input) input.value = decodedText;
    const carrier = detectCarrier(decodedText);
    displayCarrierInfo(carrier, decodedText);
    showScanMessage(`${carrier.name} code captured`, 'success');
    const recipientSelect = document.getElementById('recipientSelect');
    if (recipientSelect) recipientSelect.focus();
    stopScanner();
}

function stopScanner() {
    if (!isScanning) return;
    isScanning = false;

    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    if (barcodeDetector) barcodeDetector = null;
    if (zxingReader) {
        try { if (typeof zxingStopFn === 'function') zxingStopFn(); } catch(_){}
        try { if (typeof zxingReader.reset === 'function') zxingReader.reset(); } catch(_){}
        zxingReader = null; zxingStopFn = null;
    }
    if (videoEl && videoEl.srcObject) {
        const tracks = videoEl.srcObject.getTracks?.() || [];
        tracks.forEach(t => t.stop());
        videoEl.srcObject = null;
    }
    lastResultValue = null; consecutiveHits = 0;
    document.getElementById('startScanBtn').style.display = 'block';
    document.getElementById('stopScanBtn').style.display = 'none';
}

function handleCameraError(err) {
    let msg = 'Camera access failed.';
    switch (err?.name) {
        case 'NotAllowedError':
            msg = 'Camera permission denied. Allow camera access in site settings.';
            break;
        case 'NotFoundError':
        case 'DevicesNotFoundError':
            msg = 'No camera found. Connect a camera or check OS privacy settings.';
            break;
        case 'OverconstrainedError':
            msg = 'Requested camera constraints not supported. Retrying with defaults…';
            // Retry with looser constraints once
            retryLooseConstraints();
            return;
        case 'SecurityError':
            msg = 'Camera blocked by browser security. Use HTTPS or localhost.';
            break;
        default:
            msg = `${msg} (${err?.name || 'Unknown'}).`;
    }
    console.error('Camera error:', err);
    showScanMessage(msg, 'error');
}

async function retryLooseConstraints() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        videoEl.srcObject = stream;
        await videoEl.play();
    } catch (e) {
        console.error('Retry with loose constraints failed:', e);
        showScanMessage('Unable to access any camera. Check permissions.', 'error');
    }
}

// Helper function to show scan messages
function showScanMessage(message, type) {
    const messageEl = document.getElementById('scanMessage');
    messageEl.textContent = message;
    messageEl.className = `scan-message ${type}`;

    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageEl.className = 'scan-message';
    }, 5000);
}

// Clean up scanner when leaving the page
window.addEventListener('beforeunload', () => {
    if (isScanning) {
        stopScanner();
    }
});

// Clean up scanner when switching tabs/sections
window.addEventListener('visibilitychange', () => {
    if (document.hidden && isScanning) {
        stopScanner();
    }
});

// Display carrier information in the UI
function displayCarrierInfo(carrier, trackingNumber) {
    // Check if carrier info container exists, if not create it
    let carrierInfoEl = document.getElementById('carrierInfoDisplay');

    if (!carrierInfoEl) {
        // Create carrier info element after the tracking code input
        carrierInfoEl = document.createElement('div');
        carrierInfoEl.id = 'carrierInfoDisplay';

        const trackingInput = document.getElementById('trackingCode');
        trackingInput.parentNode.insertAdjacentElement('afterend', carrierInfoEl);
    }

    // Build carrier info HTML
    const logoHTML = carrier.logoUrl
        ? `<img src="${carrier.logoUrl}" alt="${carrier.name}" class="carrier-logo-large" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
           <span class="icon" style="display:none;">${getCarrierIcon(carrier.code)}</span>`
        : `<span class="icon">${getCarrierIcon(carrier.code)}</span>`;

    const trackLinkHTML = carrier.trackUrl
        ? `<a href="${carrier.trackUrl}" target="_blank" class="track-link">Track →</a>`
        : '';

    carrierInfoEl.innerHTML = `
        <div class="carrier-info">
            ${logoHTML}
            <div class="carrier-details">
                <div class="carrier-name">${carrier.name}</div>
                <div class="tracking-number">${trackingNumber}</div>
            </div>
            ${trackLinkHTML}
        </div>
    `;
}

// Detect carrier when tracking code is manually entered
document.addEventListener('DOMContentLoaded', function() {
    const trackingInput = document.getElementById('trackingCode');

    if (trackingInput) {
        // Detect carrier on blur (when user finishes typing)
        trackingInput.addEventListener('blur', function() {
            const trackingNumber = this.value.trim();
            if (trackingNumber) {
                const carrier = detectCarrier(trackingNumber);
                displayCarrierInfo(carrier, trackingNumber);
            }
        });

        // Also detect on Enter key press
        trackingInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const trackingNumber = this.value.trim();
                if (trackingNumber) {
                    const carrier = detectCarrier(trackingNumber);
                    displayCarrierInfo(carrier, trackingNumber);
                }
            }
        });
    }
});
