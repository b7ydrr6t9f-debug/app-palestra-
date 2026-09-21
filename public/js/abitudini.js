// Sezione Abitudini (logica invariata rispetto alla versione originale, solo spostata qui)
let habits = JSON.parse(localStorage.getItem('liberoflow_habits')) || [
    { id: 1, name: 'Studio Semestre Filtro (Biologia/Chimica)', completed: false },
    { id: 2, name: 'Sessione di programmazione', completed: false }
];

function saveData() {
    localStorage.setItem('liberoflow_habits', JSON.stringify(habits));
    renderHabits();
}

function toggleHabit(id) {
    habits = habits.map(h => h.id === id ? { ...h, completed: !h.completed } : h);
    saveData();
}

function deleteHabit(id) {
    habits = habits.filter(h => h.id !== id);
    saveData();
}

function renderHabits() {
    const listEl = document.getElementById('habits-list');
    listEl.innerHTML = '';

    if (habits.length === 0) {
        listEl.innerHTML = `<div class="text-center py-10 text-slate-500 text-sm">Nessuna abitudine inserita. Aggiungine una qui sopra!</div>`;
        document.getElementById('completed-count').innerText = `0 / 0`;
        return;
    }

    let completed = 0;
    habits.forEach(habit => {
        if (habit.completed) completed++;
        const div = document.createElement('div');
        div.className = `card-glass p-4 rounded-2xl flex items-center justify-between border transition ${habit.completed ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-slate-800'}`;
        div.innerHTML = `
            <div class="flex items-center space-x-4 cursor-pointer flex-1" onclick="toggleHabit(${habit.id})">
                <div class="w-7 h-7 rounded-lg border-2 flex items-center justify-center transition ${habit.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 bg-slate-900'}">
                    ${habit.completed ? '<i class="fa-solid fa-check text-xs"></i>' : ''}
                </div>
                <span class="text-sm font-medium ${habit.completed ? 'line-through text-slate-400' : 'text-white'}">${habit.name}</span>
            </div>
            <button onclick="deleteHabit(${habit.id})" class="text-slate-500 hover:text-red-400 p-2 transition">
                <i class="fa-solid fa-trash-can text-sm"></i>
            </button>
        `;
        listEl.appendChild(div);
    });

    document.getElementById('completed-count').innerText = `${completed} / ${habits.length}`;
}

document.getElementById('habit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('habit-input');
    if (input.value.trim() === '') return;

    habits.push({
        id: Date.now(),
        name: input.value.trim(),
        completed: false
    });

    input.value = '';
    saveData();
});

renderHabits();
