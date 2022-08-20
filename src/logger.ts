import winston, { format, transports } from "winston";
import { isProd } from "./utils";

export const logger = winston.createLogger({
    level: "info",
    format: format.combine(
        format.timestamp(),
        format.colorize(),
        format.printf(({ level, message, timestamp }) =>
            `[${new Date(timestamp).toLocaleString()}] ${level}: ${message}`),
    ),
    transports: [
        ...(!isProd() ? [new transports.Console()] : []),
        new transports.File({ filename: "logs/error.log", level: "error" }),
        new transports.File({ filename: "logs/combined.log" }),
    ],
});
