import { EmbedBuilder, ButtonBuilder, ModalSubmitInteraction, TextInputBuilder, TextInputStyle } from "discord.js";
import { unused } from "svcorelib";

import { BtnMsg } from "@utils/BtnMsg";
import { Modal } from "@utils/Modal";
import { settings } from "@src/settings";

export class ExecModal extends Modal
{
    private ephemeral;

    constructor(ephemeral: boolean)
    {
        super({
            title: "Execute code",
            inputs: [
                new TextInputBuilder()
                    .setCustomId("code")
                    .setLabel("Code")
                    .setPlaceholder("Any CommonJS code\n(Vars: channel, user, guild, client, EmbedBuilder, ButtonBuilder, BtnMsg)")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
            ]
        });

        this.ephemeral = ephemeral;
    }

    async submit(int: ModalSubmitInteraction<"cached">): Promise<void> {
        const { channel, user, guild, client } = int;

        unused(
            channel, user, guild, client,
            EmbedBuilder, ButtonBuilder, BtnMsg
        );

        const code = int.fields.getTextInputValue("code").trim();

        await this.deferReply(int, this.ephemeral);

        let result, error;
        try
        {
            const lines = [
                "const { EmbedBuilder, ButtonBuilder } = require(\"discord.js\");",
                "const { BtnMsg } = require(\"../utils/BtnMsg\");",
                "const { embedify, useEmbedify } = require(\"../utils/embedify\");",
                "const { PageEmbed } = require(\"../utils/PageEmbed\");",
                code,
            ];
            result = eval(lines.join("\n"));

            if(result instanceof Promise)
                result = await result;
        }
        catch(err)
        {
            if(err instanceof Error)
                error = `${err.name}: ${err.message}\n${err.stack}`;
            else
                error = String(err);
        }

        const ebd = new EmbedBuilder()
            .setTitle(`Execution ${error ? "Error" : "Result"}`)
            .setColor(error ? settings.embedColors.error : settings.embedColors.gameWon);

        const truncField = (str: string) => str.length >= 1000 ? str.substring(0, 1000) + "..." : str;

        if(!error)
        {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const findType = (val: any) => {
                const primitives = [ "bigint", "boolean", "function", "number", "object", "string", "symbol", "undefined" ];

                const cName = val?.constructor?.name;

                for(const pr of primitives)
                    if(typeof val === pr)
                        return primitives.includes(cName?.toLowerCase() ?? "_") ? pr : cName;

                return "unknown";
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const transformRes = (result: any) => {
                const bufTruncLen = 16;

                if(result instanceof Buffer)
                    result = `<Buffer(${result.length}) ${
                        result.reduce((a, c, i) => i < bufTruncLen ?
                            (a + ((i > 0 ? " " : "") + c.toString(16)))
                            : (i === bufTruncLen ? a + " ..." : a),
                        "")
                    }>\n\nStringified:\n${result.toString()}`;

                return truncField(result);
            };

            const resStr = String(result).trim();

            ebd.addFields([
                {
                    name: `Result <\`${findType(result)}\`>:`,
                    value: `\`\`\`\n${resStr.length > 0 ? transformRes(result) : "(empty)"}\n\`\`\``,
                    inline: false
                },
                {
                    name: "Code:",
                    value: `\`\`\`ts\n${code}\n\`\`\``,
                    inline: false
                }
            ]);
        }
        else
            ebd.addFields([
                {
                    name: "Error:",
                    value: `\`\`\`\n${truncField(error)}\n\`\`\``,
                    inline: false
                },
                {
                    name: "Code:",
                    value: `\`\`\`ts\n${code}\n\`\`\``,
                    inline: false
                }
            ]);

        await this.editReply(int, ebd);
    }
}
