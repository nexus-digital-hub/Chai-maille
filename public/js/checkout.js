'use strict';
(async function () {
  const { esc, money } = Shop;
  const $ = (id) => document.getElementById(id);
  const form = $('co-form');
  const alertBox = $('co-alert');
  let products, cfg;

  try { [products, cfg] = await Promise.all([Shop.getProducts(), Shop.getConfig()]); }
  catch { alertBox.innerHTML = '<p class="alert">Impossible de charger la page. Vérifiez votre connexion puis actualisez.</p>'; return; }

  const lines = () => Shop.cart.lines().filter((l) => products.some((p) => p.id === l.productId));
  if (!lines().length) {
    $('co-root').innerHTML = '<div class="empty" style="grid-column:1/-1"><p style="margin:0 auto 16px">Votre panier est vide : il n\'y a rien à commander pour le moment.</p><a class="btn" href="' + Shop.url('/creations') + '">Découvrir les créations</a></div>';
    $('co-sub').hidden = true;
    return;
  }

  // wilayas
  $('wilaya').insertAdjacentHTML('beforeend', cfg.wilayas.map((w) => `<option value="${w.code}">${String(w.code).padStart(2, '0')} — ${esc(w.name)}</option>`).join(''));

  // ---------- récapitulatif ----------
  function deliveryInfo() {
    const code = Number($('wilaya').value);
    const d = cfg.delivery;
    if (d.mode === 'flat') return { fee: d.flatFee, label: d.flatFee ? money(d.flatFee) : 'Offerte' };
    if (d.mode === 'per_wilaya' && code && Number.isFinite(d.perWilaya[code])) return { fee: d.perWilaya[code], label: money(d.perWilaya[code]) };
    return { fee: null, label: 'À confirmer' };
  }
  function totals() {
    let sub = 0; const rows = [];
    for (const l of lines()) {
      const p = products.find((x) => x.id === l.productId);
      sub += p.price * l.quantity; rows.push({ l, p, total: p.price * l.quantity });
    }
    const del = deliveryInfo();
    return { sub, rows, del, total: sub + (del.fee || 0) };
  }
  function lineHtml({ l, p, total }) {
    const opts = Shop.describeLine(l, p, cfg.colors).map((o) => `${esc(o.label)} : ${esc(o.value)}`);
    if (l.note) opts.push(`Demande : ${esc(l.note)}`);
    return `<div class="review-line"><b>${l.quantity} × ${esc(p.name)}</b><div>${opts.join('<br>')}</div><div>Sous-total : ${money(total)}</div></div>`;
  }
  function renderSummary() {
    const t = totals();
    $('sum-lines').innerHTML = t.rows.map(lineHtml).join('');
    $('sum-sub').textContent = money(t.sub);
    $('sum-del').textContent = t.del.label;
    $('sum-total').textContent = money(t.total);
    $('sum-fine').textContent = t.del.fee === null ? 'Les frais de livraison vous seront communiqués à la confirmation.' : '';
    return t;
  }
  $('wilaya').addEventListener('change', renderSummary);
  renderSummary();

  // ---------- validation (le serveur revalide tout) ----------
  function normalizePhone(input) {
    let s = String(input || '').replace(/[\s.\-()]/g, '');
    if (s.startsWith('00')) s = '+' + s.slice(2);
    if (/^\+213[2-7]\d{8}$/.test(s)) return '0' + s.slice(4);
    if (/^213[2-7]\d{8}$/.test(s)) return s.length ? '0' + s.slice(3) : null;
    if (/^0[567]\d{8}$/.test(s) || /^0[234]\d{7,8}$/.test(s) || /^\+[1-9]\d{7,14}$/.test(s)) return s;
    return null;
  }
  const RULES = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Indiquez votre nom complet.'),
    phone: (v) => (normalizePhone(v) ? '' : 'Numéro invalide. Exemple : 05 XX XX XX XX (ou +213… / format international).'),
    email: (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Adresse e-mail invalide.'),
    wilaya: (v) => (v ? '' : 'Choisissez votre wilaya.'),
    commune: (v) => (v.trim().length >= 2 ? '' : 'Indiquez votre commune ou ville.'),
    address: (v) => (v.trim().length >= 5 ? '' : 'Indiquez votre adresse de livraison.'),
  };
  function setError(name, msg) {
    const field = form.elements[name].closest('.field');
    const err = field.querySelector('.err');
    field.classList.toggle('invalid', Boolean(msg));
    form.elements[name].setAttribute('aria-invalid', String(Boolean(msg)));
    if (err) { err.textContent = msg; err.hidden = !msg; form.elements[name].setAttribute('aria-describedby', err.id || (err.id = `err-${name}`)); }
  }
  function validate() {
    let first = null;
    for (const [name, rule] of Object.entries(RULES)) {
      const msg = rule(form.elements[name].value);
      setError(name, msg);
      if (msg && !first) first = form.elements[name];
    }
    if (first) first.focus();
    return !first;
  }
  Object.keys(RULES).forEach((n) => form.elements[n].addEventListener('blur', () => { if (form.elements[n].value) setError(n, RULES[n](form.elements[n].value)); }));

  // ---------- étape « vérifier » ----------
  const data = () => ({
    name: form.elements.name.value.trim(), phone: form.elements.phone.value.trim(), email: form.elements.email.value.trim(),
    wilaya: form.elements.wilaya.value, commune: form.elements.commune.value.trim(), address: form.elements.address.value.trim(),
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alertBox.innerHTML = '';
    if (!validate()) return;
    const d = data(); const t = totals();
    const w = cfg.wilayas.find((x) => x.code === Number(d.wilaya));
    $('review-lines').innerHTML = t.rows.map(lineHtml).join('') +
      `<div class="sum-row"><span>Livraison</span><span>${t.del.label}</span></div><div class="sum-row total"><span>Total</span><span>${money(t.total)}</span></div>`;
    $('review-cust').innerHTML = [['Nom', d.name], ['Téléphone', d.phone], ...(d.email ? [['E-mail', d.email]] : []), ['Wilaya', w.name], ['Commune', d.commune], ['Adresse', d.address],
      ...(form.elements.note.value.trim() ? [['Note', form.elements.note.value.trim()]] : [])]
      .map(([k, v]) => `<div><span>${k} : </span>${esc(v)}</div>`).join('');
    form.hidden = true; $('review').hidden = false;
    $('co-title').textContent = 'Vérifiez votre commande';
    $('co-title').scrollIntoView({ behavior: 'smooth' });
    $('confirm-btn').focus({ preventScroll: true });
  });
  $('edit-btn').addEventListener('click', () => {
    $('review').hidden = true; form.hidden = false; $('co-title').textContent = 'Passer commande'; form.elements.name.focus();
  });

  // ---------- envoi ----------
  const WA = cfg.contactWhatsappUrl;
  const failMsg = `Une erreur est survenue lors de l'envoi de votre commande. Veuillez réessayer ou nous contacter directement sur <a href="${esc(WA)}" target="_blank" rel="noopener">WhatsApp</a>.`;
  let token; try { token = sessionStorage.getItem('pm_token'); } catch { /* ignore */ }
  if (!token) { token = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)); try { sessionStorage.setItem('pm_token', token); } catch { /* ignore */ } }

  // ---------- version statique : pas de serveur, la commande part uniquement par WhatsApp ----------
  const CURRENCY = cfg.currency || 'DA';
  function localOrderNumber() {
    const n = new Date(), p2 = (x) => String(x).padStart(2, '0');
    const rnd = Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
    return `#${cfg.orderPrefix || 'LSM'}-${String(n.getFullYear()).slice(2)}${p2(n.getMonth() + 1)}${p2(n.getDate())}-${rnd}`;
  }
  function sendStatic(d) {
    const btn = $('confirm-btn');
    const t = totals();
    const w = cfg.wilayas.find((x) => x.code === Number(d.wilaya));
    // Contrôle des articles contre le catalogue (les prix viennent du catalogue, pas du panier).
    const items = [];
    for (const { l, p } of t.rows) {
      if (!p.available) { alertBox.innerHTML = `<p class="alert">« ${esc(p.name)} » n'est plus disponible. <a href="${Shop.url('/panier')}">Revoir mon panier</a></p>`; btn.disabled = false; btn.textContent = 'Confirmer ma commande'; return; }
      items.push({
        quantity: l.quantity, name: p.name, unitPrice: p.price, note: l.note || '',
        selections: p.options.map((o) => {
          const id = l.selections[o.id]; const c = cfg.colors[id] || {};
          return { optionLabel: o.label, valueLabel: id === 'custom' ? `Autre : ${l.customColors[o.id] || ''}` : c.label || id };
        }),
      });
    }
    const order = {
      number: localOrderNumber(), createdAt: new Date().toISOString(),
      customer: { name: d.name, phone: normalizePhone(d.phone) || d.phone, email: d.email, wilaya: w.name, commune: d.commune, address: d.address },
      note: form.elements.note.value.trim(), items, subtotal: t.sub, deliveryFee: t.del.fee, deliveryPending: t.del.fee === null, total: t.total,
    };
    const text = OrderMessage.build(order, CURRENCY);
    const waUrl = `https://wa.me/${cfg.whatsappNumber}?text=${encodeURIComponent(text)}`;
    try { sessionStorage.setItem('pm_last_order', JSON.stringify({ number: order.number, total: order.total, deliveryPending: order.deliveryPending, whatsappUrl: waUrl, text })); } catch { /* ignore */ }
    try { window.open(waUrl, '_blank', 'noopener'); } catch { /* la page de confirmation propose le bouton */ }
    Shop.cart.clear();
    location.href = Shop.url('/confirmation');
  }

  $('confirm-btn').addEventListener('click', async () => {
    const btn = $('confirm-btn');
    if (btn.disabled) return;
    btn.disabled = true; btn.textContent = 'Envoi en cours…'; alertBox.innerHTML = '';
    const d = data();
    if (Shop.STATIC) { sendStatic(d); return; }
    const body = {
      clientToken: token, website: form.elements.website.value,
      customer: { ...d, wilaya: Number(d.wilaya) }, note: form.elements.note.value.trim(),
      items: lines().map((l) => ({ productId: l.productId, quantity: l.quantity, selections: l.selections, customColors: l.customColors, note: l.note })),
    };
    try {
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400 && out.field && RULES[out.field]) {
          $('edit-btn').click(); setError(out.field, out.error); form.elements[out.field].focus();
          alertBox.innerHTML = `<p class="alert">${esc(out.error)}</p>`;
        } else if (res.status === 400 || res.status === 429) {
          alertBox.innerHTML = `<p class="alert">${esc(out.error || 'Commande refusée.')}${out.field === 'items' ? ' <a href="' + Shop.url('/panier') + '">Revoir mon panier</a>' : ''}</p>`;
        } else alertBox.innerHTML = `<p class="alert">${failMsg}</p>`;
        alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        btn.disabled = false; btn.textContent = 'Confirmer ma commande';
        return;
      }
      try {
        sessionStorage.setItem('pm_last_order', JSON.stringify({ ...out.order, whatsappUrl: out.whatsappUrl, notifications: out.notifications }));
        sessionStorage.removeItem('pm_token');
      } catch { /* ignore */ }
      Shop.cart.clear();
      location.href = Shop.url('/confirmation');
    } catch {
      alertBox.innerHTML = `<p class="alert">Connexion impossible. Vérifiez votre connexion internet, puis réessayez. Votre panier est conservé. Vous pouvez aussi nous contacter sur <a href="${esc(WA)}" target="_blank" rel="noopener">WhatsApp</a>.</p>`;
      alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn.disabled = false; btn.textContent = 'Confirmer ma commande';
    }
  });
})();
