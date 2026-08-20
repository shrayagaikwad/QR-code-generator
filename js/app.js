/* app.js — bootstraps the app, handles navigation & global chrome */

const App = (() => {

  let els = {};

  function cacheEls(){
    els = {
      body: document.body,
      nav: document.getElementById('mainNav'),
      views: document.querySelectorAll('.view'),
      sidebar: document.getElementById('sidebar'),
      hamburger: document.getElementById('hamburger'),
      themeToggle: document.getElementById('themeToggle'),
      themeToggleLabel: document.getElementById('themeToggleLabel'),
      settingsThemeSwitch: document.getElementById('settingsThemeSwitch'),
      btnExport: document.getElementById('btnExport'),
      importFile: document.getElementById('importFile'),
      btnClearHistory: document.getElementById('btnClearHistory')
    };
  }

  function goToView(name){
    els.views.forEach(v => v.classList.toggle('is-active', v.id === `view-${name}`));
    els.nav.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.view === name);
    });
    els.sidebar.classList.remove('is-open');
    if(name === 'history' || name === 'dashboard') History.refreshAll();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  function bindNav(){
    els.nav.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => goToView(btn.dataset.view));
    });
    document.querySelectorAll('[data-view-link]').forEach(btn => {
      btn.addEventListener('click', () => goToView(btn.dataset.viewLink));
    });
    els.hamburger.addEventListener('click', () => els.sidebar.classList.toggle('is-open'));
  }

  /* ---------------- Theme ---------------- */

  function applyTheme(theme){
    els.body.setAttribute('data-theme', theme);
    els.themeToggleLabel.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    els.settingsThemeSwitch.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
    Storage.saveSettings(Object.assign(Storage.getSettings(), { theme }));
  }

  function toggleTheme(){
    const current = els.body.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  function bindTheme(){
    els.themeToggle.addEventListener('click', toggleTheme);
    els.settingsThemeSwitch.addEventListener('click', toggleTheme);
  }

  /* ---------------- Settings: export / import / clear ---------------- */

  function bindSettingsActions(){
    els.btnExport.addEventListener('click', () => {
      const data = Storage.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      Utils.downloadBlob(blob, `codestub-export-${Date.now()}.json`);
      Utils.toast('History exported');
    });

    els.importFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      try{
        const text = await file.text();
        const data = JSON.parse(text);
        Storage.importAll(data);
        History.refreshAll();
        Utils.toast('History imported');
      }catch(err){
        Utils.toast('Could not read that file');
      }
      e.target.value = '';
    });

    els.btnClearHistory.addEventListener('click', () => {
      if(!confirm('Clear all saved QR history? This cannot be undone.')) return;
      Storage.clearHistory();
      History.refreshAll();
      Utils.toast('History cleared');
    });
  }

  /* ---------------- Public: called by Generator after any save ---------------- */

  function refreshDashboardAndHistory(){
    History.refreshAll();
  }

  function init(){
    cacheEls();
    bindNav();
    bindTheme();
    bindSettingsActions();

    const settings = Storage.getSettings();
    applyTheme(settings.theme === 'dark' ? 'dark' : 'light');

    Generator.init();
    History.init();
  }

  document.addEventListener('DOMContentLoaded', init);

  return { goToView, refreshDashboardAndHistory };
})();
