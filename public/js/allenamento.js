// Sezione Allenamento: log di esercizi (serie/ripetizioni/peso) raggruppato
// per giorno, storico modificabile, data retroattiva selezionabile, volume
// totale per sessione, icona del gruppo muscolare (riconosciuto per parole
// chiave dal nome dell'esercizio) e grafico di progressione per esercizio.

// Riconoscimento del gruppo muscolare per parole chiave (italiano + inglese
// comune). Istantaneo e gratuito: non serve chiamare un'AI per classificare
// ogni esercizio, il nome basta quasi sempre.
const GRUPPI_MUSCOLARI = [
    { gruppo: 'Spalle', emoji: '🎯', chiavi: ['spalle', 'shoulder', 'military', 'lento avanti', 'lento dietro', 'lento manubri', 'alzate laterali', 'alzate frontali', 'arnold press', 'lateral raise', 'overhead press', 'deltoid'] },
    { gruppo: 'Petto', emoji: '💪', chiavi: ['panca', 'pettorali', 'petto', 'bench', 'chest', 'croci', 'fly', 'push up', 'piegamenti', 'dip'] },
    { gruppo: 'Schiena', emoji: '🦾', chiavi: ['schiena', 'trazioni', 'pull up', 'lat machine', 'pulley', 'rematore', 'row', 'stacco', 'deadlift', 'back', 'lat'] },
    { gruppo: 'Gambe', emoji: '🦵', chiavi: ['gambe', 'squat', 'leg', 'affondi', 'lunge', 'polpacci', 'calf', 'quadricipiti', 'femorali', 'glutei', 'hip thrust', 'pressa'] },
    { gruppo: 'Braccia', emoji: '💪', chiavi: ['bicipiti', 'tricipiti', 'curl', 'bicep', 'tricep', 'french press', 'braccio', 'braccia'] },
    { gruppo: 'Addome', emoji: '🔥', chiavi: ['addominali', 'plank', 'crunch', 'addome', 'core', 'sit up'] },
    { gruppo: 'Cardio', emoji: '🏃', chiavi: ['corsa', 'running', 'cardio', 'bici', 'cyclette', 'tapis', 'ellittica', 'vogatore', 'rowing machine'] },
];

function riconosciGruppoMuscolare(nomeEsercizio) {
    const nome = nomeEsercizio.toLowerCase();
    for (const g of GRUPPI_MUSCOLARI) {
        if (g.chiavi.some(k => nome.includes(k))) return g;
    }
    return { gruppo: 'Altro', emoji: '🏋️' };
}

function leggiAllenamenti() {
    return JSON.parse(localStorage.getItem('liberoflow_allenamenti') || '{}');
}
function salvaAllenamenti(tutti) {
    localStorage.setItem('liberoflow_allenamenti', JSON.stringify(tutti));
}

function aggiungiEsercizio(esercizio, serie, ripetizioni, peso, giorno) {
    const tutti = leggiAllenamenti();
    if (!tutti[giorno]) tutti[giorno] = [];
    tutti[giorno].push({ id: Date.now(), esercizio, serie, ripetizioni, peso });
    salvaAllenamenti(tutti);
    renderAllenamento();
}

function eliminaEsercizio(giorno, id) {
    const tutti = leggiAllenamenti();
    tutti[giorno] = (tutti[giorno] || []).filter(e => e.id !== id);
    if (tutti[giorno].length === 0) delete tutti[giorno];
    salvaAllenamenti(tutti);
    renderAllenamento();
}

function modificaEsercizio(giorno, id) {
    const tutti = leggiAllenamenti();
    const voce = (tutti[giorno] || []).find(e => e.id === id);
    if (!voce) return;

    const nuoveSerie = prompt('Serie:', voce.serie);
    if (nuoveSerie === null || isNaN(Number(nuoveSerie))) return;
    const nuoveRip = prompt('Ripetizioni:', voce.ripetizioni);
    if (nuoveRip === null || isNaN(Number(nuoveRip))) return;
    const nuovoPeso = prompt('Kg (lascia vuoto se a corpo libero):', voce.peso ?? '');

    voce.serie = Number(nuoveSerie);
    voce.ripetizioni = Number(nuoveRip);
    voce.peso = nuovoPeso === '' || nuovoPeso === null ? null : Number(nuovoPeso);

    salvaAllenamenti(tutti);
    renderAllenamento();
}

