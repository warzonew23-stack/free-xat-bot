import { writeFile } from 'fs/promises';

export default {
    name: 'v', // Packet name

    async execute (bot, packet) {
        if (packet.e) {
            if ([21, 36].includes(parseInt(packet.e))) {
                return await bot.connect();
            }

            bot.logger.error(`Login error: ${packet.e}. Please try again.`);

            // VERCEL JAVÍTÁS: /tmp használata
            await writeFile('/tmp/login.json', '{}'); 

            return;
        }

        if (packet.n) {
            // VERCEL JAVÍTÁS: /tmp használata
            await writeFile('/tmp/login.json', JSON.stringify(packet)); 

            bot.state.loginInfo = packet;

            if (bot.state.isLoggingIn) {
                bot.state.isLoggingIn = false;
                bot.restart();
            }
        }
    }
}
