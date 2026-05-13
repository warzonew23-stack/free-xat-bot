import { config } from 'dotenv';
import { sequelize } from './core/Database.js';
import { Bot } from './core/Bot.js';

config();

let botInitialized = false;

// Bot indító funkció
async function initBot() {
    if (botInitialized) return;
    try {
        await sequelize.authenticate();
        await sequelize.sync();
        new Bot();
        console.log("[BOT] Adatbázis csatlakoztatva, bot indítása folyamatban...");
        botInitialized = true;
    } catch (error) {
        console.error("Hiba az indításkor:", error);
    }
}

// Ezt a függvényt hívja meg a Vercel
export default async function handler(req, res) {
    // Elindítjuk a botot, amikor a weboldal betöltődik
    await initBot();

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`
        <html>
            <head>
                <title>xat Bot Vercel</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background-color: #121212; color: #00ff00; }
                    .box { display: inline-block; padding: 20px; border: 2px solid #00ff00; border-radius: 10px; }
                </style>
            </head>
            <body>
                <div class="box">
                    <h1>✅ A xat.com bot sikeresen telepítve Vercelen! 🚀</h1>
                    <p>Mivel a Vercel szerver nélküli, ezt az oldalt érdemes nyitva hagyni.</p>
                </div>
            </body>
        </html>
    `);
}
