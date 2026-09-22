// Sezione Alimentazione: registra pasti (via stima AI o inserimento manuale),
// i dati restano salvati in locale, raggruppati per giorno. L'obiettivo
// calorico giornaliero è modificabile (prima era fisso nel codice).

let modoInserimento = 'ai'; // 'ai' | 'manuale'
let baseManuale = '100g'; // '100g' | 'porzione'

function impostaModoInserimento(modo) {
    modoInserimento = modo;
    document.getElementById('food-modo-ai').className = modo === 'ai'
        ? 'py-2 rounded-lg transition bg-amber-500 text-slate-950'
        : 'py-2 rounded-lg transition text-slate-400';
    document.getElementById('food-modo-manuale').className = modo === 'manuale'
        ? 'py-2 rounded-lg transition bg-amber-500 text-slate-950'
        : 'py-2 rounded-lg transition text-slate-400';
    document.getElementById('food-label-etichetta').classList.toggle('hidden', modo !== 'ai');
    document.getElementById('food-blocco-manuale').classList.toggle('hidden', modo !== 'manuale');
}

function impostaBaseManuale(base) {
    baseManuale = base;
    document.getElementById('food-base-100g').className = base === '100g'
        ? 'py-2 rounded-lg transition bg-amber-500 text-slate-950'
        : 'py-2 rounded-lg transition text-slate-400';
    document.getElementById('food-base-porzione').className = base === 'porzione'
        ? 'py-2 rounded-lg transition bg-amber-500 text-slate-950'
        : 'py-2 rounded-lg transition text-slate-400';
    document.getElementById('food-base-hint').textContent = base === '100g'
        ? "I valori inseriti sono ogni 100g: verranno moltiplicati per il peso indicato sopra."
        : "I valori inseriti sono per l'intera porzione che stai mangiando (il peso sopra è solo indicativo, non viene usato per il calcolo).";
}

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

function aggiungiPastoAllElenco(nome, calorie, proteine, carboidrati, grassi) {
    const pasti = leggiPastiOggi();
    pasti.push({
        id: Date.now(),
        nome,
        calorie: Math.round(calorie),
        proteine: proteine || 0,
        carboidrati: carboidrati || 0,
        grassi: grassi || 0,
        ora: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    });
    salvaPastiOggi(pasti);
    renderAlimentazione();
}

async function stimaEAggiungiPasto(alimento, peso, immagineBase64) {
    const res = await fetch('/api/stima-calorie', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alimento, peso, immagine: immagineBase64 || null })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.dettaglio || data.errore || 'Stima non riuscita.');
    aggiungiPastoAllElenco(data.nome || alimento, data.calorie, data.proteine_g, data.carboidrati_g, data.grassi_g);
}

// Inserimento manuale: se i valori sono "per 100g" li scala in base al peso,
// se sono "per porzione" li usa così come sono (il peso è solo indicativo).
function aggiungiPastoManuale(alimento, peso, calorie, proteine, carboidrati, grassi) {
    const fattore = baseManuale === '100g' ? (Number(peso) / 100) : 1;
    aggiungiPastoAllElenco(
        alimento,
        calorie * fattore,
        proteine * fattore,
        carboidrati * fattore,
        grassi * fattore
    );
}

// Converte il file immagine scelto in una data URL base64 da mandare al server
function leggiFileComeDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
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

// Somma le calorie mangiate in un giorno specifico (chiave YYYY-MM-DD)
function calorieMangiateIlGiorno(chiave) {
    const tutti = JSON.parse(localStorage.getItem('liberoflow_pasti') || '{}');
    return (tutti[chiave] || []).reduce((s, p) => s + p.calorie, 0);
}

function formattaDeficit(valore) {
    // deficit positivo = si è mangiato meno del dispendio (buono per dimagrire)
    const segno = valore >= 0 ? '-' : '+';
    return `${segno}${Math.abs(Math.round(valore))}`;
}

function renderDeficit() {
    const dispendio = leggiDispendioEnergetico();
    const oggi = chiaveGiornoOggi();
    const mangiateOggi = calorieMangiateIlGiorno(oggi);
    const deficitOggi = dispendio - mangiateOggi;

    let deficitSettimana = 0;
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const chiave = d.toISOString().slice(0, 10);
        deficitSettimana += dispendio - calorieMangiateIlGiorno(chiave);
    }

    const elOggi = document.getElementById('deficit-oggi');
    const elSettimana = document.getElementById('deficit-settimana');
    elOggi.textContent = `${formattaDeficit(deficitOggi)} kcal`;
    elOggi.className = `text-2xl font-extrabold ${deficitOggi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    elSettimana.textContent = `${formattaDeficit(deficitSettimana)} kcal`;
    elSettimana.className = `text-2xl font-extrabold ${deficitSettimana >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    document.getElementById('deficit-dispendio-label').textContent = `dispendio ${dispendio} kcal/giorno`;
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
    renderDeficit();

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

document.getElementById('food-etichetta').addEventListener('change', (e) => {
    const testo = document.getElementById('food-etichetta-testo');
    const label = document.getElementById('food-label-etichetta');
    if (e.target.files[0]) {
        testo.textContent = `📎 ${e.target.files[0].name}`;
        label.classList.add('border-amber-500/60', 'text-amber-300');
    } else {
        testo.textContent = "Hai l'etichetta nutrizionale? Aggiungi una foto per una stima più precisa (opzionale)";
        label.classList.remove('border-amber-500/60', 'text-amber-300');
    }
});

document.getElementById('food-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alimentoInput = document.getElementById('food-alimento');
    const pesoInput = document.getElementById('food-peso');
    const fileInput = document.getElementById('food-etichetta');
    const btn = document.getElementById('food-submit-btn');

    const alimento = alimentoInput.value.trim();
    const peso = pesoInput.value;
    if (!alimento || !peso) return;

    document.getElementById('food-errore').classList.add('hidden');

    if (modoInserimento === 'manuale') {
        const calorie = document.getElementById('food-man-calorie').value;
        if (!calorie) return mostraErroreCibo('Inserisci almeno le calorie.');
        aggiungiPastoManuale(
            alimento, peso,
            Number(calorie),
            Number(document.getElementById('food-man-proteine').value || 0),
            Number(document.getElementById('food-man-carbo').value || 0),
            Number(document.getElementById('food-man-grassi').value || 0)
        );
        e.target.reset();
        impostaModoInserimento('manuale'); // il reset del form pulisce anche i bottoni: li reimposto
        impostaBaseManuale(baseManuale);
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Aggiunta in corso...';

    try {
        let immagineBase64 = null;
        if (fileInput.files[0]) immagineBase64 = await leggiFileComeDataUrl(fileInput.files[0]);

        await stimaEAggiungiPasto(alimento, peso, immagineBase64);
        alimentoInput.value = '';
        pesoInput.value = '';
        fileInput.value = '';
        document.getElementById('food-etichetta-testo').textContent = "Hai l'etichetta nutrizionale? Aggiungi una foto per una stima più precisa (opzionale)";
        document.getElementById('food-label-etichetta').classList.remove('border-amber-500/60', 'text-amber-300');
    } catch (err) {
        mostraErroreCibo(err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-plus"></i> Aggiungi alimento';
    }
});

impostaModoInserimento('ai');
impostaBaseManuale('100g');
renderAlimentazione();
