// Sezione Profilo: check-in settimanale, storico e promemoria.

const CHECKIN_FIELDS = ['vita', 'fianchi', 'petto', 'braccio', 'coscia'];

function showToast(message, type = 'error') {
  const colors = {
    error: 'border-rose-500/40 bg-rose-950/80 text-rose-200',
    success: 'border-emerald-500/40 bg-emerald-950/80 text-emerald-200',
  };
  const toast = document.createElement('div');
  toast.className = `fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur ${colors[type]}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function eVenerdiMattina() {
  const oggi = new Date();
  return oggi.getDay() === 5 && oggi.getHours() < 12;
}

function modificaDispendio() {
  const attuale = leggiDispendioEnergetico();
  const nuovo = prompt('Il tuo dispendio energetico giornaliero (TDEE), in kcal:', attuale);
  const valore = Number(nuovo);

  if (nuovo === null) return;
  if (!Number.isFinite(valore) || valore <= 0) {
    showToast('Inserisci un dispendio energetico valido.', 'error');
    return;
  }

  salvaDispendioEnergetico(Math.round(valore));
  document.getElementById('dispendio-valore').textContent = `${leggiDispendioEnergetico()} kcal`;
  if (typeof renderAlimentazione === 'function') renderAlimentazione();
  showToast('Dispendio energetico aggiornato.', 'success');
}

function mostraPromemoriaSeVenerdi() {
  document.getElementById('checkin-reminder').classList.toggle('hidden', !eVenerdiMattina());
}

function aggiornaStatoNotifiche() {
  const btn = document.getElementById('btn-attiva-notifiche');
  if (!('Notification' in window)) {
    btn.classList.add('hidden');
    return;
  }

  if (Notification.permission === 'granted') {
    btn.innerHTML = '<i class="fa-solid fa-bell"></i> Promemoria attivo';
    btn.disabled = true;
    btn.classList.add('opacity-60', 'cursor-default');
  } else {
    btn.innerHTML = '<i class="fa-solid fa-bell"></i> Attiva promemoria del venerdì';
  }
}

async function attivaNotifiche() {
  if (!('Notification' in window)) return;
  const esito = await Notification.requestPermission();
  aggiornaStatoNotifiche();

  if (esito === 'granted') {
    localStorage.setItem('liberoflow_notifiche_attive', '1');
    provaNotificaVenerdi();
    showToast('Promemoria del venerdì attivato.', 'success');
  }
}

function provaNotificaVenerdi() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!eVenerdiMattina()) return;

  const ultimaInviata = localStorage.getItem('liberoflow_ultima_notifica_venerdi');
  if (ultimaInviata === chiaveGiornoOggi()) return;

  new Notification('Check-in settimanale', {
    body: 'È venerdì mattina: registra peso e misure su Tempra.',
  });
  localStorage.setItem('liberoflow_ultima_notifica_venerdi', chiaveGiornoOggi());
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.errore || 'Operazione non completata.');
  }
  return payload;
}

async function caricaCheckin() {
  try {
    return await apiRequest('/api/checkin');
  } catch (error) {
    showToast(error.message, 'error');
    return [];
  }
}

function disegnaSparkline(storico) {
  const svg = document.getElementById('peso-sparkline');
  if (storico.length < 2) {
    svg.innerHTML = '<text x="150" y="45" text-anchor="middle" fill="#64748b" font-size="11">Servono almeno due check-in per vedere l\'andamento</text>';
    return;
  }

  const pesi = storico.map((checkin) => checkin.peso);
  const min = Math.min(...pesi);
  const max = Math.max(...pesi);
  const range = max - min || 1;
  const punti = pesi.map((peso, index) => {
    const x = (index / (pesi.length - 1)) * 290 + 5;
    const y = 70 - ((peso - min) / range) * 60;
    return `${x},${y}`;
  }).join(' ');
  const ultimo = punti.split(' ').at(-1).split(',');

  svg.innerHTML = `
    <polyline points="${punti}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${ultimo[0]}" cy="${ultimo[1]}" r="4" fill="#10b981"/>
  `;
}

function formattaData(data) {
  return new Date(`${data}T00:00:00`).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function renderCheckinList(storico) {
  const listEl = document.getElementById('checkin-list');
  if (storico.length === 0) {
    listEl.innerHTML = '<div class="text-center py-10 text-slate-500 text-sm">Nessun check-in registrato ancora.</div>';
    return;
  }

  const ordinati = storico.slice().reverse();
  listEl.innerHTML = ordinati.map((checkin, index) => {
    const precedente = ordinati[index + 1];
    const delta = precedente ? checkin.peso - precedente.peso : null;
    const deltaHtml = delta === null ? ''
      : delta === 0
        ? '<span class="text-slate-500 text-xs ml-2">=</span>'
        : delta > 0
          ? `<span class="text-rose-400 text-xs ml-2">▲ ${delta.toFixed(1)} kg</span>`
          : `<span class="text-emerald-400 text-xs ml-2">▼ ${Math.abs(delta).toFixed(1)} kg</span>`;
    const misure = CHECKIN_FIELDS
      .filter((field) => checkin[field] != null)
      .map((field) => `${field} ${checkin[field]} cm`)
      .join(' · ');

    return `
      <div class="card-glass px-4 py-3 rounded-xl flex items-center justify-between border border-slate-800">
        <div class="min-w-0">
          <div class="text-sm text-white font-semibold">${formattaData(checkin.data)}</div>
          ${misure ? `<div class="text-xs text-slate-500 mt-0.5">${misure}</div>` : ''}
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <span class="text-sm font-bold text-emerald-300">${checkin.peso} kg${deltaHtml}</span>
          <button type="button" onclick='modificaCheckin(${JSON.stringify(checkin)})' class="text-slate-500 hover:text-amber-400 p-1 transition" aria-label="Modifica check-in">
            <i class="fa-solid fa-pen text-xs"></i>
          </button>
          <button type="button" onclick="eliminaCheckin(${checkin.id})" class="text-slate-500 hover:text-red-400 p-1 transition" aria-label="Elimina check-in">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>
      </div>`;
  }).join('');
}

async function renderProfilo() {
  const storico = await caricaCheckin();
  disegnaSparkline(storico);
  renderCheckinList(storico);
}

async function eliminaCheckin(id) {
  if (!window.confirm('Eliminare definitivamente questo check-in?')) return;

  try {
    await apiRequest(`/api/checkin/${id}`, { method: 'DELETE' });
    showToast('Check-in eliminato.', 'success');
    await renderProfilo();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function modificaCheckin(voce) {
  const nuovoPeso = prompt('Peso (kg):', voce.peso);
  const peso = Number(nuovoPeso);

  if (nuovoPeso === null) return;
  if (!Number.isFinite(peso) || peso <= 0) {
    showToast('Inserisci un peso valido.', 'error');
    return;
  }

  const campi = { peso };
  for (const field of CHECKIN_FIELDS) {
    const valore = prompt(`${field.charAt(0).toUpperCase()}${field.slice(1)} (cm, lascia vuoto se non misurato):`, voce[field] ?? '');
    if (valore === null) continue;
    campi[field] = valore === '' ? null : Number(valore);
  }

  try {
    await apiRequest(`/api/checkin/${voce.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campi),
    });
    showToast('Check-in aggiornato.', 'success');
    await renderProfilo();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function leggiValore(id) {
  return document.getElementById(id).value.trim();
}

