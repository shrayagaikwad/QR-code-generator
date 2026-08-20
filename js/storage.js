/* storage.js — all LocalStorage reads/writes live here */

const Storage = (() => {

  const KEYS = {
    history: 'codestub_history',
    downloads: 'codestub_downloads',
    settings: 'codestub_settings'
  };

  function _get(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){
      console.error('Storage read failed for', key, e);
      return fallback;
    }
  }

  function _set(key, value){
    try{
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }catch(e){
      console.error('Storage write failed for', key, e);
      return false;
    }
  }

  /* ---------------- History ---------------- */

  function getHistory(){
    return _get(KEYS.history, []);
  }

  function saveHistory(list){
    return _set(KEYS.history, list);
  }

  function upsertHistoryItem(item){
    const list = getHistory();
    const idx = list.findIndex(i => i.id === item.id);
    if(idx >= 0) list[idx] = item;
    else list.unshift(item);
    saveHistory(list);
    return item;
  }

  function deleteHistoryItem(id){
    const list = getHistory().filter(i => i.id !== id);
    saveHistory(list);
  }

  function toggleFavorite(id){
    const list = getHistory();
    const item = list.find(i => i.id === id);
    if(item){
      item.favorite = !item.favorite;
      saveHistory(list);
    }
    return item;
  }

  function incrementDownloadCount(id){
    const list = getHistory();
    const item = list.find(i => i.id === id);
    if(item){
      item.downloadCount = (item.downloadCount || 0) + 1;
      saveHistory(list);
    }
    return item;
  }

  function clearHistory(){
    saveHistory([]);
    saveDownloads([]);
  }

  /* ---------------- Downloads log ---------------- */

  function getDownloads(){
    return _get(KEYS.downloads, []);
  }

  function saveDownloads(list){
    return _set(KEYS.downloads, list);
  }

  function addDownloadRecord(record){
    const list = getDownloads();
    list.unshift(record);
    saveDownloads(list.slice(0, 200));
  }

  /* ---------------- Settings ---------------- */

  function getSettings(){
    return _get(KEYS.settings, { theme: 'light' });
  }

  function saveSettings(settings){
    return _set(KEYS.settings, settings);
  }

  /* ---------------- Import / export ---------------- */

  function exportAll(){
    return {
      exportedAt: Utils.nowISO(),
      history: getHistory(),
      downloads: getDownloads(),
      settings: getSettings()
    };
  }

  function importAll(data){
    if(!data || typeof data !== 'object') throw new Error('Invalid file');

    if(Array.isArray(data.history)){
      const existing = getHistory();
      const existingIds = new Set(existing.map(i => i.id));
      const merged = existing.concat(data.history.filter(i => i && i.id && !existingIds.has(i.id)));
      saveHistory(merged);
    }
    if(Array.isArray(data.downloads)){
      const existing = getDownloads();
      saveDownloads(existing.concat(data.downloads).slice(0, 200));
    }
    if(data.settings && typeof data.settings === 'object'){
      saveSettings(Object.assign(getSettings(), data.settings));
    }
  }

  return {
    getHistory, saveHistory, upsertHistoryItem, deleteHistoryItem,
    toggleFavorite, incrementDownloadCount, clearHistory,
    getDownloads, addDownloadRecord,
    getSettings, saveSettings,
    exportAll, importAll
  };
})();
