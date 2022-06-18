import { CommandInteraction, MessageEmbed, MessageButton } from "discord.js";
import { PermissionFlagsBits } from "discord-api-types/v10";
import { unused } from "svcorelib";
import { Command } from "../../Command";
import { BtnMsg } from "../../BtnMsg";
import { settings } from "../../settings";

export class Exec extends Command
{
    constructor()
    {
        super({
            name: "exec",
            desc: "Developer command",
            args: [
                {
                    name: "code",
                    desc: "code",
                    required: true,
                },
            ],
            perms: [ "ADMINISTRATOR" ],
            memberPerms: [ PermissionFlagsBits.Administrator ]
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        // TODO: use modal here

        await this.deferReply(int, true);

        const { channel, user, guild, client } = int;

        unused(
            channel, user, guild, client,
            MessageEmbed, MessageButton, BtnMsg
        );

        if(!settings.devs.includes(int.user.id))
            return await this.editReply(int, "You can't use this command.");

        const { code } = this.resolveArgs(int);

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
            .setTitle("Exec")
            .setColor(error ? settings.embedColors.error : settings.embedColors.gameWon);

        if(!error)
            ebd.addField("Result:", `\`\`\`\n${result}\n\`\`\``, false)
                .addField("Code:", `\`\`\`ts\n${code}\n\`\`\``, false);
        else
            ebd.addField("Error:", `\`\`\`\n${error}\n\`\`\``, false)
                .addField("Code:", `\`\`\`ts\n${code}\n\`\`\``, false);

        await this.editReply(int, ebd);
    }
}
