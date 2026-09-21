// Sezione Alimentazione: registra pasti descritti a testo libero, l'API stima
// calorie e macro; i dati restano salvati in locale, raggruppati per giorno.
// L'obiettivo calorico giornaliero è modificabile (prima era fisso nel codice).

function leggiObiettivoCalorie() {
    return Number(localStorage.getItem('liberoflow_obiettivo_calorie')) || 2200;
}
function salvaObiettivoCalorie(v) {
    localStorage.setItem('liberoflow_obiettivo_calorie', String(v));
}

function leggiPastiOggi() {
    const tutti = JSON.parse(localStorage.getItem('liberoflow_pasti') || '{}');
    return tutti[chiaveGiornoOggi()] || [];
}

function salvaPastiOggi(pasti) {
    const tutti = JSON.parse(localStorage.getItem('liberoflow_pasti') || '{}');
    tutti[chiaveGiornoOggi()] = pasti;
    localStorage.setItem('liberoflow_pasti', JSON.stringify(tutti));
}

function mostraErroreCibo(msg) {
    const el = document.getElementById('food-errore');
    el.textContent = msg;
    el.classList.remove('hidden');
}

async function stimaEAggiungiPasto(descrizione) {
    const res = await fetch('/api/stima-calorie', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descrizione })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.errore || 'Stima non riuscita.');

    const pasti = leggiPastiOggi();
    pasti.push({
        id: Date.now(),
        nome: data.nome || descrizione,
        calorie: Math.round(data.calorie),
        proteine: data.proteine_g || 0,
        carboidrati: data.carboidrati_g || 0,
        grassi: data.grassi_g || 0,
        ora: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    });
    salvaPastiOggi(pasti);
    renderAlimentazione();
}

function eliminaPasto(id) {
    salvaPastiOggi(leggiPastiOggi().filter(p => p.id !== id));
    renderAlimentazione();
}

function modificaPasto(id) {
    const pasti = leggiPastiOggi();
    const pasto = pasti.find(p => p.id === id);
    if (!pasto) return;

    const nuoveCalorie = prompt(`Calorie per "${pasto.nome}":`, pasto.calorie);
    if (nuoveCalorie === null || isNaN(Number(nuoveCalorie))) return;
    pasto.calorie = Math.round(Number(nuoveCalorie));

    const nuoveProteine = prompt('Proteine (g):', pasto.proteine);
    if (nuoveProteine !== null && !isNaN(Number(nuoveProteine))) pasto.proteine = Number(nuoveProteine);
    const nuoviCarbo = prompt('Carboidrati (g):', pasto.carboidrati);
    if (nuoviCarbo !== null && !isNaN(Number(nuoviCarbo))) pasto.carboidrati = Number(nuoviCarbo);
    const nuoviGrassi = prompt('Grassi (g):', pasto.grassi);
    if (nuoviGrassi !== null && !isNaN(Number(nuoviGrassi))) pasto.grassi = Number(nuoviGrassi);

    salvaPastiOggi(pasti);
    renderAlimentazione();
}

function modificaObiettivo() {
    const attuale = leggiObiettivoCalorie();
    const nuovo = prompt('Nuovo obiettivo calorico giornaliero (kcal):', attuale);
    if (nuovo === null || isNaN(Number(nuovo)) || Number(nuovo) <= 0) return;
    salvaObiettivoCalorie(Math.round(Number(nuovo)));
    renderAlimentazione();
}

function renderAlimentazione() {
    const pasti = leggiPastiOggi();
    const obiettivo = leggiObiettivoCalorie();
    const totaleCalorie = pasti.reduce((s, p) => s + p.calorie, 0);
    const totaleProteine = pasti.reduce((s, p) => s + p.proteine, 0);
    const totaleCarbo = pasti.reduce((s, p) => s + p.carboidrati, 0);
    const totaleGrassi = pasti.reduce((s, p) => s + p.grassi, 0);

    document.getElementById('cal-totale-oggi').textContent = totaleCalorie;
    document.getElementById('cal-obiettivo-label').innerHTML = `obiettivo ${obiettivo} kcal <button onclick="modificaObiettivo()" class="text-slate-500 hover:text-amber-400 ml-1"><i class="fa-solid fa-pen text-[10px]"></i></button>`;
    document.getElementById('cal-barra').style.width = `${Math.min(100, (totaleCalorie / obiettivo) * 100)}%`;
    document.getElementById('cal-proteine').textContent = `${Math.round(totaleProteine)}g`;
    document.getElementById('cal-carbo').textContent = `${Math.round(totaleCarbo)}g`;
    document.getElementById('cal-grassi').textContent = `${Math.round(totaleGrassi)}g`;

    const listEl = document.getElementById('food-list');
    if (pasti.length === 0) {
        listEl.innerHTML = `<div class="text-center py-10 text-slate-500 text-sm">Ancora nessun pasto registrato oggi.</div>`;
        return;
    }
    listEl.innerHTML = pasti.slice().reverse().map(p => `
        <div class="card-glass px-4 py-3 rounded-xl flex items-center justify-between border border-slate-800">
            <div class="flex items-center gap-3 min-w-0">
                <span class="text-xs text-slate-500 shrink-0">${p.ora}</span>
                <span class="text-sm text-white truncate">${p.nome}</span>
            </div>
            <div class="flex items-center gap-3 shrink-0">
                <span class="text-sm font-bold text-amber-300">${p.calorie} kcal</span>
                <button onclick="modificaPasto(${p.id})" class="text-slate-500 hover:text-amber-400 p-1 transition">
                    <i class="fa-solid fa-pen text-xs"></i>
                </button>
                <button onclick="eliminaPasto(${p.id})" class="text-slate-500 hover:text-red-400 p-1 transition">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
            </div>
        </div>
    `).join('');
}

document.getElementById('food-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('food-input');
    const btn = document.getElementById('food-submit-btn');
    const descrizione = input.value.trim();
    if (!descrizione) return;

    document.getElementById('food-errore').classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Stima in corso...';

    try {
        await stimaEAggiungiPasto(descrizione);
        input.value = '';
    } catch (err) {
        mostraErroreCibo(err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Stima';
    }
});

renderAlimentazione();
