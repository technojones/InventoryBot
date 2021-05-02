import { Collection, Message } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import Functions from "../classes/functions";
import { YFDiscordClient } from "../discordExtentions/yfDiscordClient";
import { Corp } from "../entity/Corp";
import { User, UserRole } from "../entity/User";

export default class Help implements Command {
    name: string = 'help';
    args: boolean = false;
	needCorp: boolean = false;
    permissions: UserRole.PUBLIC;
    description: string = 'Get help info for my commands';
    usage: string = 'blank to get a DM with all commmands, or a certian command to get more info on.';
    execute: Execute = async function(message: Message, args: string[][], connection: Connection, user: User, corp: Corp | null) {
		const { prefix } = require('../config.json');
		const data = [];
		const client: any = message.client;
        const commands: Collection<string, Command> = client.commands;
		let filteredCommands = commands.filter((item => item.permissions <= user.role || !item.permissions));

		if (!args[0].length) {
			if(corp !== null) {
				data.push(`Here\'s a list of the commands you have permission for in ${corp.name}:`);
				data.push(filteredCommands.map(commandItem => commandItem.name).join(', '));
				data.push(`\nYou can send \`${prefix}help [command name]\` to get info on a specific command!`);
			}
			else {
				filteredCommands = filteredCommands.filter(item => item.needCorp === false);
				data.push(`You don't seem to be assigned to a corp. Here are the commands you have permissions for and don't require a corp (data may be limited):`);
				data.push(filteredCommands.map(commandItem => commandItem.name).join(', '));
				data.push(`\nYou can send \`${prefix}help [command name]\` to get info on a specific command!`);
			}

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
			return message.reply('Either that isn\'t not a valid command, or you don\'t have the permissions for it');
		}

		data.push(`**Name:** ${command.name}`);

		if (command.aliases) data.push(`**Aliases:** ${command.aliases.join(', ')}`);
        if (command.usage) data.push(`**Usage:** ${prefix}${command.name} ${command.usage}`);
		if (command.description) data.push(`**Description:** ${command.description}`);

		message.channel.send(data, { split: true });

	};
};