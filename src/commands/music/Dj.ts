import { CommandInteraction, CommandInteractionOption } from "discord.js";
import { Command } from "@src/Command";
import { embedify } from "@src/util";
import { addDJRoleId, toggleDJOnly, getDJRoleIds, removeDJRoleId } from "@database/music";

export class DJ extends Command {
    constructor() {
        super({
            name: "dj",
            desc: "Set DJ roles and set music to DJ only",
            category: "music",
            subcommands: [
                {
                    name: "set",
                    desc: "Set a selected role to be your DJ role",
                    perms: ["ADMINISTRATOR"],
                    args: [
                        {
                            name: "role",
                            desc: "The role to make a DJ-enabled role",
                            type: "role",
                            required: true
                        }
                    ]
                },
                {
                    name: "remove",
                    desc: "Remove role from being DJ enabled",
                    perms: ["ADMINISTRATOR"],
                    args: [
                        {
                            name: "role",
                            desc: "Role to remove from DJ",
                            type: "role",
                            required: true
                        }
                    ]
                },
                {
                    name: "only",
                    desc: "Toggle to make current music DJ controllable only",
                    perms: ["ADMINISTRATOR"],
                },
                {
                    name: "roles",
                    desc: "View current DJ roles"
                }
            ]
        });
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption<"cached">): Promise<void> {
        const guild = int.guild;

        if(!guild) return this.reply(int, embedify("This command cannot be used in DM's"));

        const roles = await getDJRoleIds(guild.id);

        if((roles.length == 0 || !roles) && opt.name !== "set") return this.reply(int, embedify("Before using these commands, try setting a DJ role with `/dj set`"));

        if(opt.name == "set") {
            const role = int.options.getRole("role", true).id;

            const currentRoles = await getDJRoleIds(guild.id);

            if(currentRoles.length > 0 && currentRoles.includes(role)) return this.reply(int, embedify("That role is already set as a DJ role"));

            if(currentRoles.length >= 10) return this.reply(int, embedify("You may not have more than 10 DJ roles"));

            await addDJRoleId(guild.id, role);

            this.reply(int, embedify(`Added <@&${role}> as a DJ role`));

        } else if(opt.name == "remove") {
            const role = int.options.getRole("role", true).id;

            const e = await removeDJRoleId(guild.id, role);

            if(e) return this.reply(int, embedify(`<@&${role}> was not designated as a DJ role previously`));

            this.reply(int, embedify(`Removed <@&${role}> from DJ`));
        } else if(opt.name == "only") {
            const c = await toggleDJOnly(guild.id);

            this.reply(int, embedify(`DJ only mode is now ${c ? "enabled" : "disabled"}`));
        } else if(opt.name == "roles") {
            const embed = embedify(`${roles.map(v => `<@&${v}>`).join("\n")}`).setTitle("Current DJ enabled roles");

            this.reply(int, embed);
        }
    }
}
