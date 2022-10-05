import { ApplicationCommandOptionType, Collection, CommandInteraction, EmbedBuilder, EmbedField } from "discord.js";
import { isIP } from "net";
import { Command } from "@src/Command";
import { axios, embedify } from "@src/utils";
import { settings } from "@src/settings";
import { AxiosError } from "axios";

interface MimeInfo {
    exts: string[];
    name: string;
}

export class Ping extends Command {
    constructor()
    {
        super({
            name: "ping",
            desc: "Visits a URL, follows redirects and gives you all kinds of information about it",
            category: "util",
            args: [
                {
                    name: "url",
                    desc: "The URL to gather information about. Has to start with https:// or http://",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
            ],
            // TODO: implement proxy so we don't dox our IP lol
            devOnly: true,
        });
    }

    private readonly HOST_BLACKLIST = [ "localhost", "[::1]" ];
    private readonly MIME_MAP = new Collection<string, MimeInfo>([
        [ "audio/aac", { exts: [ ".aac" ], name: "AAC audio" }],
        [ "image/avif", { exts: [ ".avif" ], name: "AVIF image" }],
        [ "video/x-msvideo", { exts: [ ".avi" ], name: "AVI: Audio Video Interleave" }],
        [ "application/octet-stream", { exts: [ ".bin" ], name: "Any kind of binary data" }],
        [ "image/bmp", { exts: [ ".bmp" ], name: "Windows OS/2 Bitmap Graphics" }],
        [ "text/css", { exts: [ ".css" ], name: "Cascading Style Sheets (CSS)" }],
        [ "text/csv", { exts: [ ".csv" ], name: "Comma-separated values (CSV)" }],
        [ "application/msword", { exts: [ ".doc" ], name: "Microsoft Word" }],
        [ "application/vnd.openxmlformats-officedocument.wordprocessingml.document", { exts: [ ".docx" ], name: "Microsoft Word (OpenXML)" }],
        [ "application/epub+zip", { exts: [ ".epub" ], name: "Electronic publication (EPUB)" }],
        [ "application/gzip", { exts: [ ".gz" ], name: "GZip Compressed Archive" }],
        [ "image/gif", { exts: [ ".gif" ], name: "Graphics Interchange Format (GIF)" }],
        [ "text/html", { exts: [ ".htm", ".html" ], name: "HyperText Markup Language (HTML)" }],
        [ "image/vnd.microsoft.icon", { exts: [ ".ico" ], name: "Microsoft icon format" }],
        [ "text/calendar", { exts: [ ".ics" ], name: "iCalendar format" }],
        [ "application/java-archive", { exts: [ ".jar" ], name: "Java Archive (JAR)" }],
        [ "image/jpeg", { exts: [ ".jpeg", ".jpg" ], name: "JPEG image" }],
        [ "text/javascript", { exts: [ ".js" ], name: "JavaScript" }],
        [ "application/json", { exts: [ ".json" ], name: "JavaScript Object Notation (JSON)" }],
        [ "text/javascript", { exts: [ ".mjs" ], name: "JavaScript module" }],
        [ "audio/mpeg", { exts: [ ".mp3" ], name: "MP3 audio" }],
        [ "video/mp4", { exts: [ ".mp4" ], name: "MP4 video" }],
        [ "video/mpeg", { exts: [ ".mpeg" ], name: "MPEG video" }],
        [ "application/vnd.oasis.opendocument.presentation", { exts: [ ".odp" ], name: "OpenDocument presentation" }],
        [ "application/vnd.oasis.opendocument.spreadsheet", { exts: [ ".ods" ], name: "OpenDocument spreadsheet" }],
        [ "application/vnd.oasis.opendocument.text", { exts: [ ".odt" ], name: "OpenDocument text document" }],
        [ "audio/ogg", { exts: [ ".ogg", ".oga" ], name: "OGG audio" }],
        [ "application/ogg", { exts: [ ".ogg", ".ogx" ], name: "OGG" }],
        [ "video/ogg", { exts: [ ".ogv" ], name: "OGG video" }],
        [ "audio/opus", { exts: [ ".opus" ], name: "Opus audio" }],
        [ "font/otf", { exts: [ ".otf" ], name: "OpenType font" }],
        [ "image/png", { exts: [ ".png" ], name: "Portable Network Graphics (PNG)" }],
        [ "application/pdf", { exts: [ ".pdf" ], name: "Adobe Portable Document Format (PDF)" }],
        [ "application/x-httpd-php", { exts: [ ".php" ], name: "Hypertext Preprocessor (PHP)" }],
        [ "application/vnd.ms-powerpoint", { exts: [ ".ppt" ], name: "Microsoft PowerPoint" }],
        [ "application/vnd.openxmlformats-officedocument.presentationml.presentation", { exts: [ ".pptx" ], name: "Microsoft PowerPoint (OpenXML)" }],
        [ "application/vnd.rar", { exts: [ ".rar" ], name: "RAR archive" }],
        [ "application/rtf", { exts: [ ".rtf" ], name: "Rich Text Format (RTF)" }],
        [ "application/x-sh", { exts: [ ".sh" ], name: "Bourne shell script" }],
        [ "image/svg+xml", { exts: [ ".svg" ], name: "Scalable Vector Graphics (SVG)" }],
        [ "application/x-tar", { exts: [ ".tar" ], name: "Tape Archive (TAR)" }],
        [ "image/tiff", { exts: [ ".tif", ".tiff" ], name: "Tagged Image File Format (TIFF)" }],
        [ "font/ttf", { exts: [ ".ttf" ], name: "TrueType Font" }],
        [ "text/plain", { exts: [ ".txt" ], name: "Plain Text" }],
        [ "audio/wav", { exts: [ ".wav" ], name: "Waveform Audio Format" }],
        [ "audio/webm", { exts: [ ".weba" ], name: "WEBM audio" }],
        [ "video/webm", { exts: [ ".webm" ], name: "WEBM video" }],
        [ "image/webp", { exts: [ ".webp" ], name: "WEBP image" }],
        [ "font/woff", { exts: [ ".woff" ], name: "Web Open Font Format (WOFF)" }],
        [ "font/woff2", { exts: [ ".woff2" ], name: "Web Open Font Format 2.0 (WOFF2)" }],
        [ "application/xhtml+xml", { exts: [ ".xhtml" ], name: "XHTML" }],
        [ "application/vnd.ms-excel", { exts: [ ".xls" ], name: "Microsoft Excel" }],
        [ "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", { exts: [ ".xlsx" ], name: "Microsoft Excel (OpenXML)" }],
        [ "application/xml", { exts: [ ".xml" ], name: "XML" }],
        [ "text/xml", { exts: [ ".xml" ], name: "XML" }],
        [ "application/zip", { exts: [ ".zip" ], name: "ZIP archive" }],
        [ "video/3gpp", { exts: [ ".3gp" ], name: "3GPP video container" }],
        [ "audio/3gpp", { exts: [ ".3gp" ], name: "3GPP audio container" }],
        [ "application/x-7z-compressed", { exts: [ ".7z" ], name: "7-zip archive" }],
    ]);

    async run(int: CommandInteraction) {
        const urlArg = (int.options.get("url", true).value as string).trim();

        const url = this.parseUrl(urlArg);

        const invalidUrl = () => this.reply(int, embedify("This URL is invalid. Please try again.", settings.embedColors.error), true);

        if(!url)
        {
            if(!urlArg.match(/^https?/i))
                return this.reply(int, embedify("Please make sure the URL starts with `https://` or `http://`", settings.embedColors.error), true);
            return invalidUrl();
        }

        if(!(["http:", "https:"].includes(url.protocol)))
            return this.reply(int, embedify("Protocols other than `https://` and `http://` aren't supported.", settings.embedColors.error), true);

        if(this.HOST_BLACKLIST.includes(url.hostname))
            return invalidUrl();

        // TODO: implement check for local IP maybe (but this can easily be a dangerous vuln so maybe not)
        // maybe instead give reduced information?
        if(isIP(url.hostname.replace(/[[\]]/g, "")) > 0)
            return this.reply(int, embedify("IP addresses can't be pinged yet.", settings.embedColors.error), true);

        await this.deferReply(int);

        try {
            // wyd if wants GET HEAD but also VIEW the other OPTIONS and PUT thing inside her PATCH
            // but next day there no TRACE of her, phone is UNLOCK and she POST ur nudes online and she DELETE ur number?
            const { status, headers, statusText } = await axios.head(urlArg, {
                // don't throw on 4xx and 5xx
                validateStatus: () => true,
                headers: {
                    // lol maybe this helps
                    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
                },
            });

            const contentType = headers["content-type"];
            const hstsHeader = headers["strict-transport-security"];

            const mimeType = (contentType && contentType.includes(";") ? contentType.split(";")[0] : contentType)?.trim();
            const mimeInfo = this.MIME_MAP.get(mimeType);

            const hstsEnabled = hstsHeader?.toLowerCase().includes("max-age");
            const res = /.*max-age=(\d+).*/i.exec(hstsHeader);
            const [, hstsValRaw] = res ?? [undefined, undefined];
            const hstsVal = parseInt(String(hstsValRaw));
            const hstsLabel = (!isNaN(hstsVal) && hstsVal >= 63072000) ? "🔒 Enhanced (preloaded)" : (hstsEnabled ? "🔒 Yes" : "🔓 No");

            const fields: EmbedField[] = [
                {
                    name: "URL",
                    value: `[\`${urlArg}\`](${urlArg})`,
                    inline: true,
                },
                {
                    name: "Status",
                    value: `${status}${statusText && statusText.length > 0 ? ` - ${statusText}` : ""}`,
                    inline: true,
                },
                {
                    name: "Security",
                    value: [
                        `[HTTPS:](https://en.wikipedia.org/wiki/HTTPS) ${url.protocol === "https:" ? "🔒 Yes" : "🔓 No"}`,
                        `[HSTS:](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html) ${hstsLabel}`,
                    ].join("\n"),
                    inline: true,
                },
            ];

            mimeInfo && fields.push({
                name: "Content Type",
                value: `${mimeInfo.name}\nExtension${mimeInfo.exts.length === 1 ? "" : "s"}: ${mimeInfo.exts.reduce((a, c) => `${a.length > 0 ? `${a}, ` : ""}${c}`, "")}`,
                inline: true,
            });

            const ebd = new EmbedBuilder()
                .setTitle("URL information:")
                .setColor(settings.embedColors.default)
                .setFields(...fields);

            return this.editReply(int, ebd);
        }
        catch(err) {
            if(Ping.isAxiosError(err))
            {
                const ebd = new EmbedBuilder()
                    .setTitle("URL Information:")
                    .setFields([
                        {
                            name: "URL",
                            value: `[\`${urlArg}\`](${urlArg})`,
                            inline: true,
                        },
                        {
                            name: "Status",
                            value: err.status ? String(err.status) : "🛑 aborted",
                            inline: true,
                        },
                        {
                            name: "Security",
                            value: "[HTTPS:](https://en.wikipedia.org/wiki/HTTPS) ⚠️ Certificate expired or invalid",
                            inline: false,
                        },
                    ])
                    .setColor(settings.embedColors.error);

                return this.editReply(int, ebd);
            }
            return this.editReply(int, embedify("Encountered an internal error. Please try again later.", settings.embedColors.error));
        }
    }

    static isAxiosError(val: unknown): val is AxiosError
    {
        return typeof val === "object" && (val as Record<string, unknown>)?.isAxiosError === true;
    }

    parseUrl(urlArg: string)
    {
        try {
            const url = new URL(urlArg);
            return url;
        }
        catch(e) {
            return null;
        }
    }
}
