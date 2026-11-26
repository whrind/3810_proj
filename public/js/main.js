document.addEventListener('DOMContentLoaded', () => {
  // 1. Dark / Light Theme Toggle
  const root = document.documentElement;
  const themeBtn = document.getElementById('themeToggleBtn');

  function updateThemeIcon(theme) {
    if (!themeBtn) return;
    themeBtn.innerHTML =
      theme === 'light'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    themeBtn.setAttribute('title', theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode');
  }

  const savedTheme = localStorage.getItem('trailmate_theme_v2') || 'light';
  root.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      localStorage.setItem('trailmate_theme_v2', next);
      updateThemeIcon(next);
    });
  }

  // 2. Trilingual Translation Engine (EN / zh-HK / zh-CN)
  const langSelect = document.getElementById('langSelect');
  const dict = window.TRAILMATE_I18N || {};

  function applyLanguage(lang) {
    const pack = dict[lang] || dict.en || {};
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (pack[key]) {
        el.textContent = pack[key];
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (pack[key]) {
        el.setAttribute('placeholder', pack[key]);
      }
    });
    document.documentElement.lang = lang;
  }

  const savedLang = localStorage.getItem('trailmate_lang') || 'en';
  if (langSelect) {
    langSelect.value = savedLang;
    langSelect.addEventListener('change', (e) => {
      const chosen = e.target.value;
      localStorage.setItem('trailmate_lang', chosen);
      applyLanguage(chosen);
    });
  }
  applyLanguage(savedLang);

  // 3. Forum Quick Date-Range Presets
  document.querySelectorAll('[data-date-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-date-preset');
      const fromInput = document.getElementById('dateFrom');
      const toInput = document.getElementById('dateTo');
      if (!fromInput || !toInput) return;

      // Hong Kong is UTC+8 year-round.
      const today = new Date(Date.now() + 8 * 60 * 60 * 1000);
      const fmt = (date) => date.toISOString().slice(0, 10);

      if (preset === 'all') {
        fromInput.value = '';
        toInput.value = '';
      } else if (preset === 'today') {
        fromInput.value = fmt(today);
        toInput.value = fmt(today);
      } else if (preset === '7d') {
        const past = new Date(today);
        past.setUTCDate(past.getUTCDate() - 6);
        fromInput.value = fmt(past);
        toInput.value = fmt(today);
      } else if (preset === '30d') {
        const past = new Date(today);
        past.setUTCDate(past.getUTCDate() - 29);
        fromInput.value = fmt(past);
        toInput.value = fmt(today);
      }
      const form = fromInput.closest('form');
      if (form) form.submit();
    });
  });

  // 4. Flash Banner Auto-Dismiss
  const flashBanner = document.querySelector('.flash');
  if (flashBanner) {
    const closeBtn = flashBanner.querySelector('.flash-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => flashBanner.remove());
    }
    setTimeout(() => {
      if (flashBanner && flashBanner.parentNode) {
        flashBanner.style.transition = 'opacity 0.4s ease';
        flashBanner.style.opacity = '0';
        setTimeout(() => flashBanner.remove(), 400);
      }
    }, 5000);
  }

  // 5. Quick-Fill Demo Credentials on Login
  document.querySelectorAll('[data-demo-user]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const userField = document.getElementById('username');
      const passField = document.getElementById('password');
      if (userField && passField) {
        userField.value = btn.getAttribute('data-demo-user');
        passField.value = btn.getAttribute('data-demo-pass');
      }
    });
  });

  // 6. Delete Confirmation Prompt
  document.querySelectorAll('form[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      const message = form.getAttribute('data-confirm') || 'Are you sure you want to delete this record?';
      if (!window.confirm(message)) {
        e.preventDefault();
      }
    });
  });
});
