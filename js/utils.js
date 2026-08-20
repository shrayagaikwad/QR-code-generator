/* utils.js — reusable helpers shared across modules */

const Utils = (() => {

  function uid(){
    return 'q_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function nowISO(){
    return new Date().toISOString();
  }

  function formatDate(iso){
    if(!iso) return '—';
    const d = new Date(iso);
    if(isNaN(d)) return '—';
    const pad = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function debounce(fn, wait){
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function escapeHtml(str){
    return String(str ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  // Escape reserved characters for vCard / Wi-Fi payloads
  function escapeField(str){
    return String(str ?? '').replace(/([\\;,:])/g, '\\$1');
  }

  function truncate(str, len = 60){
    str = String(str ?? '');
    return str.length > len ? str.slice(0, len - 1) + '…' : str;
  }

  /* ---------------- Content builders per QR type ---------------- */

  const ContentBuilders = {
    url(f){
      let v = (f.url || '').trim();
      if(v && !/^https?:\/\//i.test(v)) v = 'https://' + v;
      return v;
    },
    text(f){
      return (f.text || '').trim();
    },
    email(f){
      const params = [];
      if(f.subject) params.push('subject=' + encodeURIComponent(f.subject));
      if(f.body) params.push('body=' + encodeURIComponent(f.body));
      const qs = params.length ? '?' + params.join('&') : '';
      return f.email ? `mailto:${f.email.trim()}${qs}` : '';
    },
    phone(f){
      return f.phone ? `tel:${f.phone.trim()}` : '';
    },
    sms(f){
      if(!f.phone) return '';
      const body = f.message ? `?body=${encodeURIComponent(f.message)}` : '';
      return `sms:${f.phone.trim()}${body}`;
    },
    wifi(f){
      if(!f.ssid) return '';
      const type = f.security || 'WPA';
      const hidden = f.hidden ? 'true' : 'false';
      const pass = type === 'nopass' ? '' : `P:${escapeField(f.password || '')};`;
      return `WIFI:T:${type};S:${escapeField(f.ssid)};${pass}H:${hidden};;`;
    },
    vcard(f){
      if(!f.name) return '';
      const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
      lines.push(`FN:${escapeField(f.name)}`);
      if(f.org) lines.push(`ORG:${escapeField(f.org)}`);
      if(f.title) lines.push(`TITLE:${escapeField(f.title)}`);
      if(f.phone) lines.push(`TEL;TYPE=CELL:${escapeField(f.phone)}`);
      if(f.email) lines.push(`EMAIL:${escapeField(f.email)}`);
      if(f.website) lines.push(`URL:${escapeField(f.website)}`);
      if(f.address) lines.push(`ADR:;;${escapeField(f.address)};;;;`);
      lines.push('END:VCARD');
      return lines.join('\n');
    },
    social(f){
      let v = (f.socialUrl || '').trim();
      if(v && !/^https?:\/\//i.test(v)) v = 'https://' + v;
      return v;
    }
  };

  function buildContent(type, fields){
    const builder = ContentBuilders[type];
    return builder ? builder(fields) : '';
  }

  /* ---------------- Toast ---------------- */

  let toastTimer;
  function toast(message){
    const el = document.getElementById('toast');
    if(!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2400);
  }

  /* ---------------- File / download helpers ---------------- */

  function downloadDataUrl(dataUrl, filename){
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function readFileAsDataURL(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function slugify(str){
    return String(str || 'qr-code')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'qr-code';
  }

  return {
    uid, nowISO, formatDate, debounce, escapeHtml, truncate,
    buildContent, toast, downloadDataUrl, downloadBlob,
    readFileAsDataURL, slugify
  };
})();
