import winston, { format } from "winston";
import WinstonGraylog2, { GraylogServer } from "@eximius/winston-graylog2";

const servers: GraylogServer[] = [];

process.env.GRAYLOG_SERVERS?.split(",").map((v) => {
    const [host, port] = v.split(":");

    servers.push({
        host,
        port: parseInt(port),
    });
});

const options = {
    name: process.env.GRAYLOG_NODE_NAME,
    graylog: {
        servers,
    },
};

const logger = winston.createLogger({
    exitOnError: false,
    format: format.combine(
        format.errors({ stack: true }),
        format.metadata(),
    ),
    transports: [
        new WinstonGraylog2(options),
    ],
});

logger.on("error", (err) => {
    console.error(err);
    process.exit(1);
});

export default logger;
