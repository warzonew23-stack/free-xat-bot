import { config } from 'dotenv';
import { sequelize } from './core/Database.js';
import { Bot } from './core/Bot.js';

config();

let botInstance = null;

export default async function handler(req, res) {
    if (!botInstance) {
        console.log("[BOT] Adatbázis indítása Vercelen...");
        await sequelize.authenticate();
        await sequelize.sync();
        botInstance = new Bot();
    }

    // 1. Megkezdjük a válaszadást a böngészőnek, de NEM zárjuk le!
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.write(`
        <html>
        <body style="background-color: black; color: lime; text-align: center; font-family: Arial;">
        <h2>A Vercel most épp futtatja a botot...</h2>
        <p>Nézd a TestRadio42 szobát! A botnak most kell belépnie.</p>
    `);

    // 2. A TRÜKK: Várakoztatjuk a Vercelt 9 másodpercig. 
    // A Vercel ingyenes (Hobby) csomagja 10 másodperc után amúgy is levágja a kérést.
    // Ezalatt a 9 másodperc alatt a bot zavartalanul kommunikálhat az xat.com-mal.
    await new Promise(resolve => setTimeout(resolve, 9000));

    // 3. Lezárjuk a kapcsolatot.
    res.write(`<p>A 9 másodperc letelt. A Vercel most megszakítja a háttérfolyamatot, a bot nemsokára kilép.</p>
        <p><b>Frissíts rá az oldalra (F5), ha azt akarod, hogy újra belépjen!</b></p>
        </body></html>
    `);
    res.end();
}
