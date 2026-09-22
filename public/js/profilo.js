// Sezione Profilo: check-in settimanale (peso + misure), salvato lato server
// (Turso). Promemoria del venerdì mattina sia come banner sia come notifica
// di sistema reale (richiede il permesso del browser: funziona solo quando
// l'app è aperta o in background nella stessa scheda — non è un push che
// arriva ad app completamente chiusa, per quello servirebbe un service
// worker + backend di invio push, infrastruttura più pesante).

function eVenerdiMattina() {
    const oggi = new Date();
    return oggi.getDay() === 5 && oggi.getHours() < 12;
}

function modificaDispendio() {
    const attuale = leggiDispendioEnergetico();
    const nuovo = prompt('Il tuo dispendio energetico giornaliero (TDEE), in kcal:', attuale);
    if (nuovo === null || isNaN(Number(nuovo)) || Number(nuovo) <= 0) return;
    salvaDispendioEnergetico(Math.round(Number(nuovo)));
    document.getElementById('dispendio-valore').textContent = `${leggiDispendioEnergetico()} kcal`;
    if (typeof renderAlimentazione === 'function') renderAlimentazione();
}

function mostraPromemoriaSeVenerdi() {
    document.getElementById('checkin-reminder').classList.toggle('hidden', !eVenerdiMattina());
}

function aggiornaStatoNotifiche() {
    const btn = document.getElementById('btn-attiva-notifiche');
    if (!('Notification' in window)) { btn.classList.add('hidden'); return; }
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
    }
}

// Da chiamare a ogni apertura dell'app: se è venerdì mattina, il permesso è
// concesso e non è già stata mandata oggi, invia la notifica di sistema.
function provaNotificaVenerdi() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!eVenerdiMattina()) return;
    const ultimaInviata = localStorage.getItem('liberoflow_ultima_notifica_venerdi');
    if (ultimaInviata === chiaveGiornoOggi()) return;

    new Notification('Check-in settimanale', {
        body: 'È venerdì mattina: registra peso e misure su Tempra.',
        icon: undefined
    });
    localStorage.setItem('liberoflow_ultima_notifica_venerdi', chiaveGiornoOggi());
}

async function caricaCheckin() {
    const res = await fetch('/api/checkin');
    return res.ok ? res.json() : [];
}

function disegnaSparkline(storico) {
    const svg = document.getElementById('peso-sparkline');
    if (storico.length < 2) {
        svg.innerHTML = `<text x="150" y="45" text-anchor="middle" fill="#64748b" font-size="11">Servono almeno due check-in per vedere l'andamento</text>`;
        return;
    }
    const pesi = storico.map(c => c.peso);
    const min = Math.min(...pesi), max = Math.max(...pesi);
    const range = max - min || 1;
    const punti = pesi.map((p, i) => {
        const x = (i / (pesi.length - 1)) * 290 + 5;
        const y = 70 - ((p - min) / range) * 60;
        return `${x},${y}`;
    }).join(' ');
    const ultimo = punti.split(' ').at(-1).split(',');
    svg.innerHTML = `
        <polyline points="${punti}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${ultimo[0]}" cy="${ultimo[1]}" r="4" fill="#10b981"/>
    `;
}

function renderCheckinList(storico) {
    const listEl = document.getElementById('checkin-list');
    if (storico.length === 0) {
        listEl.innerHTML = `<div class="text-center py-10 text-slate-500 text-sm">Nessun check-in registrato ancora.</div>`;
        return;
    }
    const ordinati = storico.slice().reverse();
    listEl.innerHTML = ordinati.map((c, i) => {
        const precedente = ordinati[i + 1];
        const delta = precedente ? (c.peso - precedente.peso) : null;
        const deltaHtml = delta === null ? ''
            : delta === 0 ? `<span class="text-slate-500 text-xs ml-2">= </span>`
            : delta > 0 ? `<span class="text-rose-400 text-xs ml-2">▲ ${delta.toFixed(1)}kg</span>`
            : `<span class="text-emerald-400 text-xs ml-2">▼ ${Math.abs(delta).toFixed(1)}kg</span>`;
        const misure = ['vita', 'fianchi', 'petto', 'braccio', 'coscia']
            .filter(k => c[k] != null)
            .map(k => `${k} ${c[k]}cm`).join(' · ');
        return `
        <div class="card-glass px-4 py-3 rounded-xl flex items-center justify-between border border-slate-800">
            <div class="min-w-0">
                <div class="text-sm text-white font-semibold">${new Date(c.data + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                ${misure ? `<div class="text-xs text-slate-500 mt-0.5">${misure}</div>` : ''}
            </div>
            <div class="flex items-center gap-3 shrink-0">
                <span class="text-sm font-bold text-emerald-300">${c.peso}kg${deltaHtml}</span>
                <button onclick='modificaCheckin(${JSON.stringify(c)})' class="text-slate-500 hover:text-amber-400 p-1 transition">
                    <i class="fa-solid fa-pen text-xs"></i>
                </button>
                <button onclick="eliminaCheckin(${c.id})" class="text-slate-500 hover:text-red-400 p-1 transition">
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
    await fetch(`/api/checkin/${id}`, { method: 'DELETE' });
    renderProfilo();
}

async function modificaCheckin(voce) {
    const nuovoPeso = prompt('Peso (kg):', voce.peso);
    if (nuovoPeso === null || isNaN(Number(nuovoPeso))) return;

    const campi = { peso: Number(nuovoPeso) };
    for (const k of ['vita', 'fianchi', 'petto', 'braccio', 'coscia']) {
        const val = prompt(`${k.charAt(0).toUpperCase() + k.slice(1)} (cm, lascia vuoto se non misurato):`, voce[k] ?? '');
        if (val === null) continue;
        campi[k] = val === '' ? null : Number(val);
    }

    await fetch(`/api/checkin/${voce.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campi)
    });
    renderProfilo();
}

document.getElementById('checkin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const corpo = {
        peso: document.getElementById('c-peso').value,
        vita: document.getElementById('c-vita').value,
        fianchi: document.getElementById('c-fianchi').value,
        petto: document.getElementById('c-petto').value,
        braccio: document.getElementById('c-braccio').value,
        coscia: document.getElementById('c-coscia').value,
    };
    const res = await fetch('/api/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo)
    });
    if (res.ok) {
        e.target.reset();
        renderProfilo();
    }
});

document.getElementById('btn-attiva-notifiche').addEventListener('click', attivaNotifiche);

mostraPromemoriaSeVenerdi();
aggiornaStatoNotifiche();
provaNotificaVenerdi();
document.getElementById('dispendio-valore').textContent = `${leggiDispendioEnergetico()} kcal`;
renderProfilo();
