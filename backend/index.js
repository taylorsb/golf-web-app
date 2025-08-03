const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3001;

app.use(express.json());

// Connect to SQLite database
const db = new sqlite3.Database('./golf.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the golf database.');
        // Create tables if they don't exist
        db.run(`CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            handicap INTEGER
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            holes INTEGER
        )`);
        // Add more table creations as needed for tournaments, rounds, scores
    }
});

// Basic API endpoint
app.get('/', (req, res) => {
    res.send('Golf App Backend is running!');
});

// Example: Get all players
app.get('/players', (req, res) => {
    db.all('SELECT * FROM players', [], (err, rows) => {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
