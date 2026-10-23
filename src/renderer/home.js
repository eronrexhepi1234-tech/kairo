// "Zuhause" page: smart lights — add, control, scenes.
window.Home = (function () {
  const $ = id => document.getElementById(id);
  let devices = [];
  const SWATCHES = ['#ff2020', '#ff7a10', '#ffd000', '#20e040', '#20e0d0', '#2050ff', '#9b30ff', '#ff40b0', 'kelvin:2700', 'kelvin:5500'];
  const SCENES = [['gaming', '🎮'], ['lernen', '📚'], ['film', '🎬'], ['chill', '🌅'], ['party', '🎉'], ['schlafen', '🌙'], ['morgen', '☀️'], ['aus', '⏻']];
  const BRANDS = [
    { id: 'hue', name: 'Philips Hue', icon: '💡', how: 'auto', hint: 'home.hintHue' },
    { id: 'wiz', name: 'WiZ', icon: '🔆', how: 'auto', hint: 'home.hintWiz' },
    { id: 'govee', name: 'Govee', icon: '🌈', how: 'auto', hint: 'home.hintGovee' },
    { id: 'yeelight', name: 'Yeelight / Xiaomi', icon: '🏮', how: 'auto', hint: 'home.hintYee' },
    { id: 'lifx', name: 'LIFX', icon: '✨', how: 'token' },
    { id: 'ha', name: 'Home Assistant', icon: '🏠', how: 'ha', hint: 'home.hintHa' },
    { id: 'tuya', name: 'Tuya / Smart Life / IKEA', icon: '📱', how: 'ha', hint: 'home.hintTuya' }
  ];

  // what the lamp looks like on screen
  function look(d) {
    const st = d.state || {};
    if (!st.on) return { glow: 'transparent', core: 'var(--bg3)' };
    let col = st.color || '#ffd9a0';
    if (String(col).startsWith('kelvin:')) { const k = +col.slice(7); col = k < 3200 ? '#ffc078' : k < 4800 ? '#ffe2b8' : '#e8f0ff'; }
    const a = Math.round(40 + (st.brightness || 70) * 1.6).toString(16).padStart(2, '0');
    return { glow: col + a, core: col };
  }

  function render() {
    const root = $('homeRoot');
    const scenes = `<div class="home-scenes">${SCENES.map(([k, ico]) => `<button class="scene-btn" data-scene="${k}"><span>${ico}</span>${t('scene.' + k)}</button>`).join('')}</div>`;
    const head = `<div class="home-head"><div><h2>${t('nav.home')}</h2><p class="muted">${t('home.sub')}</p></div>
      <div class="row"><button class="btn" id="homeDemo">🧪 ${t('home.demo')}</button><button class="btn primary" id="homeAdd">+ ${t('home.add')}</button></div></div>`;
    if (!devices.length) {
      root.innerHTML = head + `<div class="home-empty"><div class="bulb-big"><i></i></div><h3>${t('home.emptyH')}</h3><p class="muted">${t('home.empty')}</p>
        <div class="row" style="justify-content:center"><button class="btn primary" id="homeAdd2">+ ${t('home.add')}</button><button class="btn" id="homeDemo2">🧪 ${t('home.demo')}</button></div></div>`;
    } else {
      root.innerHTML = head + scenes + `<div class="home-grid">${devices.map((d, i) => {
        const l = look(d);
        return `<div class="lamp ${d.state?.on ? 'on' : ''}" data-id="${d.id}" style="--glow:${l.glow};--core:${l.core};animation-delay:${i * 40}ms">
          <div class="lamp-top">
            <button class="lamp-bulb" data-act="toggle" title="An/Aus"><i></i></button>
            <div class="lamp-name"><b data-act="rename" title="${t('home.rename')}">${escAttr(d.name)}</b><small>${[d.room, d.brand === 'ha' ? 'Home Assistant' : d.brand].filter(Boolean).map(escAttr).join(' · ')}</small></div>
            <label class="tog"><input type="checkbox" data-act="power" ${d.state?.on ? 'checked' : ''}><span></span></label>
          </div>
          <input type="range" min="1" max="100" value="${d.state?.brightness || 70}" data-act="bright">
          <div class="lamp-colors">${SWATCHES.map(c => `<button class="lc" data-color="${c}" style="background:${c.startsWith('kelvin') ? (c === 'kelvin:2700' ? 'linear-gradient(135deg,#ffb35c,#ffe0b0)' : 'linear-gradient(135deg,#ffffff,#cfe0ff)') : c}" title="${c}"></button>`).join('')}
            <input type="color" data-act="pick" value="${String(d.state?.color || '#ffffff').startsWith('#') ? d.state.color : '#ffffff'}"></div>
          <button class="lamp-x" data-act="remove" title="${t('home.remove')}">✕</button>
        </div>`;
      }).join('')}</div>`;
    }
    wire();
  }

  async function control(target, cmd) {
    const r = await window.kairo.home.control(target, cmd);
    if (!r.ok) { toast(r.error.message); return r; }
    devices = r.devices;
    const bad = r.results.filter(x => !x.ok);
    if (bad.length) toast('✕ ' + bad.map(b => `${b.name}: ${b.error}`).join(' · '));
    render();
    return r;
  }

  function wire() {
    const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
    on('homeAdd', wizard); on('homeAdd2', wizard);
    on('homeDemo', addDemo); on('homeDemo2', addDemo);
    document.querySelectorAll('.scene-btn').forEach(b => b.onclick = () => control('all', { scene: b.dataset.scene }));
    document.querySelectorAll('.lamp').forEach(card => {
      const id = card.dataset.id, dev = devices.find(d => d.id === id);
      card.querySelector('[data-act=toggle]').onclick = () => control(id, { on: !dev.state?.on });
      card.querySelector('[data-act=power]').onchange = e => control(id, { on: e.target.checked });
      card.querySelector('[data-act=bright]').onchange = e => control(id, { brightness: +e.target.value });
      card.querySelector('[data-act=pick]').onchange = e => control(id, { color: e.target.value });
      card.querySelectorAll('[data-color]').forEach(b => b.onclick = () => control(id, { color: b.dataset.color }));
      card.querySelector('[data-act=remove]').onclick = async () => { await window.kairo.home.remove(id); refresh(); };
      card.querySelector('[data-act=rename]').ondblclick = card.querySelector('[data-act=rename]').onclick = () => {
        Today.modal(`<h2>${t('home.rename')}</h2><input class="field" id="hmName" value="${escAttr(dev.name)}"><input class="field" id="hmRoom" value="${escAttr(dev.room || '')}" placeholder="${t('home.room')}" style="margin-top:8px">
          <div class="row"><span style="flex:1"></span><button class="btn" data-close>${t('today.cancel')}</button><button class="btn primary" id="hmSave">OK</button></div>`);
        document.querySelector('#modalBox [data-close]').onclick = Today.closeModal;
        $('hmSave').onclick = async () => { await window.kairo.home.update(id, { name: $('hmName').value.trim() || dev.name, room: $('hmRoom').value.trim() }); Today.closeModal(); refresh(); };
      };
    });
  }

  async function addDemo() { await window.kairo.home.demo(); refresh(); toast('🧪 ' + t('home.demoAdded')); }

  // ---------- add-device wizard ----------
  function wizard() {
    Today.modal(`<h2>${t('home.add')}</h2><p class="muted">${t('home.which')}</p>
      <div class="brand-grid">${BRANDS.map(b => `<button class="brand-card" data-b="${b.id}"><span>${b.icon}</span>${b.name}</button>`).join('')}</div>
      <div class="row"><button class="btn" id="hwScan">🔍 ${t('home.scanAll')}</button><span style="flex:1"></span><button class="btn" data-close>${t('today.cancel')}</button></div>`);
    document.querySelector('#modalBox [data-close]').onclick = Today.closeModal;
    $('hwScan').onclick = () => scan(null);
    document.querySelectorAll('.brand-card').forEach(c => c.onclick = () => brandStep(BRANDS.find(b => b.id === c.dataset.b)));
  }

  function brandStep(b) {
    if (b.how === 'auto') return scan(b);
    if (b.how === 'token') {
      Today.modal(`<h2>${b.icon} ${b.name}</h2><p>${t('home.lifxHow')} <a href="https://cloud.lifx.com/settings" data-ext>cloud.lifx.com/settings ↗</a></p>
        <input class="field" id="hwTok" type="password" placeholder="Token">
        <div class="row"><button class="btn" id="hwBack">←</button><span style="flex:1"></span><button class="btn primary" id="hwGo">${t('home.connect')}</button></div>`);
      $('hwBack').onclick = wizard;
      $('hwGo').onclick = async () => { const r = await window.kairo.home.lifx($('hwTok').value.trim()); done(r); };
      return;
    }
    Today.modal(`<h2>${b.icon} ${b.name}</h2><p>${t(b.hint)}</p>
      <input class="field" id="hwUrl" placeholder="http://homeassistant.local:8123">
      <input class="field" id="hwTok" type="password" placeholder="Long-lived access token" style="margin-top:8px">
      <p class="muted small">${t('home.haToken')}</p>
      <div class="row"><button class="btn" id="hwBack">←</button><span style="flex:1"></span><button class="btn primary" id="hwGo">${t('home.connect')}</button></div>`);
    $('hwBack').onclick = wizard;
    $('hwGo').onclick = async () => { const r = await window.kairo.home.ha($('hwUrl').value.trim(), $('hwTok').value.trim()); done(r); };
  }

  async function scan(b) {
    Today.modal(`<h2>🔍 ${b ? b.name : t('home.scanAll')}</h2>${b?.hint ? `<p class="note">${t(b.hint)}</p>` : ''}
      <div class="msg-status">${t('home.scanning')}</div><p class="muted small">${t('home.firewall')}</p>`);
    const r = await window.kairo.home.discover();
    let found = r.ok ? r.found : [];
    if (b) found = found.filter(f => f.brand === b.id || (b.id === 'hue' && f.brand === 'hue-bridge'));
    Today.modal(`<h2>🔍 ${b ? b.name : t('home.scanAll')}</h2>
      ${found.length ? `<div class="found-list">${found.map((f, i) => `<div class="found"><span>${f.brand === 'hue-bridge' ? '💡' : '🔆'}</span><div><b>${escAttr(f.name)}</b><small>${escAttr(f.ip)}</small></div>
        ${f.added ? `<span class="muted small">✓</span>` : `<button class="btn sm primary" data-i="${i}">${f.brand === 'hue-bridge' ? t('home.pair') : t('home.addOne')}</button>`}</div>`).join('')}</div>`
        : `<p>${t('home.nothing')}</p>`}
      <details><summary>${t('home.manual')}</summary>
        <div class="row"><select class="field" id="hwBrand" style="width:auto"><option value="wiz">WiZ</option><option value="govee">Govee</option><option value="yeelight">Yeelight</option><option value="hue-bridge">Hue Bridge</option></select>
        <input class="field" id="hwIp" placeholder="192.168.1.50" style="flex:1"><button class="btn" id="hwIpGo">+</button></div></details>
      <div class="row"><button class="btn" id="hwBack">←</button><button class="btn" id="hwAgain">🔍 ${t('home.again')}</button><span style="flex:1"></span><button class="btn" data-close>${t('home.close')}</button></div>`);
    document.querySelector('#modalBox [data-close]').onclick = () => { Today.closeModal(); refresh(); };
    $('hwBack').onclick = wizard;
    $('hwAgain').onclick = () => scan(b);
    const addFound = async f => {
      if (f.brand === 'hue-bridge') {
        const res = await window.kairo.home.pairHue(f.ip);
        if (!res.ok) { toast(res.error.message); return; }
        toast(`💡 ${res.added} ${t('home.lampsAdded')}`);
      } else {
        await window.kairo.home.add({ brand: f.brand, ip: f.ip, name: f.name, mac: f.mac });
        toast('✓ ' + f.name);
      }
      refresh();
    };
    document.querySelectorAll('.found [data-i]').forEach(btn => btn.onclick = async () => { btn.disabled = true; await addFound(found[+btn.dataset.i]); btn.textContent = '✓'; });
    $('hwIpGo').onclick = () => { const ip = $('hwIp').value.trim(); if (ip) addFound({ brand: $('hwBrand').value, ip, name: $('hwBrand').selectedOptions[0].text + ' ' + ip.split('.').pop() }); };
  }

  function done(r) {
    if (!r.ok) return toast(r.error.message);
    Today.closeModal(); toast(`✓ ${r.added} ${t('home.lampsAdded')}`); refresh();
  }

  async function refresh() { devices = await window.kairo.home.list(); render(); }

  function init() {
    window.kairo.home.onChange(d => { devices = d; if (document.getElementById('view-home').classList.contains('active')) render(); });
  }

  return { init, refresh, control };
})();
