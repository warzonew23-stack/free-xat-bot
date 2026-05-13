import { promises as fs } from "fs";
import { setupLogger } from "../services/logger.js";
import { BotState } from "../services/state.js";
import { WebSocketData } from "../services/websocket.js";
import { XatBlogAPI } from "../api/XatBlogAPI.js";
import { sanitize, runIfConnected } from "../utils/helpers.js";
import { PacketHandler } from "./PacketHandler.js";
import { CommandHandler } from "./CommandHandler.js";
import { Settings } from "../models/Settings.js";
import { OpenAI } from "../api/OpenAI.js";

export class Bot {
    constructor() {
        this.logger = setupLogger();
        this.state = new BotState();

        this.OpenAI = new OpenAI(this.state);
        this.xatBlogAPI = new XatBlogAPI();

        this.packetHandler = new PacketHandler(this);
        this.commandHandler = new CommandHandler(this);

        this.init();
    }

    async init () {
        try {
            await this.getFromDb();

            if (!this.state.settings) {
                await Settings.create({ id: 1 });
                await this.getFromDb();
            }

            await this.getChatInfo();
            await this.packetHandler.init();
            await this.commandHandler.init();

            try {
                const data = await fs.readFile('./badwords.json', 'utf-8');
                const allBadwords = JSON.parse(data);
                const lang = (this.state.envData.language || 'en').toLowerCase();
                if (lang === 'all') {
                    const merged = Object.values(allBadwords).flat();
                    this.state.badwords = Array.from(new Set(merged.map(w => (w || '').trim().toLowerCase()).filter(Boolean)));
                } else {
                    this.state.badwords = allBadwords[lang] || allBadwords['en'] || [];
                }
            } catch (e) { }

            await this.login();
            await this.connect();
            await this.keepRunning();
        } catch (error) {
            this.logger.error(`Init error: ${error.message} - ${error.stack}`);
            process.exit(1);
        }
    }

    async login () {
        var loginData;

        try {
            // VERCEL JAVÍTÁS: /tmp használata
            loginData = JSON.parse(await fs.readFile("/tmp/login.json", "utf-8"));
        } catch { }

        if (loginData?.i === undefined) {
            this.state.isLoggingIn = true;
        } else {
            this.state.loginInfo = loginData;
        }
    }

    async connect (room = 0) {
        this.state.ws = WebSocketData(this, room);
    }

    async send (name, data) {
        if (!this.state.ws) return;

        try {
            let packet = `<${name} `;

            for (const [key, value] of Object.entries(data)) {
                if (value !== false) {
                    packet += `${key}="${sanitize(value.toString())}" `;
                }
            }
            packet += packet.endsWith(" ") ? "/>" : " />";
            this.logger.info(`>> ${packet}`);
            this.state.ws.send(packet + "\x00");
        } catch (error) {
            this.logger.error(`Send error: ${error.message} - ${error.stack}`);
        }
    }

    async getChatInfo () {
        const data = await this.xatBlogAPI.chatInfo(this.state.envData.chat);
        if (!data?.chat?.id) {
            this.logger.error("Chat not found");
            process.exit(1);
        }
        this.state.chatInfo = data.chat;
    }

    async reply (message, userId, to) {
        if (to === "pm") {
            return await this.sendPM(message, userId);
        } else if (to === "pc") {
            return await this.sendPC(message, userId);
        }
        await this.sendMessage(message);
    }

    async sendPC (message, userId) {
        await this.send("p", {
            u: userId,
            t: message,
            s: 2,
            d: this.state.loginInfo.i,
        });
    }

    async sendPM (message, userId) {
        await this.send("p", {
            u: userId,
            t: message,
        });
    }

    async sendMessage (message) {
        await this.send("m", {
            t: message,
            u: this.state.loginInfo.i,
        });
    }

    async restart () {
        await this.send("C", {});
        this.state.isConnected = false;
        this.state.ws.terminate();
        this.connect();
    }

    async relogin () {
        await this.send("v", {
            n: this.state.loginInfo.i,
            p: 0,
        });
    }

    async getFromDb () {
        this.state.settings = await Settings.findOne({
            where: { id: 1 }
        });
    }

    async updateDb (toUpdate) {
        try {
            await Settings.update(toUpdate, {
                where: { id: 1 }
            });
            await this.getFromDb();
        } catch (error) {
            this.logger.error(`Error updating settings: ${error} - ${error.stack}`)
        }
    }

    async kick (userId, reason = '', sound = '') {
        const maxKicks = Number(this.state.settings.maxKicks);
        const banDurationHours = Number(this.state.settings.banDurationHours);
        const user = this.state.getUser(userId);

        if (!user || user.isMod() || user.isOwner() || user.isMain()) return;

        if (maxKicks > 0 && banDurationHours > 0) {
            const kicks = this.state.incrementKick(userId);
            reason += ` [${kicks}/${maxKicks}]`;

            if (kicks >= maxKicks) {
                this.state.resetKicks(userId);
                return this.ban(userId, banDurationHours, reason);
            }
        }

        this.send("c", {
            p: reason + sound,
            u: userId,
            t: '/k'
        });
    }

    async ban (userId, hours, reason, type = 'g', gamebanid = '') {
        if (hours < 0) hours = 1;

        const seconds = hours * 3600;

        const packet = {
            p: reason,
            u: userId,
            t: `/${type}${seconds}`
        };

        if (gamebanid) packet.w = gamebanid;

        this.send("c", packet);
    }

    async unban (userId) {
        this.send("c", {
            u: userId,
            t: '/u'
        });
    }

    async giveRank (userId, rank) {
        const rankCmd = {
            owner: '/M',
            moderator: '/m',
            member: '/e',
            guest: '/r',
        };

        if (!rankCmd[rank]) return;

        this.send("c", {
            u: userId,
            t: rankCmd[rank]
        });
    }

