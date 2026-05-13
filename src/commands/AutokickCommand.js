export default {
    name: "autokick", // Command name

    async execute(bot, xatID, message, from) {
        if (!bot.hasPermission(xatID, from)) return;

        if (!message) {
            return await bot.reply(
                `Az Auto-Kick a tiltottakra jelenleg: ${bot.state.settings.autoKickBanned ? '*BE*' : '*KI*'} van kapcsolva. Használat: !autokick on / off`,
                xatID,
                from
            );
        }

        const normalizedMessage = message.trim().toLowerCase();
        
        if (!["off", "on"].includes(normalizedMessage)) {
            return await bot.reply(
                "Érvénytelen parancs! Használat: *!autokick on* vagy *!autokick off*.",
                xatID,
                from
            );
        }

        const bekapcsolva = normalizedMessage === 'on';

        await bot.updateDb({ autoKickBanned: bekapcsolva });

        await bot.reply(
            `Auto-Kick védelem: ${bekapcsolva ? '*BEKAPCSOLVA*' : '*KIKAPCSOLVA*'}`,
            xatID,
            from
        );

        await bot.restart();
    },
};