function validaCheckin(corpo) {
  const peso = Number(corpo.peso);
  if (!Number.isFinite(peso) || peso <= 0) {
    return 'Il peso è obbligatorio e deve essere maggiore di zero.';
  }

  for (const field of CHECKIN_FIELDS) {
    if (corpo[field] !== '' && (!Number.isFinite(Number(corpo[field])) || Number(corpo[field]) <= 0)) {
      return `Il valore di ${field} non è valido.`;
    }
  }
  return null;
}

document.getElementById('checkin-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const corpo = {
    peso: leggiValore('c-peso'),
    vita: leggiValore('c-vita'),
    fianchi: leggiValore('c-fianchi'),
    petto: leggiValore('c-petto'),
    braccio: leggiValore('c-braccio'),
    coscia: leggiValore('c-coscia'),
  };

  const errore = validaCheckin(corpo);
  if (errore) {
    showToast(errore, 'error');
    return;
  }

  const submitButton = event.target.querySelector('button[type="submit"]');
  const testoOriginale = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = 'Salvataggio...';

  try {
    await apiRequest('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    event.target.reset();
    showToast('Check-in salvato.', 'success');
    await renderProfilo();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = testoOriginale;
  }
});

document.getElementById('btn-attiva-notifiche').addEventListener('click', attivaNotifiche);

mostraPromemoriaSeVenerdi();
aggiornaStatoNotifiche();
provaNotificaVenerdi();
document.getElementById('dispendio-valore').textContent = `${leggiDispendioEnergetico()} kcal`;
renderProfilo();
