/* ==============================================================================
   LIGHT / DARK THEME MANAGER
   ============================================================================== */

(function () {
  const THEME_KEY = 'rsvp_theme_preference';

  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
      return saved;
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.classList.remove('dark-theme');
    }
    updateToggleIcons(theme);
  }

  function updateToggleIcons(theme) {
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      }
    });
  }

  window.toggleTheme = function () {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    if (window.showToast) {
      window.showToast(`Modo ${next === 'dark' ? 'Escuro' : 'Claro'} ativado.`, 'info');
    }
  };

  // Inicializar tema antes da renderização total do DOM
  applyTheme(getPreferredTheme());

  document.addEventListener('DOMContentLoaded', () => {
    updateToggleIcons(getPreferredTheme());
  });
})();
