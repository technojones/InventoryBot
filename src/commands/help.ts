import { CategoryChannel, Collection, Message, Util } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import Functions from "../classes/functions";
import { YFDiscordClient } from "../discordExtentions/yfDiscordClient";
import { Corp } from "../entity/Corp";
import { User, UserRole } from "../entity/User";

export default class Help implements Command {
    name: string = 'help';
	category = 'Utility';
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

		const distinctCatagories = [...new Set(commands.map(x => x.category.toLowerCase()))];

		let filteredCommands = commands.filter((item => item.permissions <= user.role || !item.permissions));

		filteredCommands = filteredCommands.sort(function(a, b) {
			const nameA = a.category.toUpperCase(); // ignore upper and lowercase
			const nameB = b.category.toUpperCase(); // ignore upper and lowercase
			if (nameA < nameB) {
			  return -1;
			}
			if (nameA > nameB) {
			  return 1;
			}
			// names must be equal
			return 0;
		});

		if (!args[0].length) {
			if(corp !== null) {
				data.push(`Here\'s a list of the commands you have permission for in ${corp.name}:`);
				let lastCatagory: string;
				let catagoryCommands: string[] = [];
				filteredCommands.forEach(commandItem => {
					if(commandItem.category !== lastCatagory) {
						data.push(catagoryCommands.join(', '));
						data.push('**' + commandItem.category + ':**');
						catagoryCommands = [];
					}
					catagoryCommands.push(commandItem.name);
					lastCatagory = commandItem.category;
				})
				data.push(catagoryCommands.join(', '));
				data.push(`\nYou can send \`${prefix}help [command name]\` to get info on a specific command!`);
			}
			else {
				filteredCommands = filteredCommands.filter(item => item.needCorp === false);
				data.push(`You don't seem to be assigned to a corp. Here are the commands you have permissions for and don't require a corp (data may be limited):`);
				let lastCatagory: string;
				let catagoryCommands: string[] = [];
				filteredCommands.forEach(commandItem => {
					if(commandItem.category !== lastCatagory) {
						data.push(catagoryCommands.join(', '));
						data.push(commandItem.category + ':');
						catagoryCommands = [];
					}
					catagoryCommands.push(commandItem.name);
					lastCatagory = commandItem.category;
				})
				data.push(catagoryCommands.join(', '));
				data.push(`\nYou can send \`${prefix}help [command name]\` to get info on a specific command!`);
			}
			const splitMessage = Util.splitMessage(data.join('\n'));

			const messages = splitMessage.map(m => {
				return message.channel.send(m);
			})

			return Promise.all(messages)
				.then(() => {
					if (message.channel.type === 'DM') return;
					message.reply('I\'ve sent you a DM with all my commands!');
				})
				.catch(error => {
					console.error(`Could not send help DM to ${message.author.tag}.\n`, error);
					message.reply('it seems like I can\'t DM you! Do you have DMs disabled?');
				});
		}
		const name = args[0][0].toLowerCase();
		const foundCommand = filteredCommands.get(name) || filteredCommands.find(c => c.aliases && c.aliases.includes(name));

		if (!foundCommand) {
			if(distinctCatagories.includes(name)) {
				data.push(`**Category:** ${name}\n`);
				const catagoryCommands = commands.filter(x => x.category.toLowerCase() === name);
				catagoryCommands.forEach(command => {
					data.push(`**__${command.name}__**`);

					if (command.aliases) data.push(`	**Aliases:** ${command.aliases.join(', ')}`);
					if (command.usage) data.push(`	**Usage/Arguments:** ${command.usage}`);
					if (command.description) data.push(`	**Description:** ${command.description}`);
				});
				const splitMessage = Util.splitMessage(data.join('\n'));

				splitMessage.forEach(m => {
					message.channel.send(m);
				});
			}
			else {
				return message.reply('Either that isn\'t not a valid command, or you don\'t have the permissions for it');
			}
		}
		else {
			data.push(`**Name:** ${foundCommand.name}`);

			if (foundCommand.aliases) data.push(`**Aliases:** ${foundCommand.aliases.join(', ')}`);
       	 	if (foundCommand.usage) data.push(`**Usage/Arguments:** ${foundCommand.usage}`);
			if (foundCommand.description) data.push(`**Description:** ${foundCommand.description}`);

			const splitMessage = Util.splitMessage(data.join('\n'));

			splitMessage.forEach(m => {
				message.channel.send(m);
			});
		}
	};
};