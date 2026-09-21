/**
 * DeepSeek Pocket Mobile Main Logic (Native Top-Level Navigation Engine)
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
  }

  saveHost(hostData) {
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
}

const state = new AppState();

// DOM Elements
const scannerModal = document.getElementById('scanner-modal');
const scannerVideo = document.getElementById('scanner-video');
const scannerCanvas = document.getElementById('scanner-canvas');
const fileInput = document.getElementById('qr-file-input');

const connectUrlInput = document.getElementById('connect-url');
const connectPinInput = document.getElementById('connect-pin');
const connectNameInput = document.getElementById('connect-name');
const btnManualConnect = document.getElementById('btn-manual-connect');
const historyList = document.getElementById('history-list');

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

function navigateToTarget(hostData) {
  state.saveHost(hostData);

  // Build target URL with token param
  let fullTarget = hostData.url;
  if (hostData.token && !fullTarget.includes('token=')) {
    fullTarget += `${fullTarget.includes('?') ? '&' : '?'}token=${encodeURIComponent(hostData.token)}`;
  }

  // Native top-level navigation: ensures WebSockets, Cookies, cleartext, and full app lifecycle work
  window.location.href = fullTarget;
}

// Global actions
window.appConnectTo = function (id) {
  const host = state.hosts.find(h => h.id === id);
  if (host) navigateToTarget(host);
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
      navigateToTarget({
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
        navigateToTarget({
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

  navigateToTarget({
    name: name || (isLan ? '局域网设备' : '公网设备'),
    url: finalUrl,
    token: finalToken,
    isLan: isLan
  });
});

// Init
renderHistory();
