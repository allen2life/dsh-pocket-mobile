/**
 * DeepSeek Mobile App UI Injector Script
 * Dynamically enhances DSH Web into DeepSeek App format in real-time
 */

(function () {
  const SCRIPT_ID = 'deepseek-mobile-injector';
  if (window[SCRIPT_ID]) return;
  window[SCRIPT_ID] = true;

  console.log('[DeepSeek Mobile] Injector active');

  // 1. Inject Stylesheet if not present
  function injectStyles(cssContent) {
    if (document.getElementById('deepseek-theme-style')) return;
    const style = document.createElement('style');
    style.id = 'deepseek-theme-style';
    style.textContent = cssContent;
    document.head.appendChild(style);
  }

  // 2. Format Reasoning blocks into DeepSeek Mobile "DeepThink" Capsules
  function formatReasoningBlocks() {
    // Look for think blocks, reasoning wrappers, details, or custom tags
    const thinkElements = document.querySelectorAll('think, .think, [class*="reasoning"], details:not(.deepthink-capsule)');
    thinkElements.forEach(el => {
      if (el.classList.contains('deepthink-capsule')) return;

      if (el.tagName.toLowerCase() === 'details') {
        el.classList.add('deepthink-capsule');
        let summary = el.querySelector('summary');
        if (!summary) {
          summary = document.createElement('summary');
          summary.textContent = '已深度思考 (点击展开)';
          el.prepend(summary);
        } else if (!summary.textContent.includes('思考')) {
          summary.textContent = '深度思考过程';
        }
      } else if (el.tagName.toLowerCase() === 'think' || el.classList.contains('reasoning-block')) {
        // Convert plain think tag to details capsule
        const details = document.createElement('details');
        details.className = 'deepthink-capsule';
        const summary = document.createElement('summary');
        summary.textContent = '已深度思考 (点击展开)';
        const contentDiv = document.createElement('div');
        contentDiv.className = 'reasoning-content';
        contentDiv.innerHTML = el.innerHTML;

        details.appendChild(summary);
        details.appendChild(contentDiv);
        el.replaceWith(details);
      }
    });
  }

  // 3. Optimize Chat Input & Action Buttons
  function optimizeInputBar() {
    const inputArea = document.querySelector('textarea, input[type="text"][class*="chat"]');
    if (!inputArea || inputArea.dataset.dsOptimized) return;
    inputArea.dataset.dsOptimized = 'true';

    // Auto-resize textarea
    inputArea.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
  }

  // 4. Token & Session Persistence Helper
  function checkUrlToken() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('dsh_pocket_active_token', token);
      // Auto-fill token input on login screen if DSH pocket is prompting for password
      const pinInput = document.querySelector('input[type="password"], input[name="token"], input[placeholder*="密码"], input[placeholder*="PIN"]');
      if (pinInput && !pinInput.value) {
        pinInput.value = token;
        const submitBtn = pinInput.form ? pinInput.form.querySelector('button[type="submit"]') : pinInput.parentElement.querySelector('button');
        if (submitBtn) {
          setTimeout(() => submitBtn.click(), 100);
        }
      }
    }
  }

  // 5. Mutation Observer to continuously format new streaming messages
  const observer = new MutationObserver((mutations) => {
    formatReasoningBlocks();
    optimizeInputBar();
    checkUrlToken();
  });

  function init() {
    formatReasoningBlocks();
    optimizeInputBar();
    checkUrlToken();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.DeepSeekInjector = {
    injectStyles,
    formatReasoningBlocks,
    recheck: init
  };
})();
