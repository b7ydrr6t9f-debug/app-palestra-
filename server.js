const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione Database SQLite
const dbFile = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Errore apertura database', err.message);
    } else {
        console.log('Connesso al database SQLite.');
    }
});

// Creazione tabelle
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        type TEXT,
        exercise TEXT,
        sets INTEGER,
        reps INTEGER,
        weight REAL,
        calories INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week_date TEXT,
        waist REAL,
        chest REAL,
        weight REAL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS nutrition (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        calories_in INTEGER,
        calories_out INTEGER,
        target_calories INTEGER
    )`);
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Allenamenti
app.get('/api/workouts', (req, res) => {
    db.all(`SELECT * FROM workouts ORDER BY date DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/workouts', (req, res) => {
    const { date, type, exercise, sets, reps, weight, calories } = req.body;
    db.run(`INSERT INTO workouts (date, type, exercise, sets, reps, weight, calories) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [date, type, exercise, sets, reps, weight, calories],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        });
});

// API Misure (Vita, Petto, Calendario settimanale)
app.get('/api/measurements', (req, res) => {
    db.all(`SELECT * FROM measurements ORDER BY week_date DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/measurements', (req, res) => {
    const { week_date, waist, chest, weight } = req.body;
    db.run(`INSERT INTO measurements (week_date, waist, chest, weight) VALUES (?, ?, ?, ?)`,
        [week_date, waist, chest, weight],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        });
});

// API Nutrizione / Deficit / Surplus
app.get('/api/nutrition', (req, res) => {
    db.all(`SELECT * FROM nutrition ORDER BY date DESC LIMIT 7`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/nutrition', (req, res) => {
    const { date, calories_in, calories_out, target_calories } = req.body;
    db.run(`INSERT INTO nutrition (date, calories_in, calories_out, target_calories) VALUES (?, ?, ?, ?)`,
        [date, calories_in, calories_out, target_calories],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        });
});

app.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});
