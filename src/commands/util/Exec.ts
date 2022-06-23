import { CommandInteraction, MessageEmbed, MessageButton, ModalSubmitInteraction, TextInputComponent } from "discord.js";
import { PermissionFlagsBits } from "discord-api-types/v10";
import { unused } from "svcorelib";

import { Command } from "../../Command";
import { BtnMsg } from "../../BtnMsg";
import { settings } from "../../settings";
import { Modal } from "../../Modal";

export class Exec extends Command
{
    constructor()
    {
        super({
            name: "exec",
            desc: "Developer command",
            args: [
                {
                    name: "ephemeral",
                    desc: "ephemeral",
                    type: "boolean",
                }
            ],
            perms: [ "ADMINISTRATOR" ],
            memberPerms: [ PermissionFlagsBits.Administrator ]
        });

        this.enabled = settings.commands.execEnabled;
    }

    async run(int: CommandInteraction): Promise<void>
    {
        const { ephemeral } = this.resolveArgs<boolean>(int);

        const modal = new ExecModal(ephemeral ?? true);

        return await int.showModal(modal.getInternalModal());
    }
}

class ExecModal extends Modal
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

        if(!settings.devs.includes(int.user.id))
            return await this.reply(int, "You can't use this command.");

        const code = int.fields.getTextInputValue("code").trim();

        await this.deferReply(int, this.ephemeral);

        let result, error;
        try
        {
            const lines = [
                "const { MessageEmbed, MessageButton } = require(\"discord.js\");",
                "const { BtnMsg } = require(\"../../BtnMsg\");",
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

            ebd.addField(`Result <\`${findType(result)}\`>:`, `\`\`\`\n${resStr.length > 0 ? transformRes(result) : "(empty)"}\n\`\`\``, false)
                .addField("Code:", `\`\`\`ts\n${code}\n\`\`\``, false);
        }
        else
            ebd.addField("Error:", `\`\`\`\n${truncField(error)}\n\`\`\``, false)
                .addField("Code:", `\`\`\`ts\n${code}\n\`\`\``, false);

        await this.editReply(int, ebd);
    }
}