// Una Cura — logica condivisa
// Countdown a Taranto, stato persistente in localStorage, progress bars
// e piccoli aggiornamenti dinamici del cruscotto.

(function () {
  'use strict';

  const TARANTO = new Date('2026-05-01T00:00:00+02:00');
  const LS_PREFIX = 'unacura:';

  // --- Countdown Taranto -------------------------------------------------
  function updateCountdown() {
    const els = document.querySelectorAll('[data-countdown]');
    if (!els.length) return;
    const now = new Date();
    const diff = TARANTO - now;
    const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    els.forEach(el => { el.textContent = days; });
  }

  // --- Data di oggi in header -------------------------------------------
  function setToday() {
    const el = document.querySelector('[data-today]');
    if (!el) return;
    const d = new Date();
    const fmt = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
    el.textContent = fmt;
  }

  // --- Stato persistente (decisioni + matrice + note) -------------------
  function loadState(key, fallback) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function saveState(key, value) {
    try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch (e) {}
  }

  // --- Decisioni: checkbox persistenti ----------------------------------
  function initDecisions() {
    const items = document.querySelectorAll('.decisions li[data-dec]');
    if (!items.length) return;
    const state = loadState('decisioni', {});
    items.forEach(li => {
      const id = li.dataset.dec;
      const cb = li.querySelector('input[type="checkbox"]');
      if (!cb) return;
      if (state[id]) { cb.checked = true; li.classList.add('done'); }
      cb.addEventListener('change', () => {
        state[id] = cb.checked;
        saveState('decisioni', state);
        li.classList.toggle('done', cb.checked);
        updateRicostituzione();
      });
    });
  }

  // --- Matrice contatti: select e input persistenti ---------------------
  function initMatrice() {
    const rows = document.querySelectorAll('.matrice tr[data-row]');
    if (!rows.length) return;
    const state = loadState('matrice', {});
    rows.forEach(tr => {
      const id = tr.dataset.row;
      if (!state[id]) state[id] = {};
      const sel = tr.querySelector('select.stato');
      if (sel) {
        if (state[id].stato) sel.value = state[id].stato;
        applyStatoClass(sel);
        sel.addEventListener('change', () => {
          state[id].stato = sel.value;
          saveState('matrice', state);
          applyStatoClass(sel);
          updateRicostituzione();
        });
      }
      tr.querySelectorAll('input.cell-input').forEach(inp => {
        const key = inp.dataset.key;
        if (!key) return;
        if (state[id][key]) inp.value = state[id][key];
        inp.addEventListener('input', () => {
          state[id][key] = inp.value;
          saveState('matrice', state);
        });
      });
    });
  }
  function applyStatoClass(sel) {
    sel.classList.remove('s-todo', 's-doing', 's-done', 's-waiting', 's-no');
    const v = sel.value;
    if (v === 'da-contattare') sel.classList.add('s-todo');
    else if (v === 'contattato' || v === 'in-attesa') sel.classList.add('s-doing');
    else if (v === 'aderito' || v === 'confermato') sel.classList.add('s-done');
    else if (v === 'declinato') sel.classList.add('s-no');
    else sel.classList.add('s-waiting');
  }

  // --- Ricostituzione: barra aggregata ----------------------------------
  function updateRicostituzione() {
    const bar = document.querySelector('.ricostituzione .bar-fill');
    const pct = document.querySelector('.ricostituzione .ric-pct');
    const decVal = document.querySelector('[data-ric-decisioni]');
    const orgVal = document.querySelector('[data-ric-organizzazioni]');
    const firmVal = document.querySelector('[data-ric-firmatari]');
    if (!bar) return;

    const decState = loadState('decisioni', {});
    const decItems = document.querySelectorAll('.decisions li[data-dec]');
    const decTotal = decItems.length || 1;
    const decDone = Object.values(decState).filter(Boolean).length;

    const matState = loadState('matrice', {});
    let orgTot = 0, orgAderite = 0, firmTot = 0, firmConfermate = 0;
    document.querySelectorAll('.matrice tr[data-row]').forEach(tr => {
      const tipo = tr.dataset.tipo;
      const id = tr.dataset.row;
      const stato = (matState[id] && matState[id].stato) || '';
      const fatto = stato === 'aderito' || stato === 'confermato';
      if (tipo === 'org') { orgTot++; if (fatto) orgAderite++; }
      else if (tipo === 'firm') { firmTot++; if (fatto) firmConfermate++; }
    });

    if (decVal) decVal.textContent = decDone + '/' + decTotal;
    if (orgVal) orgVal.textContent = orgAderite + '/' + orgTot;
    if (firmVal) firmVal.textContent = firmConfermate + '/' + firmTot;

    const totale = decTotal + (orgTot || 1) + (firmTot || 1);
    const fatti = decDone + orgAderite + firmConfermate;
    const pctVal = Math.round((fatti / totale) * 100);
    bar.style.width = pctVal + '%';
    if (pct) pct.textContent = pctVal + '%';
  }

  // --- Note rapide ------------------------------------------------------
  function initNote() {
    const ta = document.querySelector('.note-composer textarea');
    if (!ta) return;
    const ts = document.querySelector('.note-composer .note-ts');
    const count = document.querySelector('.note-composer .note-count');
    const saved = loadState('note', { testo: '', ts: null });
    if (saved.testo) ta.value = saved.testo;
    updateNoteMeta();
    ta.addEventListener('input', () => {
      const now = new Date();
      saveState('note', { testo: ta.value, ts: now.toISOString() });
      updateNoteMeta();
    });
    function updateNoteMeta() {
      if (count) count.textContent = (ta.value.length || 0) + ' caratteri';
      const state = loadState('note', { ts: null });
      if (ts && state.ts) {
        const d = new Date(state.ts);
        ts.textContent = 'Ultimo aggiornamento ' + d.toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      } else if (ts) {
        ts.textContent = 'Nessuna nota salvata';
      }
    }
  }

  // --- Reading progress -------------------------------------------------
  function initReadingProgress() {
    const fill = document.querySelector('.reading-progress .rp-fill');
    if (!fill) return;
    const update = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      fill.style.width = pct + '%';
    };
    document.addEventListener('scroll', update, { passive: true });
    update();
  }

  // --- Init -------------------------------------------------------------
  function init() {
    updateCountdown();
    setToday();
    initDecisions();
    initMatrice();
    updateRicostituzione();
    initNote();
    initReadingProgress();
    setInterval(updateCountdown, 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
