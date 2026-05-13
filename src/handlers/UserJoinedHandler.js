import { parseUser } from "../utils/helpers.js";
import { User } from "../core/User.js";

export default {
    name: "u", // Packet name

    async execute(bot, packet) {
        const userId = parseUser(packet.u);
        if (userId >= 1900000000) return;

        // Add user to cache
        const user = new User(packet);
        bot.state.addUser(userId, user);

        // --- ÚJ VÉDELEM: Ha a felhasználó bannolva van és a védelem be van kapcsolva ---
        if (bot.state.settings.autoKickBanned && user.isBanned()) {
            await bot.kick(userId, "A tiltott felhasználók számára tilos a belépés!");
            return; // Megállítjuk a folyamatot, hogy ne is kapjon üdvözlő üzenetet
        }

        // Fetch necessary values
        if (bot.state.settings.welcome_msg && bot.state.settings.welcome_msg != "off" && !user.hasBeenHere()) {
            const welcomeMessage = bot.state.settings.welcome_msg
                .replace("{chatname}", bot.state.chatInfo.name)
                .replace("{chatid}", bot.state.chatInfo.id)
                .replace("{user}", user.getRegname() || "Unregistered")
                .replace("{name}", user.getNick())
                .replace("{uid}", userId);

            // Send message via PM/PC
            await bot.reply(welcomeMessage, userId, bot.state.settings.welcome_type);
        }
    },
};
