import { config } from 'dotenv';
import { sequelize } from './core/Database.js';
import { Bot } from './core/Bot.js';

config();

let botInstance = null;

export default async function handler(req, res) {
    if (!botInstance) {
        try {
            console.log("[BOT] Felhő adatbázis csatlakoztatása...");
            await sequelize.authenticate();
            await sequelize.sync();
            botInstance = new Bot();
        } catch (error) {
            console.error("Adatbázis hiba:", error);
            return res.status(500).send("Hiba az adatbázis csatlakozásakor.");
        }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.write(`
        <html>
        <body style="background-color: #121212; color: #00ff00; text-align: center; font-family: Arial; margin-top: 50px;">
        <h2>Vercel xat.com Bot Aktív! 🚀</h2>
        <p>A bot bent van a chaten és 59 másodpercig figyel a parancsokra.</p>
    `);

    // MAXIMALIZÁLT IDŐ: 59 másodperc
    await new Promise(resolve => setTimeout(resolve, 59000));

    res.write(`<p>Az 1 perces ciklus lezárult. A cron-job nemsokára újraindítja.</p></body></html>`);
    res.end();
}
