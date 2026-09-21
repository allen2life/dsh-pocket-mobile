/**
 * DeepSeek Pocket Mobile Main Logic
 */

import { parsePocketUrl, QrScannerManager } from './scanner.js';

const STORAGE_KEY_HOSTS = 'dsh_pocket_saved_hosts';
const STORAGE_KEY_SETTINGS = 'dsh_pocket_settings';

const defaultSettings = {
  deepseekTheme: true,
  autoFillPin: true,
  darkMode: 'auto'
};

class AppState {
  constructor() {
    this.hosts = JSON.parse(localStorage.getItem(STORAGE_KEY_HOSTS) || '[]');
    this.settings = Object.assign({}, defaultSettings, JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS) || '{}'));
    this.currentHost = null;
  }

  saveHost(hostData) {
    // Find if host URL already exists
    const idx = this.hosts.findIndex(h => h.url === hostData.url);
    const item = {
      id: hostData.id || Date.now().toString(),
      name: hostData.name || (hostData.isLan ? '局域网设备' : '公网隧道'),
      url: hostData.url,
      token: hostData.token || '',
      isLan: hostData.isLan,
      lastConnected: new Date().toISOString()
    };

    if (idx >= 0) {
      this.hosts[idx] = Object.assign(this.hosts[idx], item);
    } else {
      this.hosts.unshift(item);
    }

    localStorage.setItem(STORAGE_KEY_HOSTS, JSON.stringify(this.hosts));
    return item;
  }

  deleteHost(id) {
    this.hosts = this.hosts.filter(h => h.id !== id);
    localStorage.setItem(STORAGE_KEY_HOSTS, JSON.stringify(this.hosts));
  }

  updateSettings(newSettings) {
    this.settings = Object.assign(this.settings, newSettings);
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings));
  }
}

const state = new AppState();

// DOM Elements
const hubView = document.getElementById('hub-view');
const sessionView = document.getElementById('session-view');
const scannerModal = document.getElementById('scanner-modal');
const scannerVideo = document.getElementById('scanner-video');
const scannerCanvas = document.getElementById('scanner-canvas');
const fileInput = document.getElementById('qr-file-input');

const connectUrlInput = document.getElementById('connect-url');
const connectPinInput = document.getElementById('connect-pin');
const connectNameInput = document.getElementById('connect-name');
const btnManualConnect = document.getElementById('btn-manual-connect');
const historyList = document.getElementById('history-list');

const pocketFrame = document.getElementById('pocket-frame');
const floatingBall = document.getElementById('floating-ball');
const floatingMenu = document.getElementById('floating-menu');

// Initialize Scanner
let scanner = null;

function renderHistory() {
  if (!historyList) return;
  if (state.hosts.length === 0) {
    historyList.innerHTML = `
      <div style="text-align: center; color: var(--text-sub); font-size: 13px; padding: 20px 0;">
        暂无保存的连接设备，请扫码或输入网址添加
      </div>
    `;
    return;
  }

  historyList.innerHTML = state.hosts.map(h => `
    <div class="history-item" data-id="${h.id}">
      <div class="history-info" onclick="window.appConnectTo('${h.id}')">
        <div class="history-name">
          ${h.name}
          <span class="history-badge ${h.isLan ? 'badge-lan' : 'badge-public'}">
            ${h.isLan ? '局域网' : '公网'}
          </span>
        </div>
        <div class="history-url">${h.url}</div>
      </div>
      <div class="history-actions">
        <button class="icon-btn" onclick="window.appDeleteHost('${h.id}', event)" title="删除">
          ✕
        </button>
      </div>
    </div>
  `).join('');
}

function openSession(hostData) {
  state.currentHost = hostData;
  state.saveHost(hostData);

  // Build target URL with token param if available
  let fullTarget = hostData.url;
  if (hostData.token && !fullTarget.includes('token=')) {
    fullTarget += `${fullTarget.includes('?') ? '&' : '?'}token=${encodeURIComponent(hostData.token)}`;
  }

  // Switch views
  hubView.classList.remove('active');
  sessionView.classList.add('active');

  // Load in Iframe
  pocketFrame.src = fullTarget;

  // Setup Theme Injection once frame loads
  pocketFrame.onload = () => {
    try {
      if (state.settings.deepseekTheme) {
        // Attempt cross-origin or same-origin injection
        injectDeepSeekThemeToFrame(pocketFrame);
      }
    } catch (e) {
      console.warn('Iframe injection note:', e);
    }
  };
}

