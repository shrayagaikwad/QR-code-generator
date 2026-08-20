/* generator.js — dynamic forms, QR generation, customization, downloads */

const Generator = (() => {

  const FIELD_DEFS = {
    url: [
      { key:'url', label:'Website URL', type:'url', placeholder:'example.com', wide:true, required:true }
    ],
    text: [
      { key:'text', label:'Plain text', type:'textarea', placeholder:'Anything you want encoded…', wide:true, required:true }
    ],
    email: [
      { key:'email', label:'Email address', type:'email', placeholder:'name@example.com', required:true },
      { key:'subject', label:'Subject (optional)', type:'text', placeholder:'Say hello' },
      { key:'body', label:'Message (optional)', type:'textarea', placeholder:'Message body…', wide:true }
    ],
    phone: [
      { key:'phone', label:'Phone number', type:'tel', placeholder:'+91 1234567890', wide:true, required:true }
    ],
    sms: [
      { key:'phone', label:'Phone number', type:'tel', placeholder:'+91 1234567890', required:true },
      { key:'message', label:'Message (optional)', type:'textarea', placeholder:'Pre-filled text…', wide:true }
    ],
    wifi: [
      { key:'ssid', label:'Network name (SSID)', type:'text', placeholder:'Home-WiFi', required:true },
      { key:'password', label:'Password', type:'text', placeholder:'••••••••' },
      { key:'security', label:'Security', type:'select', options:[['WPA','WPA/WPA2'],['WEP','WEP'],['nopass','None']] },
      { key:'hidden', label:'Hidden network', type:'checkbox', wide:true }
    ],
    vcard: [
      { key:'name', label:'Full name', type:'text', placeholder:'Shraya Gaikwad', required:true },
      { key:'org', label:'Organization', type:'text', placeholder:'Google' },
      { key:'title', label:'Job title', type:'text', placeholder:'Web Developer' },
      { key:'phone', label:'Phone', type:'tel', placeholder:'+91 1234567890' },
      { key:'email', label:'Email', type:'email', placeholder:'shraya@example.com' },
      { key:'website', label:'Website', type:'url', placeholder:'example.com' },
      { key:'address', label:'Address', type:'text', placeholder:'Street, City, District', wide:true }
    ],
    social: [
      { key:'platform', label:'Platform', type:'select', options:[['instagram','Instagram'],['x','X / Twitter'],['facebook','Facebook'],['linkedin','LinkedIn'],['tiktok','TikTok'],['youtube','YouTube'],['other','Other']] },
      { key:'socialUrl', label:'Profile URL', type:'url', placeholder:'instagram.com/yourname', wide:true, required:true }
    ]
  };

  const TYPE_LABELS = {
    url:'URL', text:'Text', email:'Email', phone:'Phone', sms:'SMS',
    wifi:'Wi-Fi', vcard:'Contact', social:'Social'
  };

  let state = {
    type: 'url',
    fields: {},
    logoDataUrl: null,
    currentId: null,
    currentContent: '',
    favorite: false
  };

  let qrCode = null;
  let els = {};

  function cacheEls(){
    els = {
      typeTabs: document.getElementById('typeTabs'),
      dynamicFields: document.getElementById('dynamicFields'),
      qrCanvas: document.getElementById('qrCanvas'),
      qrZoomCanvas: document.getElementById('qrZoomCanvas'),
      optSize: document.getElementById('optSize'),
      sizeValue: document.getElementById('sizeValue'),
      optMargin: document.getElementById('optMargin'),
      marginValue: document.getElementById('marginValue'),
      optFg: document.getElementById('optFg'),
      optBg: document.getElementById('optBg'),
      optEcl: document.getElementById('optEcl'),
      optDots: document.getElementById('optDots'),
      optLogo: document.getElementById('optLogo'),
      clearLogo: document.getElementById('clearLogo'),
      metaType: document.getElementById('metaType'),
      metaContent: document.getElementById('metaContent'),
      metaDate: document.getElementById('metaDate'),
      btnDownloadPng: document.getElementById('btnDownloadPng'),
      btnDownloadSvg: document.getElementById('btnDownloadSvg'),
      btnPrint: document.getElementById('btnPrint'),
      btnCopy: document.getElementById('btnCopy'),
      btnFavorite: document.getElementById('btnFavorite'),
      genHint: document.getElementById('genHint'),
      zoomBtn: document.getElementById('zoomBtn'),
      zoomOverlay: document.getElementById('zoomOverlay'),
      zoomClose: document.getElementById('zoomClose')
    };
  }

  function renderFields(type){
    const defs = FIELD_DEFS[type] || [];
    let html = '<div class="form-row">';
    defs.forEach(f => {
      const wideClass = f.wide ? ' field--wide' : '';
      html += `<label class="field${wideClass}" data-key="${f.key}">`;
      if(f.type !== 'checkbox'){
        html += `<span class="field-label">${f.label}${f.required ? ' *' : ''}</span>`;
      }
      if(f.type === 'textarea'){
        html += `<textarea name="${f.key}" placeholder="${f.placeholder || ''}"></textarea>`;
      }else if(f.type === 'select'){
        html += `<select name="${f.key}">` + f.options.map(([v,l]) => `<option value="${v}">${l}</option>`).join('') + `</select>`;
      }else if(f.type === 'checkbox'){
        html += `<span class="checkbox-field"><input type="checkbox" name="${f.key}"> ${f.label}</span>`;
      }else{
        html += `<input type="${f.type}" name="${f.key}" placeholder="${f.placeholder || ''}">`;
      }
      html += `</label>`;
    });
    html += '</div>';
    els.dynamicFields.innerHTML = html;

    els.dynamicFields.querySelectorAll('input, textarea, select').forEach(input => {
      const evt = (input.type === 'checkbox' || input.tagName === 'SELECT') ? 'change' : 'input';
      input.addEventListener(evt, handleFieldChange);
    });

    state.fields = {};
  }

  function readFields(){
    const defs = FIELD_DEFS[state.type] || [];
    const values = {};
    defs.forEach(f => {
      const input = els.dynamicFields.querySelector(`[name="${f.key}"]`);
      if(!input) return;
      values[f.key] = f.type === 'checkbox' ? input.checked : input.value;
    });
    return values;
  }

  function handleFieldChange(){
    state.fields = readFields();
    scheduleRegenerate();
  }

  const scheduleRegenerate = Utils.debounce(regenerate, 450);

  function currentContentPreview(){
    return Utils.buildContent(state.type, state.fields);
  }

  function regenerate(){
    const content = currentContentPreview();
    state.currentContent = content;

    els.metaType.textContent = TYPE_LABELS[state.type];
    els.metaContent.textContent = content ? Utils.truncate(content, 42) : '—';
    els.metaDate.textContent = Utils.formatDate(Utils.nowISO());

    const hasRequired = (FIELD_DEFS[state.type] || []).filter(f => f.required)
      .every(f => state.fields[f.key] && String(state.fields[f.key]).trim());

    if(!content || !hasRequired){
      els.genHint.textContent = 'Fill in the required fields to generate a code.';
      renderPlaceholder();
      setActionsEnabled(false);
      return;
    }

    els.genHint.textContent = '';
    setActionsEnabled(true);
    drawQr(content);
    persistCurrent(content);
  }

  function renderPlaceholder(){
    els.qrCanvas.innerHTML = '<div style="width:180px;height:180px;border:1px dashed var(--line);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--ink-soft);font-family:var(--font-display);font-size:11px;text-align:center;padding:10px;">Waiting for content</div>';
  }

  function setActionsEnabled(enabled){
    [els.btnDownloadPng, els.btnDownloadSvg, els.btnPrint, els.btnCopy, els.btnFavorite].forEach(btn => {
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? '1' : '0.5';
      btn.style.pointerEvents = enabled ? 'auto' : 'none';
    });
  }

  function buildOptions(content, size){
    return {
      width: size,
      height: size,
      type: 'canvas',
      data: content,
      margin: Number(els.optMargin.value),
      qrOptions: { errorCorrectionLevel: els.optEcl.value },
      dotsOptions: { color: els.optFg.value, type: els.optDots.value },
      cornersSquareOptions: { color: els.optFg.value },
      cornersDotOptions: { color: els.optFg.value },
      backgroundOptions: { color: els.optBg.value },
      image: state.logoDataUrl || undefined,
      imageOptions: { crossOrigin: 'anonymous', margin: 6, imageSize: 0.35 }
    };
  }

  function drawQr(content){
    const size = Number(els.optSize.value);
    const options = buildOptions(content, size);

    if(!qrCode){
      qrCode = new QRCodeStyling(options);
      els.qrCanvas.innerHTML = '';
      qrCode.append(els.qrCanvas);
    }else{
      qrCode.update(options);
    }
  }

  function persistCurrent(content){
    if(!state.currentId) state.currentId = Utils.uid();
    const item = {
      id: state.currentId,
      type: state.type,
      fields: state.fields,
      content,
      favorite: state.favorite,
      downloadCount: (Storage.getHistory().find(i => i.id === state.currentId) || {}).downloadCount || 0,
      createdAt: Utils.nowISO()
    };
    Storage.upsertHistoryItem(item);
    if(window.App) window.App.refreshDashboardAndHistory();
  }

  /* ---------------- Type switching ---------------- */

  function switchType(type){
    state.type = type;
    state.currentId = null;
    state.favorite = false;
    updateFavoriteButton();
    els.typeTabs.querySelectorAll('.type-tab').forEach(tab => {
      tab.classList.toggle('is-active', tab.dataset.type === type);
    });
    renderFields(type);
    regenerate();
  }

  /* ---------------- Customize option listeners ---------------- */

  function bindCustomizeControls(){
    els.optSize.addEventListener('input', () => {
      els.sizeValue.textContent = els.optSize.value;
      scheduleRegenerate();
    });
    els.optMargin.addEventListener('input', () => {
      els.marginValue.textContent = els.optMargin.value;
      scheduleRegenerate();
    });
    [els.optFg, els.optBg, els.optEcl, els.optDots].forEach(el => {
      el.addEventListener('input', scheduleRegenerate);
      el.addEventListener('change', scheduleRegenerate);
    });

    els.optLogo.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      state.logoDataUrl = await Utils.readFileAsDataURL(file);
      regenerate();
    });

    els.clearLogo.addEventListener('click', () => {
      state.logoDataUrl = null;
      els.optLogo.value = '';
      regenerate();
    });
  }

  /* ---------------- Download / print / copy ---------------- */

  function recordDownload(format){
    if(!state.currentId) return;
    Storage.incrementDownloadCount(state.currentId);
    Storage.addDownloadRecord({
      id: Utils.uid(),
      historyId: state.currentId,
      content: state.currentContent,
      type: state.type,
      format,
      when: Utils.nowISO()
    });
    if(window.App) window.App.refreshDashboardAndHistory();
  }

  function bindActions(){
    els.btnDownloadPng.addEventListener('click', () => {
      if(!qrCode) return;
      qrCode.download({ name: Utils.slugify(state.currentContent), extension: 'png' });
      recordDownload('PNG');
      Utils.toast('PNG downloaded');
    });

    els.btnDownloadSvg.addEventListener('click', () => {
      if(!qrCode) return;
      qrCode.download({ name: Utils.slugify(state.currentContent), extension: 'svg' });
      recordDownload('SVG');
      Utils.toast('SVG downloaded');
    });

    els.btnPrint.addEventListener('click', async () => {
      if(!qrCode) return;
      const blob = await qrCode.getRawData('png');
      const url = URL.createObjectURL(blob);
      const win = window.open('', '_blank', 'width=480,height=560');
      if(!win){ Utils.toast('Allow pop-ups to print'); return; }
      win.document.write(`<html><head><title>Print QR</title></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><img src="${url}" style="max-width:80%;" onload="window.print();"></body></html>`);
      win.document.close();
      recordDownload('Print');
    });

    els.btnCopy.addEventListener('click', async () => {
      if(!qrCode) return;
      try{
        const blob = await qrCode.getRawData('png');
        await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
        Utils.toast('Image copied to clipboard');
      }catch(err){
        Utils.toast('Copy is not supported in this browser');
      }
    });

    els.btnFavorite.addEventListener('click', () => {
      if(!state.currentId) return;
      const item = Storage.toggleFavorite(state.currentId);
      state.favorite = item ? !!item.favorite : false;
      updateFavoriteButton();
      if(window.App) window.App.refreshDashboardAndHistory();
    });

    els.zoomBtn.addEventListener('click', async () => {
      if(!qrCode) return;
      els.qrZoomCanvas.innerHTML = '';
      const zoomOptions = buildOptions(state.currentContent, 320);
      const zoomQr = new QRCodeStyling(zoomOptions);
      zoomQr.append(els.qrZoomCanvas);
      els.zoomOverlay.classList.add('is-open');
    });
    els.zoomClose.addEventListener('click', () => els.zoomOverlay.classList.remove('is-open'));
    els.zoomOverlay.addEventListener('click', (e) => {
      if(e.target === els.zoomOverlay) els.zoomOverlay.classList.remove('is-open');
    });
  }

  function updateFavoriteButton(){
    els.btnFavorite.setAttribute('aria-pressed', state.favorite ? 'true' : 'false');
    els.btnFavorite.textContent = state.favorite ? '★' : '☆';
  }

  /* ---------------- Load an item back from history ---------------- */

  function loadFromHistory(item){
    App.goToView('generator');
    state.type = item.type;
    state.currentId = item.id;
    state.favorite = !!item.favorite;
    els.typeTabs.querySelectorAll('.type-tab').forEach(tab => {
      tab.classList.toggle('is-active', tab.dataset.type === item.type);
    });
    renderFields(item.type);
    Object.entries(item.fields || {}).forEach(([key, val]) => {
      const input = els.dynamicFields.querySelector(`[name="${key}"]`);
      if(!input) return;
      if(input.type === 'checkbox') input.checked = !!val;
      else input.value = val;
    });
    state.fields = item.fields || {};
    updateFavoriteButton();
    regenerate();
    Utils.toast('Loaded into generator');
  }

  /* ---------------- Init ---------------- */

  function init(){
    cacheEls();
    els.typeTabs.querySelectorAll('.type-tab').forEach(tab => {
      tab.addEventListener('click', () => switchType(tab.dataset.type));
    });
    bindCustomizeControls();
    bindActions();
    renderFields(state.type);
    renderPlaceholder();
    setActionsEnabled(false);
    updateFavoriteButton();
  }

  return { init, loadFromHistory };
})();