    async giveTempRank (userId, rank, hours) {
        if (!hours || hours < 1 || hours > 24) hours = 1;

        const rankCmd = {
            owner: '/mo',
            moderator: '/m',
            member: '/mb',
        };

        if (!rankCmd[rank]) return;

        await this.sendPC(userId, `${rankCmd[rank]}${hours}`);
    }

    async moderationFilters (userId, message) {
        if (!message || !userId) return;

        const capsLockDetect = this.state.settings.capsLockDetect ?? true;
        const capsLockMax = Number(this.state.settings.capsLockMax) || 5;
        const floodDetect = this.state.settings.floodDetect ?? true;
        const linesMax = Number(this.state.settings.linesMax) || 4;
        const spamDetect = this.state.settings.spamDetect ?? true;
        const maxLetters = Number(this.state.settings.maxLetters) || 4;
        const spamSmiliesDetect = this.state.settings.spamSmiliesDetect ?? true;
        const maxSmilies = Number(this.state.settings.maxSmilies) || 4;
        const linkDetect = this.state.settings.linkDetect ?? true;
        const openAiDetect = this.state.settings.openAiDetect ?? true;
        const inappDetect = this.state.settings.inappDetect ?? true;
        const linkWhitelist = (this.state.settings.linkWhitelist || '').split(',').map(s => s.trim()).filter(Boolean);

        const now = Date.now();
        let reason = null;

        if (capsLockDetect) {
            const text = message.replace(/\s*\([^)]*\)/g, '').trim();
            const caps = (text.match(/\b[A-Z]{2,}\b/g) || []).length;
            if (caps > capsLockMax)
                reason = `Too many words in caps (${caps}/${capsLockMax} allowed)`;
        }

        if (!reason && floodDetect) {
            if (this.state.lastMessageUserId !== userId || (now - this.state.lastMessageTimestamp > 30000))
                this.state.usersFlood[userId] = 1;
            else
                this.state.usersFlood[userId] = (this.state.usersFlood[userId] || 0) + 1;

            if (this.state.lastMessageUserId !== null && this.state.lastMessageUserId !== userId)
                this.state.usersFlood[this.state.lastMessageUserId] = 0;

            this.state.lastMessageUserId = userId;
            this.state.lastMessageTimestamp = now;

            if (this.state.usersFlood[userId] > linesMax) {
                this.state.usersFlood[userId] = 0;
                reason = `Flood detected: limit is ${linesMax} consecutive messages`;
            }
        }

        if (!reason && spamDetect) {
            const text = message.replace(/\s*\([^)]*\)/g, '').trim();
            for (const word of text.split(' ')) {
                const w = word.toLowerCase().replace(/[- =+*~.,?!|&%\[\]{}k]/g, '');
                if (w && new RegExp(`(.)\\1{${maxLetters},}`).test(w)) {
                    reason = `Repeated letters detected (max ${maxLetters} consecutive)`;
                    break;
                }
            }
        }

        if (!reason && spamSmiliesDetect) {
            const text = message.toLowerCase().replace(/[^a-z :()]/g, '');
            const smilies = [":)", ":d", ":p", ";)", ":s", ":$", ":@", ":'(", ":-*", ":("];
            let smilieCount = 0;
            for (const word of text.split(' ')) {
                if (word) {
                    if (word.startsWith('(') && !word.includes(' ')) smilieCount++;
                    if (smilies.includes(word)) smilieCount++;
                }
            }
            if (smilieCount > maxSmilies)
                reason = `Too many smilies. Limit is ${maxSmilies} per message`;
        }

        if (!reason && linkDetect) {
            const text = message.toLowerCase();
            let allowed = false;
            for (const wl of linkWhitelist) if (wl && text.includes(wl)) allowed = true;
            if (!allowed && /(https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})/i.test(text))
                reason = "Links are not allowed in chat";
        }

        if (!reason && inappDetect && this.state.badwords.length > 0) {
            const msgNorm = message.toLowerCase().normalize("NFKC");
            for (const wordRaw of this.state.badwords) {
                const word = (wordRaw || '').trim();
                if (!word) continue;
                let pattern;
                if (word.includes(' ')) {
                    const part = word
                        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                        .replace(/ +/g, '[\\s\\p{P}]+');
                    pattern = new RegExp(`\\b${part}\\b`, 'iu');
                } else {
                    pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'iu');
                }
                if (pattern.test(msgNorm)) {
                    reason = `Inappropriate language detected`;
                    break;
                }
            }
        }

        if (!reason && openAiDetect) {
            try {
                const result = await this.OpenAI.moderate(message);
                const flags = this.OpenAI.constructor.parseModerationResult(result);
                if (flags.isFlagged) {
                    const flagged = Object.entries(flags)
                        .filter(([k, v]) => k !== 'isFlagged' && v === true)
                        .map(([k]) => k.replace(/^is/, ''));
                    reason = `${flagged.join(', ') || 'No reason'}`;
                }
            } catch (e) { }
        }

        if (reason) {
            await this.kick(userId, reason);
            return;
        }
    }

    async keepRunning () {
        runIfConnected(() => this.state.ws.ping(), this, 30000);
        runIfConnected(() => this.send("ping", []), this, 60000);
        runIfConnected(() => this.send("c", {
            u: this.state.loginInfo.i,
            t: "/KEEPALIVE",
        }), this, 900000);
    }

    hasPermission (uid, from) {
        const hasPermission = this.state.envData.owners?.includes(Number(uid));

        if (!hasPermission) {
            this.reply(
                "You can not use this command.",
                uid,
                from === "main" ? "pm" : from
            );

            return false;
        }

        return true;
    }
}
