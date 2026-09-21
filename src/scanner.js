/**
 * DSH Pocket QR Scanner & URL Parser
 * Supports Live Camera Stream, Canvas decoding, and Image file upload
 */

export function parsePocketUrl(rawText) {
  if (!rawText) return null;
  const text = rawText.trim();

  let targetUrl = '';
  let token = '';

  try {
    // If it's already a full URL
    if (text.startsWith('http://') || text.startsWith('https://')) {
      const parsed = new URL(text);
      token = parsed.searchParams.get('token') || '';
      // Retain protocol + host + pathname
      targetUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } else if (text.includes(':') || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(text)) {
      // e.g. 192.168.1.100:3081
      const normalized = text.startsWith('http') ? text : `http://${text}`;
      const parsed = new URL(normalized);
      token = parsed.searchParams.get('token') || '';
      targetUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } else {
      // Might be a raw token
      if (/^[a-zA-Z0-9]{8}$/.test(text)) {
        return { type: 'token_only', token: text };
      }
      return null;
    }

    return {
      type: 'full_url',
      raw: text,
      url: targetUrl.replace(/\/$/, ''),
      token: token,
      isHttps: targetUrl.startsWith('https://'),
      isLan: /^(http:\/\/)?(127\.|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|localhost)/.test(targetUrl)
    };
  } catch (err) {
    console.error('URL parse error:', err);
    return null;
  }
}

export class QrScannerManager {
  constructor(videoElement, canvasElement, onScanSuccess) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d', { willReadFrequently: true }) : null;
    this.onScanSuccess = onScanSuccess;
    this.stream = null;
    this.animFrameId = null;
    this.isScanning = false;
  }

  async startCamera() {
    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      this.video.setAttribute('playsinline', 'true');
      await this.video.play();

      this.isScanning = true;
      this.requestFrame();
      return { success: true };
    } catch (error) {
      console.warn('Camera access failed, fallback to file scanner:', error);
      return { success: false, error: error.message || '无法访问摄像头' };
    }
  }

  stopCamera() {
    this.isScanning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  requestFrame() {
    if (!this.isScanning) return;
    this.animFrameId = requestAnimationFrame(() => this.scanFrame());
  }

  scanFrame() {
    if (!this.isScanning || !this.video || this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
      this.requestFrame();
      return;
    }

    const { videoWidth, videoHeight } = this.video;
    if (videoWidth > 0 && videoHeight > 0) {
      this.canvas.width = videoWidth;
      this.canvas.height = videoHeight;
      this.ctx.drawImage(this.video, 0, 0, videoWidth, videoHeight);

      try {
        const imageData = this.ctx.getImageData(0, 0, videoWidth, videoHeight);
        // Use jsQR if available on window or imported
        if (window.jsQR) {
          const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });
          if (code && code.data) {
            const parsed = parsePocketUrl(code.data);
            if (parsed) {
              this.stopCamera();
              if (this.onScanSuccess) {
                this.onScanSuccess(parsed, code.data);
              }
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Frame scan error:', err);
      }
    }

    this.requestFrame();
  }

  async scanImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const testCanvas = document.createElement('canvas');
          const testCtx = testCanvas.getContext('2d');
          testCanvas.width = img.width;
          testCanvas.height = img.height;
          testCtx.drawImage(img, 0, 0);
          const imageData = testCtx.getImageData(0, 0, img.width, img.height);
          if (window.jsQR) {
            const code = window.jsQR(imageData.data, imageData.width, imageData.height);
            if (code && code.data) {
              const parsed = parsePocketUrl(code.data);
              resolve({ parsed, raw: code.data });
              return;
            }
          }
          reject(new Error('未在图片中识别出有效二维码'));
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsDataURL(file);
    });
  }
}
