export default {
    name: "banip", // Parancs: !banip

    async execute(bot, xatID, message, from) {
        if (!bot.hasPermission(xatID, from)) return;

        const args = message.trim().split(/\s+/);
        const targetID = args[0];
        const hours = args[1] || 1; // Ha nem adsz meg időt, 1 órára tiltja

        if (!targetID || isNaN(targetID)) {
            return await bot.reply("Használat: !banip [ID] [óra]", xatID, from);
        }

        // 'gi' típust használunk, ami az xat-nél a Global IP ban
        await bot.ban(targetID, hours, "IP-tiltás", "gi");

        await bot.reply(`ID ${targetID} IP-címe tiltva ${hours} órára.`, xatID, from);
    },
};