function formattaGiorno(chiave) {
    const oggi = chiaveGiornoOggi();
    const ieri = new Date();
    ieri.setDate(ieri.getDate() - 1);
    const chiaveIeri = ieri.toISOString().slice(0, 10);

    if (chiave === oggi) return 'Oggi';
    if (chiave === chiaveIeri) return 'Ieri';
    const d = new Date(chiave + 'T00:00:00');
    return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Volume totale della sessione: somma di serie × ripetizioni × peso per ogni
// esercizio con un peso registrato (gli esercizi a corpo libero non hanno un
// peso su cui calcolare il volume e vengono esclusi dal totale).
function calcolaVolumeGiorno(voci) {
    return voci.reduce((tot, e) => tot + (e.peso ? e.serie * e.ripetizioni * e.peso : 0), 0);
}

// Elenco esercizi unici mai registrati, per il selettore del grafico
function elencoEserciziUnici() {
    const tutti = leggiAllenamenti();
    const nomi = new Set();
    Object.values(tutti).flat().forEach(e => nomi.add(e.esercizio));
    return [...nomi].sort();
}

function disegnaGraficoEsercizio(nomeEsercizio) {
    const svg = document.getElementById('esercizio-sparkline');
    if (!nomeEsercizio) {
        svg.innerHTML = '';
        return;
    }
    const tutti = leggiAllenamenti();
    const punti = [];
    Object.keys(tutti).sort().forEach(giorno => {
        const pesiDelGiorno = tutti[giorno].filter(e => e.esercizio === nomeEsercizio && e.peso != null).map(e => e.peso);
        if (pesiDelGiorno.length > 0) punti.push({ giorno, peso: Math.max(...pesiDelGiorno) });
    });

    if (punti.length < 2) {
        svg.innerHTML = `<text x="150" y="45" text-anchor="middle" fill="#64748b" font-size="11">Servono almeno due sessioni con peso registrato</text>`;
        return;
    }
    const pesi = punti.map(p => p.peso);
    const min = Math.min(...pesi), max = Math.max(...pesi);
    const range = max - min || 1;
    const coords = pesi.map((p, i) => {
        const x = (i / (pesi.length - 1)) * 290 + 5;
        const y = 70 - ((p - min) / range) * 60;
        return `${x},${y}`;
    }).join(' ');
    const ultimo = coords.split(' ').at(-1).split(',');
    svg.innerHTML = `
        <polyline points="${coords}" fill="none" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${ultimo[0]}" cy="${ultimo[1]}" r="4" fill="#f43f5e"/>
    `;
}

function popolaSelectEsercizi() {
    const select = document.getElementById('select-esercizio-grafico');
    const attuale = select.value;
    const esercizi = elencoEserciziUnici();
    select.innerHTML = '<option value="">Scegli un esercizio...</option>' +
        esercizi.map(nome => `<option value="${nome}">${nome}</option>`).join('');
    if (esercizi.includes(attuale)) select.value = attuale;
}

function renderAllenamento() {
    const tutti = leggiAllenamenti();
    const giorni = Object.keys(tutti).sort().reverse();
    const contenitore = document.getElementById('workout-history');

    if (giorni.length === 0) {
        contenitore.innerHTML = `<div class="text-center py-10 text-slate-500 text-sm">Nessun allenamento registrato ancora.</div>`;
    } else {
        contenitore.innerHTML = giorni.map(giorno => `
            <div class="card-glass rounded-2xl border border-slate-800 overflow-hidden">
                <div class="px-5 py-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-rose-400">${formattaGiorno(giorno)}</h3>
                    <span class="text-[11px] text-slate-500 font-mono">Volume: ${calcolaVolumeGiorno(tutti[giorno]).toLocaleString('it-IT')} kg</span>
                </div>
                <div class="divide-y divide-slate-800/70">
                    ${tutti[giorno].map(e => {
                        const { emoji, gruppo } = riconosciGruppoMuscolare(e.esercizio);
                        return `
                        <div class="px-5 py-3 flex items-center justify-between">
                            <span class="text-sm text-white flex items-center gap-2">
                                <span title="${gruppo}">${emoji}</span> ${e.esercizio}
                            </span>
                            <div class="flex items-center gap-3 shrink-0">
                                <span class="text-xs text-slate-400 font-mono">${e.serie}×${e.ripetizioni}${e.peso ? ' · ' + e.peso + 'kg' : ''}</span>
                                <button onclick="modificaEsercizio('${giorno}', ${e.id})" class="text-slate-500 hover:text-amber-400 p-1 transition">
                                    <i class="fa-solid fa-pen text-xs"></i>
                                </button>
                                <button onclick="eliminaEsercizio('${giorno}', ${e.id})" class="text-slate-500 hover:text-red-400 p-1 transition">
                                    <i class="fa-solid fa-trash-can text-xs"></i>
                                </button>
                            </div>
                        </div>
                    `;}).join('')}
                </div>
            </div>
        `).join('');
    }

    popolaSelectEsercizi();
    disegnaGraficoEsercizio(document.getElementById('select-esercizio-grafico').value);
}

document.getElementById('workout-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const esercizio = document.getElementById('w-esercizio').value.trim();
    const serie = document.getElementById('w-serie').value;
    const ripetizioni = document.getElementById('w-ripetizioni').value;
    const peso = document.getElementById('w-peso').value;
    const data = document.getElementById('w-data').value || chiaveGiornoOggi();
    if (!esercizio || !serie || !ripetizioni) return;

    aggiungiEsercizio(esercizio, Number(serie), Number(ripetizioni), peso ? Number(peso) : null, data);
    e.target.reset();
    document.getElementById('w-data').value = chiaveGiornoOggi();
});

document.getElementById('select-esercizio-grafico').addEventListener('change', (e) => {
    disegnaGraficoEsercizio(e.target.value);
});

document.getElementById('w-data').value = chiaveGiornoOggi();
document.getElementById('w-data').max = chiaveGiornoOggi();
renderAllenamento();