async function injectDeepSeekThemeToFrame(frame) {
  try {
    const frameDoc = frame.contentDocument || frame.contentWindow.document;
    if (!frameDoc) return;

    // Fetch theme CSS and JS text
    const cssRes = await fetch('/src/injector/deepseek-theme.css');
    const cssText = await cssRes.text();

    const style = frameDoc.createElement('style');
    style.id = 'deepseek-mobile-injected-style';
    style.textContent = cssText;
    frameDoc.head.appendChild(style);

    const script = frameDoc.createElement('script');
    script.src = '/src/injector/deepseek-injector.js';
    frameDoc.body.appendChild(script);
  } catch (err) {
    // Cross-origin fallback info
    console.log('Cross-origin frame rendered safely.');
  }
}

function closeSession() {
  pocketFrame.src = 'about:blank';
  sessionView.classList.remove('active');
  hubView.classList.add('active');
  floatingMenu.classList.remove('active');
  renderHistory();
}

// Global Actions attached to window for inline events
window.appConnectTo = function (id) {
  const host = state.hosts.find(h => h.id === id);
  if (host) openSession(host);
};

window.appDeleteHost = function (id, event) {
  event.stopPropagation();
  state.deleteHost(id);
  renderHistory();
};

// Event Listeners
document.getElementById('btn-open-scanner').addEventListener('click', async () => {
  scannerModal.classList.add('active');
  if (!scanner) {
    scanner = new QrScannerManager(scannerVideo, scannerCanvas, (parsed) => {
      scannerModal.classList.remove('active');
      openSession({
        name: parsed.isLan ? '扫描的局域网设备' : '扫描的公网隧道',
        url: parsed.url,
        token: parsed.token,
        isLan: parsed.isLan
      });
    });
  }
  const res = await scanner.startCamera();
  if (!res.success) {
    alert('未能开启摄像头：' + res.error + '\n请使用相册图片或手动输入');
    fileInput.click();
  }
});

document.getElementById('btn-close-scanner').addEventListener('click', () => {
  if (scanner) scanner.stopCamera();
  scannerModal.classList.remove('active');
});

fileInput.addEventListener('change', async (e) => {
  if (e.target.files && e.target.files[0]) {
    try {
      if (!scanner) {
        scanner = new QrScannerManager(scannerVideo, scannerCanvas, null);
      }
      const res = await scanner.scanImageFile(e.target.files[0]);
      if (res && res.parsed) {
        scannerModal.classList.remove('active');
        openSession({
          name: res.parsed.isLan ? '相册识别局域网' : '相册识别公网',
          url: res.parsed.url,
          token: res.parsed.token,
          isLan: res.parsed.isLan
        });
      }
    } catch (err) {
      alert(err.message || '二维码识别失败');
    }
  }
});

btnManualConnect.addEventListener('click', () => {
  const url = connectUrlInput.value.trim();
  const token = connectPinInput.value.trim();
  const name = connectNameInput.value.trim();

  if (!url) {
    alert('请输入 DSH Pocket 访问网址或 IP:端口');
    return;
  }

  const parsed = parsePocketUrl(url);
  const finalUrl = parsed ? parsed.url : (url.startsWith('http') ? url : `http://${url}`);
  const finalToken = token || (parsed ? parsed.token : '');
  const isLan = parsed ? parsed.isLan : !finalUrl.includes('trycloudflare.com');

  openSession({
    name: name || (isLan ? '局域网设备' : '公网设备'),
    url: finalUrl,
    token: finalToken,
    isLan: isLan
  });
});

// Floating Controller Ball
floatingBall.addEventListener('click', () => {
  floatingMenu.classList.toggle('active');
});

document.getElementById('menu-reload').addEventListener('click', () => {
  pocketFrame.contentWindow.location.reload();
  floatingMenu.classList.remove('active');
});

document.getElementById('menu-home').addEventListener('click', () => {
  closeSession();
});

document.getElementById('menu-theme-toggle').addEventListener('click', () => {
  state.settings.deepseekTheme = !state.settings.deepseekTheme;
  state.updateSettings({ deepseekTheme: state.settings.deepseekTheme });
  alert(`DeepSeek 布局美化已${state.settings.deepseekTheme ? '开启' : '关闭'}`);
  pocketFrame.contentWindow.location.reload();
  floatingMenu.classList.remove('active');
});

// Init
renderHistory();
