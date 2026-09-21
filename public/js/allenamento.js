// Sezione Allenamento: log di esercizi (serie/ripetizioni/peso) raggruppato
// per giorno, con lo storico delle sessioni precedenti sotto quella di oggi.

function leggiAllenamenti() {
    return JSON.parse(localStorage.getItem('liberoflow_allenamenti') || '{}');
}

function salvaAllenamenti(tutti) {
    localStorage.setItem('liberoflow_allenamenti', JSON.stringify(tutti));
}

function aggiungiEsercizio(esercizio, serie, ripetizioni, peso) {
    const tutti = leggiAllenamenti();
    const oggi = chiaveGiornoOggi();
    if (!tutti[oggi]) tutti[oggi] = [];
    tutti[oggi].push({ id: Date.now(), esercizio, serie, ripetizioni, peso });
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

function formattaGiorno(chiave) {
    const oggi = chiaveGiornoOggi();
    if (chiave === oggi) return 'Oggi';
    const d = new Date(chiave + 'T00:00:00');
    return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}

function renderAllenamento() {
    const tutti = leggiAllenamenti();
    const giorni = Object.keys(tutti).sort().reverse();
    const contenitore = document.getElementById('workout-history');

    if (giorni.length === 0) {
        contenitore.innerHTML = `<div class="text-center py-10 text-slate-500 text-sm">Nessun allenamento registrato ancora.</div>`;
        return;
    }

    contenitore.innerHTML = giorni.map(giorno => `
        <div class="card-glass rounded-2xl border border-slate-800 overflow-hidden">
            <div class="px-5 py-3 bg-slate-900/60 border-b border-slate-800">
                <h3 class="text-xs font-bold uppercase tracking-wider text-rose-400">${formattaGiorno(giorno)}</h3>
            </div>
            <div class="divide-y divide-slate-800/70">
                ${tutti[giorno].map(e => `
                    <div class="px-5 py-3 flex items-center justify-between">
                        <span class="text-sm text-white">${e.esercizio}</span>
                        <div class="flex items-center gap-3 shrink-0">
                            <span class="text-xs text-slate-400 font-mono">${e.serie}×${e.ripetizioni}${e.peso ? ' · ' + e.peso + 'kg' : ''}</span>
                            <button onclick="eliminaEsercizio('${giorno}', ${e.id})" class="text-slate-500 hover:text-red-400 p-1 transition">
                                <i class="fa-solid fa-trash-can text-xs"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

document.getElementById('workout-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const esercizio = document.getElementById('w-esercizio').value.trim();
    const serie = document.getElementById('w-serie').value;
    const ripetizioni = document.getElementById('w-ripetizioni').value;
    const peso = document.getElementById('w-peso').value;
    if (!esercizio || !serie || !ripetizioni) return;

    aggiungiEsercizio(esercizio, Number(serie), Number(ripetizioni), peso ? Number(peso) : null);
    e.target.reset();
});

renderAllenamento();
