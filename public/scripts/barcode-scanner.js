// Barcode Scanner functionality using html5-qrcode library
// Supports mobile devices (iOS, Android, iPad)

// Barcode Scanner Variables
let html5QrCode = null;
let isScanning = false;

// Start the camera scanner
function startScanner() {
    const readerId = "reader";

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode(readerId);
    }

    const config = {
        fps: 10,
        qrbox: { width: 400, height: 100 }, // Wide and short for horizontal linear barcodes
        aspectRatio: 1.777, // 16:9 aspect ratio
        formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,    // Used by UPS, FedEx, USPS tracking
            Html5QrcodeSupportedFormats.CODE_39,     // Used by FedEx, some USPS
            Html5QrcodeSupportedFormats.CODE_93,     // Additional support
            Html5QrcodeSupportedFormats.ITF,         // Interleaved 2 of 5 (USPS uses this)
            Html5QrcodeSupportedFormats.CODABAR,     // USPS sometimes uses this
            Html5QrcodeSupportedFormats.EAN_13,      // International packages
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E
        ],
        experimentalFeatures: {
            useBarCodeDetectorIfSupported: true  // Use native barcode detection if available
        }
    };

    // Start scanning
    html5QrCode.start(
        { facingMode: "environment" }, // Use back camera
        config,
        (decodedText, decodedResult) => {
            // Success callback - barcode scanned
            console.log(`Barcode detected: ${decodedText}`);
            console.log('Barcode format:', decodedResult.result.format);
            console.log('Full result:', decodedResult);

            // Fill the tracking code input
            document.getElementById('trackingCode').value = decodedText;

            // Detect carrier from tracking number
            const carrier = detectCarrier(decodedText);
            console.log('Detected carrier:', carrier);

            // Display carrier information
            displayCarrierInfo(carrier, decodedText);

            // Stop scanner after successful scan
            stopScanner();

            // Show success message with carrier
            showScanMessage(`${carrier.name} package scanned successfully!`, 'success');

            // Optional: Auto-focus on recipient select
            document.getElementById('recipientSelect').focus();
        },
        (errorMessage) => {
            // Error callback - usually just means no barcode detected yet
            // Only log unique errors to avoid console spam
            if (!window.lastScanError || window.lastScanError !== errorMessage) {
                console.log('Scanning...', errorMessage);
                window.lastScanError = errorMessage;
            }
        }
    ).then(() => {
        isScanning = true;
        document.getElementById('startScanBtn').style.display = 'none';
        document.getElementById('stopScanBtn').style.display = 'block';
    }).catch((err) => {
        console.error("Unable to start scanner:", err);
        showScanMessage('Unable to access camera. Please check permissions.', 'error');
    });
}

// Stop the camera scanner
function stopScanner() {
    if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => {
            isScanning = false;
            document.getElementById('startScanBtn').style.display = 'block';
            document.getElementById('stopScanBtn').style.display = 'none';
        }).catch((err) => {
            console.error("Error stopping scanner:", err);
        });
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
