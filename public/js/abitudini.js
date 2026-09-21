// Sezione Abitudini: lista di abitudini + storico giornaliero di quali sono
// state completate ogni giorno (serve sia per il reset a mezzanotte sia per
// calcolare la streak reale, che prima non esisteva).

let habits = JSON.parse(localStorage.getItem('liberoflow_habits')) || [
    { id: 1, name: 'Studio Semestre Filtro (Biologia/Chimica)' },
    { id: 2, name: 'Sessione di programmazione' }
];
// Storico: { "YYYY-MM-DD": [id1, id2, ...] } — quali abitudini erano completate quel giorno
let habitHistory = JSON.parse(localStorage.getItem('liberoflow_habit_history')) || {};

function habitsCompletatiOggi() {
    return habitHistory[chiaveGiornoOggi()] || [];
}

function saveHabits() {
    localStorage.setItem('liberoflow_habits', JSON.stringify(habits));
}
function saveHistory() {
    localStorage.setItem('liberoflow_habit_history', JSON.stringify(habitHistory));
}

function toggleHabit(id) {
    const oggi = chiaveGiornoOggi();
    const completatiOggi = habitHistory[oggi] || [];
    habitHistory[oggi] = completatiOggi.includes(id)
        ? completatiOggi.filter(x => x !== id)
        : [...completatiOggi, id];
    saveHistory();
    renderHabits();
}

function deleteHabit(id) {
    habits = habits.filter(h => h.id !== id);
    saveHabits();
    renderHabits();
}

function editHabit(id) {
    const habit = habits.find(h => h.id === id);
    const nuovoNome = prompt('Modifica il nome dell\'abitudine:', habit.name);
    if (nuovoNome === null || nuovoNome.trim() === '') return;
    habit.name = nuovoNome.trim();
    saveHabits();
    renderHabits();
}

// Streak globale: giorni consecutivi (fino a oggi, o fino a ieri se oggi non
// è ancora completo) in cui TUTTE le abitudini attuali risultano completate.
function calcolaStreak() {
    if (habits.length === 0) return 0;
    const idsAttuali = habits.map(h => h.id);
    const tuttiCompletati = (chiave) => {
        const fatti = habitHistory[chiave] || [];
        return idsAttuali.every(id => fatti.includes(id));
    };

    let cursore = new Date();
    // Se oggi non è (ancora) completo, la streak parte da ieri, non si azzera subito
    if (!tuttiCompletati(chiaveGiornoOggi())) {
        cursore.setDate(cursore.getDate() - 1);
    }

    let streak = 0;
    while (true) {
        const chiave = cursore.toISOString().slice(0, 10);
        if (!tuttiCompletati(chiave)) break;
        streak++;
        cursore.setDate(cursore.getDate() - 1);
    }
    return streak;
}

function renderHabits() {
    const listEl = document.getElementById('habits-list');
    listEl.innerHTML = '';
    const completatiOggi = habitsCompletatiOggi();

    if (habits.length === 0) {
        listEl.innerHTML = `<div class="text-center py-10 text-slate-500 text-sm">Nessuna abitudine inserita. Aggiungine una qui sopra!</div>`;
        document.getElementById('completed-count').innerText = `0 / 0`;
        document.getElementById('streak-count').innerText = `🔥 0 giorni`;
        return;
    }

    habits.forEach(habit => {
        const completato = completatiOggi.includes(habit.id);
        const div = document.createElement('div');
        div.className = `card-glass p-4 rounded-2xl flex items-center justify-between border transition ${completato ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-slate-800'}`;
        div.innerHTML = `
            <div class="flex items-center space-x-4 cursor-pointer flex-1" onclick="toggleHabit(${habit.id})">
                <div class="w-7 h-7 rounded-lg border-2 flex items-center justify-center transition ${completato ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 bg-slate-900'}">
                    ${completato ? '<i class="fa-solid fa-check text-xs"></i>' : ''}
                </div>
                <span class="text-sm font-medium ${completato ? 'line-through text-slate-400' : 'text-white'}">${habit.name}</span>
            </div>
            <div class="flex items-center gap-1">
                <button onclick="editHabit(${habit.id})" class="text-slate-500 hover:text-indigo-400 p-2 transition">
                    <i class="fa-solid fa-pen text-sm"></i>
                </button>
                <button onclick="deleteHabit(${habit.id})" class="text-slate-500 hover:text-red-400 p-2 transition">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            </div>
        `;
        listEl.appendChild(div);
    });

    document.getElementById('completed-count').innerText = `${completatiOggi.length} / ${habits.length}`;
    document.getElementById('streak-count').innerText = `🔥 ${calcolaStreak()} giorni`;
}

document.getElementById('habit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('habit-input');
    if (input.value.trim() === '') return;

    habits.push({ id: Date.now(), name: input.value.trim() });
    input.value = '';
    saveHabits();
    renderHabits();
});

renderHabits();
