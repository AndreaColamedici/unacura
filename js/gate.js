// Una Cura — gate di accesso riservato
// Protezione lato client: SHA-256 della parola chiave,
// memorizzazione in localStorage. Blocca Google e lettura casuale,
// non è protezione crittografica forte contro un attaccante motivato.

(function () {
  'use strict';

  const HASH = '207f95fab3a47616c79a18b787c39e5c0d52ba65686d74cd161a9d1e5cc23913';
  const LS_KEY = 'unacura:auth';

  // CSS del gate, iniettato in head prima del render del corpo
  const style = document.createElement('style');
  style.textContent = `
    html:not(.unlocked) body > *:not(.gate-overlay) { display: none !important; }
    .gate-overlay {
      position: fixed; inset: 0; background: #F7F3EB;
      z-index: 9999; display: flex; align-items: center; justify-content: center;
      font-family: 'EB Garamond', Georgia, serif; padding: 24px;
    }
    .gate-overlay::before {
      content: ""; position: fixed; left: 0; top: 0; bottom: 0;
      width: 3px; background: #7A1F1F;
    }
    .gate-box {
      max-width: 440px; width: 100%;
      padding: 48px 44px; border: 1px solid #D8CFC0;
      background: #EDE6D6; text-align: left;
    }
    .gate-overline {
      font-family: 'Inter', sans-serif; font-size: 11px;
      text-transform: uppercase; letter-spacing: 0.22em;
      color: #7A1F1F; font-weight: 600; margin-bottom: 16px;
    }
    .gate-title {
      font-family: 'EB Garamond', serif; font-weight: 500;
      font-size: 32px; color: #1A1A1A; margin: 0 0 10px;
      letter-spacing: -0.01em; line-height: 1.15;
    }
    .gate-sub {
      font-family: 'EB Garamond', serif; font-size: 17px;
      color: #6B6357; font-style: italic;
      margin: 0 0 28px; line-height: 1.5;
    }
    .gate-form { margin: 0; }
    .gate-input {
      width: 100%; padding: 12px 14px;
      border: 1px solid #B8AE97; background: #F7F3EB;
      font-family: 'Inter', sans-serif; font-size: 14px;
      color: #1A1A1A; letter-spacing: 0.04em;
      box-sizing: border-box;
    }
    .gate-input:focus { outline: none; border-color: #7A1F1F; }
    .gate-btn {
      margin-top: 12px; padding: 14px 20px;
      background: #7A1F1F; color: #F7F3EB; border: none;
      font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.2em;
      cursor: pointer; width: 100%;
      transition: background 180ms ease-out;
    }
    .gate-btn:hover { background: #5C1717; }
    .gate-err {
      font-family: 'Inter', sans-serif; font-size: 12px;
      color: #7A1F1F; margin-top: 14px; min-height: 16px;
      letter-spacing: 0.02em; font-weight: 500;
    }
    .gate-foot {
      font-family: 'JetBrains Mono', monospace; font-size: 10px;
      letter-spacing: 0.2em; color: #7A1F1F;
      text-transform: uppercase; font-weight: 600;
      margin-top: 36px; padding-top: 18px;
      border-top: 1px solid #D8CFC0; text-align: center;
    }
  `;
  document.head.appendChild(style);

  function unlock() {
    document.documentElement.classList.add('unlocked');
    const overlay = document.querySelector('.gate-overlay');
    if (overlay) overlay.remove();
  }

  // Se già autenticato, sblocca subito al DOMContentLoaded
  try {
    if (localStorage.getItem(LS_KEY) === '1') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', unlock);
      } else {
        unlock();
      }
      return;
    }
  } catch (e) { /* localStorage non disponibile, procede con gate */ }

  async function sha256(text) {
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function mount() {
    const overlay = document.createElement('div');
    overlay.className = 'gate-overlay';
    overlay.innerHTML = `
      <div class="gate-box">
        <div class="gate-overline">Una Cura · accesso riservato</div>
        <h1 class="gate-title">Coordinamento interno</h1>
        <p class="gate-sub">Questo spazio è riservato ai soggetti fondatori e ai primi firmatari. Inserisci la parola chiave che ti è stata comunicata.</p>
        <form class="gate-form" autocomplete="off">
          <input type="password" class="gate-input" placeholder="parola chiave" autocomplete="off" spellcheck="false">
          <button type="submit" class="gate-btn">Entra</button>
          <div class="gate-err" role="alert"></div>
        </form>
        <div class="gate-foot">UC · MMXXVI · Taranto</div>
      </div>
    `;
    document.body.appendChild(overlay);

    const form = overlay.querySelector('.gate-form');
    const input = overlay.querySelector('.gate-input');
    const err = overlay.querySelector('.gate-err');
    setTimeout(() => input.focus(), 50);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const val = (input.value || '').trim();
      if (!val) return;
      try {
        const h = await sha256(val);
        if (h === HASH) {
          try { localStorage.setItem(LS_KEY, '1'); } catch (e) {}
          unlock();
        } else {
          err.textContent = 'Parola chiave non riconosciuta.';
          input.value = '';
          input.focus();
        }
      } catch (e) {
        err.textContent = 'Errore di verifica. Ricarica la pagina e riprova.';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
