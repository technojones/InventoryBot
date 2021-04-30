import { Message } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import Functions from "../classes/functions";
import { YFDiscordClient } from "../discordExtentions/yfDiscordClient";
import { Corp } from "../entity/Corp";
import { User, UserRole } from "../entity/User";

export default class Help implements Command {
    name: string = 'help';
    args: boolean = false;
    permissions: UserRole.PUBLIC;
    description: string = 'Get help info for my commands';
    usage: string = 'blank to get a DM with all commmands, or a certian command to get more info on.';
    execute: Execute = async function(message: Message, args: string[][], connection: Connection, user: User, corp: Corp | null) {
		const { prefix } = require('../config.json');
		const data = [];
		const client: any = message.client;
        const commands: Command[] = client.commands;
		let filteredCommands;
		filteredCommands = commands.filter((item => item.permissions <= user.role));

		if (!args[0].length) {
			data.push('Here\'s a list of all my commands:');
			data.push(filteredCommands.map(commandItem => commandItem.name).join(', '));
			data.push(`\nYou can send \`${prefix}help [command name]\` to get info on a specific command!`);

			return message.author.send(data, { split: true })
				.then(() => {
					if (message.channel.type === 'dm') return;
					message.reply('I\'ve sent you a DM with all my commands!');
				})
				.catch(error => {
					console.error(`Could not send help DM to ${message.author.tag}.\n`, error);
					message.reply('it seems like I can\'t DM you! Do you have DMs disabled?');
				});
		}
		const name = args[0][0].toLowerCase();
		const command = filteredCommands.get(name) || filteredCommands.find(c => c.aliases && c.aliases.includes(name));

		if (!command) {
			return message.reply('that\'s not a valid command!');
		}

		data.push(`**Name:** ${command.name}`);

		if (command.aliases) data.push(`**Aliases:** ${command.aliases.join(', ')}`);
        if (command.usage) data.push(`**Usage:** ${prefix}${command.name} ${command.usage}`);
		if (command.description) data.push(`**Description:** ${command.description}`);

		message.channel.send(data, { split: true });

	};
};