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

import winston = require("winston");

winston.loggers.add("logger", {
	level: 'info',
	format: winston.format.combine(
		winston.format.timestamp({
			format: 'YYYY-MM-DD HH:mm:ss'
		}),
		winston.format.json()),
	defaultMeta: { service: 'user-service' },
	transports: [
	  new winston.transports.File({ filename: 'logs/error.log', level: 'error', maxsize: 1 * 1000 * 1000 }),
	  new winston.transports.File({ filename: 'logs/requests.log', level: 'http', maxsize: 1 * 1000 * 1000 }),
	  new winston.transports.File({ filename: 'logs/combined.log', maxsize: 1 * 1000 * 1000 }),
	],
  });
const logger = winston.loggers.get('logger');

const myIntents = new Discord.Intents();
myIntents.add(Discord.Intents.FLAGS.GUILD_PRESENCES, Discord.Intents.FLAGS.GUILD_MEMBERS,
	Discord.Intents.FLAGS.DIRECT_MESSAGES, Discord.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
	Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
	Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_BANS);

const client: YFDiscordClient = new YFDiscordClient({ intents: myIntents,  partials: ['CHANNEL'] });
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
	client.user.setStatus('online');
	client.user.setPresence({activities: [{type: 'LISTENING', name: ' commands. DM !help for more info.'}]});
	logger.info('Connected to Discord');
});

process.on('uncaughtException', async err => {
	console.log(`Uncaught Exception: ${err.message}`)
	console.log(err.stack);
	logger.error("Uncaught Exception", {error: err.message, stack: err.stack});
	try {
		if(client.uptime > 0) {
			await client.user.setPresence({activities: [{type: 'PLAYING', name: 'dead'}]});
			const textChannel = await client.channels.cache.get('837490337156038656') as Discord.TextChannel
			await textChannel.send('I\'ve encountered an error and am shutting down');
			client.destroy();
		}
	}
	catch {
		console.log('Did not shut down cleanly');
	}
	setTimeout(() => {
		process.exit(1)
	  }, 1000)
})

process.on('SIGINT', async () => {
	if(client.uptime > 0) {
		console.log('Destroying Client');
		await client.user.setPresence({activities: [{type: 'PLAYING', name: 'dead'}]});
		await client.destroy();
	}
	setTimeout(() => {
		process.exit(0)
	  }, 1000)
})

// Discord Message handler
client.on('messageCreate', async message => {
	if (message.author.bot) return;
	// if (message.content.startsWith('$')) market.getInfo(message, message.content.slice(1).trim());
	let msgUser: User = null;
	let msgCorp: Corp = null;
	// search the database for the corp and user
	try {
		msgUser = await connection.manager.getRepository(User).findOne({where: {id: message.author.id}, relations: ["corp", "fioData"]});

		// if it's a DM channel, then use the users corp.
		if(message.channel.type === 'DM') msgCorp = msgUser.corp;
		// otherwise search the database
		else msgCorp = await connection.manager.getRepository(Corp).findOne({where: {id: message.guild.id}});
	}
	catch(e) {
		logger.error("Error retreiving corp data", {messageID: message.id, messageGuild: message.channel.type !== "DM" ? message.guild.id : "DM", user: msgUser.name});
		await message.channel.send('There was an issue retriving the corp data from the database.');
		return;
	}

	const msgPrefix = msgCorp.prefix ? msgCorp.prefix : prefix;

	if (!message.content.startsWith(msgPrefix)) {
		if(message.channel.type === 'DM' && message.content.startsWith(prefix)) {
			await message.channel.send(`It looks like your corporation uses the "${msgPrefix}" prefix instead of the default "${prefix}".`);
			return;
		}
		else return;
	}

	// split the string into lines, taking out the prefix
	const splitString: string[] = message.content.slice(msgPrefix.length).trim().split('\n');
	// split each line into individual arguments
	let args: string[][]= [];
	let commandName;
	if(splitString.length > 1) {
		// if it's a multiline argument...
		args = splitString.map(x => x.trim().split(/ +/));
	}
	else {
		args[0] = splitString[0].trim().split(/ +/);
	}
	// the command name is the first argument in the list, so we remove it and store it seperately
	commandName = args[0].shift().toLowerCase();

	const command:Command = client.commands.get(commandName)
		|| client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;

	if(!msgUser) {
		// if the message user is not in the database, create a "dummy" user to represent them.
		msgUser = new User();
		msgUser.id = message.author.id;
		msgUser.role = UserRole.PUBLIC;
	}
	else if(command.name !== 'register'  && msgUser.name === null) {
		// if they don't have a name set, they haven't completed registration. Stop the command and tell them to register.
		await message.channel.send('You don\'t seem to be completely registered. Please use the register command to finish registration');
		return;
	}

	// if the command requires a corp, and the user doesn't have one, abort the command.
	if(command.needCorp === true) {
		if(msgUser.corp === null) {
			await message.channel.send('Use of this command requires registration with a corp');
			return;
		}
	}
	// If the message is not a DM, and the user is not an admin role, then make sure they are appropiatly permissioned.
	if (message.channel.type !== 'DM' && msgUser.role !== UserRole.ADMIN) {
		// if the user is not assigned a corp, and they are trying to add a corp, give them temporary LEAD status.
		if(!msgUser.corp && command.name === 'addcorp' && message.guild.members.resolve(message.author.id).permissions.has('MANAGE_GUILD')) {
			msgUser.role = UserRole.LEAD;
			logger.info("adding corp", {messageID: message.id, messageGuild: message.guild.id, command: command.name, user: msgUser.name, args});
		}
		// If there is no corp assigned to this channel, or the user doesn't have a corp, or there is a mismatch between the channel's corp and the user corp, then set the public role
		else if(!msgCorp || !msgUser.corp || msgUser.corp.id !== msgCorp.id) {
			msgUser.role = UserRole.PUBLIC;
			logger.info("corp mismatch, applying public role", {messageID: message.id, messageGuild:  message.guild.id, command: command.name, user: msgUser.name, args});
		}
	}

	// after checking all of the permissions, kick them out if they don't have suffecient permissions.
	if(command.permissions > msgUser.role) {
		await message.channel.send('You have insufficient permissions for that command');
		return;
	}

	// Double check command arguments
	if (command.args && !args.length) {
		let reply = `You didn't provide any arguments, ${message.author}!`;

		if (command.usage) {
			reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
		}

		await message.channel.send(reply);
		return;
	}

	// Execute the command
	try {
		logger.http("Executing Command", {messageID: message.id, messageGuild: message.channel.type !== "DM" ? message.guild.id : "DM", messageCorp: msgCorp.id, command: command.name, user: msgUser.name, args});
		command.execute(message, args, connection, msgUser, msgCorp);
	}
	catch (error) {
		logger.error("Error executing command", {messageID: message.id, messageGuild: message.channel.type !== "DM" ? message.guild.id : "DM", messageCorp: msgCorp.id, command: command.name, user: msgUser.name, args});
		message.reply('There was an error trying to execute that command!');
	}
});

client.login(token);