/*  history.js — dashboard stats, history table, search/filter/sort */

const History = (() => {

  const TYPE_LABELS = {
    url:'URL', text:'Text', email:'Email', phone:'Phone', sms:'SMS',
    wifi:'Wi-Fi', vcard:'Contact', social:'Social'
  };

  let els = {};

  function cacheEls(){
    els = {
      statTotal: document.getElementById('statTotal'),
      statFavorites: document.getElementById('statFavorites'),
      statDownloads: document.getElementById('statDownloads'),
      statTopType: document.getElementById('statTopType'),
      recentList: document.getElementById('recentList'),
      favoritesList: document.getElementById('favoritesList'),
      downloadTableBody: document.getElementById('downloadTableBody'),
      historyTableBody: document.getElementById('historyTableBody'),
      historySearch: document.getElementById('historySearch'),
      historyTypeFilter: document.getElementById('historyTypeFilter'),
      historyFavOnly: document.getElementById('historyFavOnly'),
      historySort: document.getElementById('historySort')
    };
  }

  /* ---------------- Dashboard ---------------- */

  function refreshDashboard(){
    const items = Storage.getHistory();
    const downloads = Storage.getDownloads();

    els.statTotal.textContent = items.length;
    els.statFavorites.textContent = items.filter(i => i.favorite).length;
    els.statDownloads.textContent = downloads.length;

    const typeCounts = {};
    items.forEach(i => { typeCounts[i.type] = (typeCounts[i.type] || 0) + 1; });
    const topType = Object.entries(typeCounts).sort((a,b) => b[1]-a[1])[0];
    els.statTopType.textContent = topType ? TYPE_LABELS[topType[0]] : '—';

    renderStubList(els.recentList, [...items].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5), 'Nothing printed yet. Head to the Generator to create your first code.');
    renderStubList(els.favoritesList, items.filter(i => i.favorite).slice(0,5), 'Star a code to pin it here.');

    if(downloads.length === 0){
      els.downloadTableBody.innerHTML = '<tr><td colspan="4" class="empty-note">No downloads recorded yet.</td></tr>';
    }else{
      els.downloadTableBody.innerHTML = downloads.slice(0,8).map(d => `
        <tr>
          <td><span class="truncate">${Utils.escapeHtml(Utils.truncate(d.content, 50))}</span></td>
          <td>${TYPE_LABELS[d.type] || d.type}</td>
          <td>${d.format}</td>
          <td>${Utils.formatDate(d.when)}</td>
        </tr>
      `).join('');
    }
  }

  function renderStubList(container, items, emptyMsg){
    if(!items.length){
      container.innerHTML = `<p class="empty-note">${emptyMsg}</p>`;
      return;
    }
    container.innerHTML = items.map(i => `
      <div class="stub-row">
        <div class="stub-row-main">
          <span class="stub-row-type">${TYPE_LABELS[i.type] || i.type}</span>
          <span class="stub-row-content">${Utils.escapeHtml(Utils.truncate(i.content, 40))}</span>
        </div>
        <span class="stub-row-date">${Utils.formatDate(i.createdAt)}</span>
      </div>
    `).join('');
  }

  /* ---------------- History table ---------------- */

  function getFilteredHistory(){
    let items = Storage.getHistory();
    const q = (els.historySearch.value || '').trim().toLowerCase();
    const type = els.historyTypeFilter.value;
    const favOnly = els.historyFavOnly.checked;
    const sort = els.historySort.value;

    if(q) items = items.filter(i => (i.content || '').toLowerCase().includes(q));
    if(type !== 'all') items = items.filter(i => i.type === type);
    if(favOnly) items = items.filter(i => i.favorite);

    if(sort === 'alpha'){
      items = [...items].sort((a,b) => (a.content||'').localeCompare(b.content||''));
    }else{
      items = [...items].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return items;
  }

  function refreshHistoryTable(){
    const items = getFilteredHistory();
    if(!items.length){
      els.historyTableBody.innerHTML = '<tr><td colspan="6" class="empty-note">No matching history.</td></tr>';
      return;
    }
    els.historyTableBody.innerHTML = items.map(i => `
      <tr data-id="${i.id}">
        <td><button class="icon-toggle-btn fav-toggle" aria-pressed="${!!i.favorite}" title="Toggle favorite" style="width:32px;height:32px;font-size:15px;">${i.favorite ? '★' : '☆'}</button></td>
        <td><span class="truncate">${Utils.escapeHtml(Utils.truncate(i.content, 60))}</span></td>
        <td>${TYPE_LABELS[i.type] || i.type}</td>
        <td>${Utils.formatDate(i.createdAt)}</td>
        <td>${i.downloadCount || 0}</td>
        <td style="white-space:nowrap;">
          <button class="link-btn load-item" style="margin-right:10px;">Load</button>
          <button class="link-btn delete-item" style="color:var(--scan-red);">Delete</button>
        </td>
      </tr>
    `).join('');

    els.historyTableBody.querySelectorAll('.fav-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('tr').dataset.id;
        Storage.toggleFavorite(id);
        refreshAll();
      });
    });
    els.historyTableBody.querySelectorAll('.load-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('tr').dataset.id;
        const item = Storage.getHistory().find(i => i.id === id);
        if(item) Generator.loadFromHistory(item);
      });
    });
    els.historyTableBody.querySelectorAll('.delete-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('tr').dataset.id;
        Storage.deleteHistoryItem(id);
        Utils.toast('Entry deleted');
        refreshAll();
      });
    });
  }

  function refreshAll(){
    refreshDashboard();
    refreshHistoryTable();
  }

  function bindControls(){
    els.historySearch.addEventListener('input', Utils.debounce(refreshHistoryTable, 200));
    els.historyTypeFilter.addEventListener('change', refreshHistoryTable);
    els.historyFavOnly.addEventListener('change', refreshHistoryTable);
    els.historySort.addEventListener('change', refreshHistoryTable);
  }

  function init(){
    cacheEls();
    bindControls();
    refreshAll();
  }

  return { init, refreshAll };
})();
