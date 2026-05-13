import { config } from 'dotenv';
import { sequelize } from './core/Database.js';
import { Bot } from './core/Bot.js';
import http from 'http';

config();

// 1. Létrehozzuk az egyszerű weboldalt a felhőszolgáltatók miatt
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.write(`
        <html>
            <head>
                <title>xat Bot Állapot</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background-color: #121212; color: #00ff00; }
                    .box { display: inline-block; padding: 20px; border: 2px solid #00ff00; border-radius: 10px; }
                </style>
            </head>
            <body>
                <div class="box">
                    <h1>✅ A xat.com bot aktív és fut! 🚀</h1>
                    <p>A szerver állapota: Online</p>
                </div>
            </body>
        </html>
    `);
    res.end();
});

// A port beállítása (Felhőszolgáltatók általában a process.env.PORT-ot használják)
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`[WEBSERVER] A weboldal sikeresen elindult a ${PORT}-es porton!`);
});

// 2. Eredeti bot indítása
(async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync();
        new Bot();
        console.log("[BOT] Adatbázis csatlakoztatva, bot indítása folyamatban...");
    } catch (error) {
        console.error("Hiba az indításkor:", error);
    }
})();
