import { Sequelize } from "sequelize";
import sqlite3 from "sqlite3"; // Ezzel rákényszerítjük a Vercelt, hogy csomagolja be!

export const sequelize = new Sequelize({
    dialect: "sqlite",
    dialectModule: sqlite3, // Megmondjuk neki, hogy használja a betöltött modult
    storage: "/tmp/database.db", // A Vercelen csak a /tmp mappába van jogunk írni!
    logging: false
});
