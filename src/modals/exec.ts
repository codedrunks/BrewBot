import { MessageEmbed, MessageButton, ModalSubmitInteraction, TextInputComponent } from "discord.js";
import { unused } from "svcorelib";

import { BtnMsg } from "@utils/BtnMsg";
import { Modal } from "@utils/Modal";
import { settings } from "@src/settings";
import { truncField } from "@src/utils";

export class ExecModal extends Modal
{
    private ephemeral;

    constructor(ephemeral: boolean)
    {
        super({
            title: "Execute code",
            inputs: [
                new TextInputComponent()
                    .setCustomId("code")
                    .setLabel("Code")
                    .setPlaceholder("Any CommonJS code\n(Vars: channel, user, guild, client, MessageEmbed, MessageButton, BtnMsg)")
                    .setStyle("PARAGRAPH")
                    .setRequired(true)
            ]
        });

        this.ephemeral = ephemeral;
    }

    async submit(int: ModalSubmitInteraction<"cached">): Promise<void> {
        const { channel, user, guild, client } = int;

        unused(
            channel, user, guild, client,
            MessageEmbed, MessageButton, BtnMsg
        );

        const code = int.fields.getTextInputValue("code").trim();

        await this.deferReply(int, this.ephemeral);

        let result, error;
        try
        {
            const lines = [
                "const { MessageEmbed, MessageButton } = require(\"discord.js\");",
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

        const ebd = new MessageEmbed()
            .setTitle(`Execution ${error ? "Error" : "Result"}`)
            .setColor(error ? settings.embedColors.error : settings.embedColors.success);

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

            ebd.addField(`Result <\`${findType(result)}\`>:`, `\`\`\`\n${resStr.length > 0 ? transformRes(result) : "(empty)"}\n\`\`\``, false)
                .addField("Code:", `\`\`\`ts\n${code}\n\`\`\``, false);
        }
        else
            ebd.addField("Error:", `\`\`\`\n${truncField(error)}\n\`\`\``, false)
                .addField("Code:", `\`\`\`ts\n${code}\n\`\`\``, false);

        await this.editReply(int, ebd);
    }
}
