# Tempra Gym

Tempra Gym è un’applicazione web multi-utente per registrare allenamenti, monitorare carichi e volume, salvare check-in fisici e seguire i progressi nel tempo.

## Funzionalità

- Registrazione e accesso con email e password
- Sessioni sicure tramite cookie HttpOnly
- Ogni utente accede esclusivamente ai propri dati
- Registrazione di esercizi, serie, ripetizioni e carico
- Calcolo automatico del volume sollevato
- Cronologia degli allenamenti raggruppata per giorno
- Grafico di progressione per esercizio
- Check-in con peso e misure corporee
- Profilo personale con nome, email, obiettivo, dispendio energetico e data di iscrizione
- Interfaccia premium sportiva, dark mode e neon verde lime

## Installazione

```bash
npm install
cp .env.example .env
npm start
```

Aggiungi nel file `.env`:

```env
SESSION_SECRET=una-stringa-lunga-e-casuale
PORT=10000
```

Per dati persistenti in produzione configura Turso:

```env
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...
```

## API

| Metodo | Endpoint | Descrizione |
|---|---|---|
| POST | `/api/auth/register` | Crea un account |
| POST | `/api/auth/login` | Accede |
| POST | `/api/auth/logout` | Termina la sessione |
| GET | `/api/auth/me` | Dati dell’utente collegato |
| PATCH | `/api/profile` | Aggiorna profilo e obiettivi |
| GET/POST | `/api/workouts` | Legge o crea allenamenti |
| DELETE | `/api/workouts/:id` | Elimina un esercizio |
| GET/POST | `/api/checkin` | Legge o crea check-in |
| DELETE | `/api/checkin/:id` | Elimina un check-in |

## Deploy

Configura `SESSION_SECRET`, `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` nella piattaforma di deploy, quindi avvia:

```bash
npm start
```
