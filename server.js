const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database SQLite
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Errore database:', err.message);
    } else {
        console.log('Connesso al database SQLite.');
        db.run(`CREATE TABLE IF NOT EXISTS workouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            type TEXT,
            workout_category TEXT,
            duration INTEGER,
            calories INTEGER,
            notes TEXT
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS measurements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            weight REAL,
            calories_target INTEGER,
            calories_consumed INTEGER
        )`);
    }
});

// Configurazione Gemini API
const apiKey = process.env.GEMINI_API_KEY; 
let model;
if (apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Gemini API configurata.");
} else {
    console.warn("ATTENZIONE: GEMINI_API_KEY non trovata.");
}

// API: Ottieni allenamenti
app.get('/api/workouts', (req, res) => {
    db.all("SELECT * FROM workouts ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API: Salva allenamento
app.post('/api/workouts', (req, res) => {
    const { date, type, workout_category, duration, calories, notes } = req.body;
    const query = `INSERT INTO workouts (date, type, workout_category, duration, calories, notes) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(query, [date, type, workout_category, duration, calories, notes], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, success: true });
    });
});

// Endpoint AI
app.post('/api/ask-ai', async (req, res) => {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Domanda obbligatoria.' });
    if (!model) return res.status(503).json({ error: 'Servizio AI non disponibile.' });

    try {
        const result = await model.generateContent(question);
        res.json({ answer: result.response.text() });
    } catch (error) {
        console.error("Errore Gemini:", error);
        res.status(500).json({ error: "Errore interno AI." });
    }
});

app.listen(port, () => {
    console.log(`Server in ascolto sulla porta ${port}`);
});
