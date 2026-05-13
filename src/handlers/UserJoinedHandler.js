import { parseUser } from "../utils/helpers.js";
import { User } from "../core/User.js";

export default {
    name: "u", // Packet name

    async execute(bot, packet) {
        const userId = parseUser(packet.u);
        if (userId >= 1900000000) return;

        // Felhasználó hozzáadása a memóriához
        const user = new User(packet);
        bot.state.addUser(userId, user);

        // --- CSENDES AUTO-KICK ---
        // Ha a felhasználó tiltva van (barna gyalog) és a védelem aktív
        if (bot.state.settings.autoKickBanned && user.isBanned()) {
            // Üresen hagyjuk az indoklást (""), így a bot nem küld üzenetet a chatre
            await bot.kick(userId, ""); 
            return;
        }
        // --- VÉGE ---

        // Üdvözlő üzenet (ha be van kapcsolva)
        if (bot.state.settings.welcome_msg && bot.state.settings.welcome_msg != "off" && !user.hasBeenHere()) {
            const welcomeMessage = bot.state.settings.welcome_msg
                .replace("{chatname}", bot.state.chatInfo.name)
                .replace("{chatid}", bot.state.chatInfo.id)
                .replace("{user}", user.getRegname() || "Unregistered")
                .replace("{name}", user.getNick())
                .replace("{uid}", userId);

            await bot.reply(welcomeMessage, userId, bot.state.settings.welcome_type);
        }
    },
};
