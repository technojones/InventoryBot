/// <reference types="node" />

import {Connection, createConnection} from "typeorm";
import "reflect-metadata";

import fs = require('fs');
import * as Discord from 'discord.js';
import { YFDiscordClient } from './discordExtentions/yfDiscordClient';

import { prefix, token } from './config.json';
import { User, UserRole } from "./entity/User";
import { Corp } from "./entity/Corp";
import { Command, Execute } from "./classes/Command";

const client: YFDiscordClient = new YFDiscordClient();
client.commands = new Discord.Collection();
// read in command files
const commandFiles = fs.readdirSync('./dist/commands').filter(file => file.endsWith('.js'));
const getCommands = async function(){
	for (const file of commandFiles) {
		const { default: commandClass } = await import(`./commands/${file}`);
		const command = new commandClass();
		// set a new item in the Collection
		// with the key as the command name and the value as the exported module
		client.commands.set(command.name, command);
	}
};
getCommands();

let connection: Connection;
createConnection().then(con => {
	connection = con;
	console.log('Database Connected')
});

// Connect to Discord
client.once('ready', () => {
	console.log('Discord Connected');
});

// Discord Message handler
client.on('message', async message => {
	// if (message.content.startsWith('$')) market.getInfo(message, message.content.slice(1).trim());

	if (!message.content.startsWith(prefix) || message.author.bot) return;
	const splitString: string[] = message.content.slice(prefix.length).trim().split('\n');


	let args: string[][]= [];
	let commandName;
	if(splitString.length > 1) {
		// if it's a multiline argument...
		args = splitString.map(x => x.trim().split(/ +/));
	}
	else {
		args[0] = splitString[0].trim().split(/ +/);
	}
	commandName = args[0].shift().toLowerCase();

	const command:Command = client.commands.get(commandName)
		|| client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;

	let userSearch = await connection.manager.getRepository(User).findOne({where: {id: message.author.id}, relations: ["corp", "fioData"]});
	// console.log(userSearch);
	if(!userSearch) {
		userSearch = new User();
		userSearch.id = message.author.id;
		userSearch.role = UserRole.PUBLIC;
	}
	else if(command.name !== 'register'  && userSearch.name === null) {
		return message.channel.send('You don\'t seem to be completely registered. Please use the register command to finish registration');
	}
	let corpSearch:Corp = null;

	if(message.channel.type === 'dm')
	{
		corpSearch = userSearch.corp;
	}
	else {
		corpSearch = await connection.manager.getRepository(Corp).findOne({where: {id: message.guild.id}});
		if(!corpSearch || userSearch.corp.id !== corpSearch.id) {
			if((corpSearch && command.name !== 'addcorp') && (userSearch.role !== UserRole.ADMIN)) {
				userSearch.role = UserRole.PUBLIC;
				console.log('corp mismatch, applying public role');
			}
		}
	}

	if(command.permissions > userSearch.role) return message.channel.send('Insufficient permissions');

	// Double check command arguments
	if (command.args && !args.length) {
		let reply = `You didn't provide any arguments, ${message.author}!`;

		if (command.usage) {
			reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
		}

		return message.channel.send(reply);
	}

	// Execute the command
	try {
		command.execute(message, args, connection, userSearch, corpSearch);
	}
	catch (error) {
		console.error(error);
		message.reply('there was an error trying to execute that command!');
	}
});

client.login(token);