import { createLogger, format, transports } from "winston";

export function setupLogger() {
    return createLogger({
        format: format.combine(
            format.timestamp({ format: "HH:mm:ss DD-MM-YYYY" }),
            format.printf(({ timestamp, level, message }) => {
                return `[${timestamp}]: ${message}`;
            })
        ),
        transports: [
            // Áttettük a /tmp mappába, amit a Vercel engedélyez írni!
            new transports.File({ filename: "/tmp/app.log" }),
            new transports.Console()
        ]
    });
}
