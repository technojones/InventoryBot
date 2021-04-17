/// <reference types="node" />

// tslint:disable-next-line: no-var-requires
const users = require('./users.js');

import functions = require('./functions.js');
import fs = require('fs');
// const Discord = require('discord.js');
import * as Discord from 'discord.js';
import { YFDiscordClient } from './discordExtentions/yfDiscordClient';
import mysql = require('mysql');
import { prefix, token } from './config.json';
import FIO = require('./FNAR/FIO_functions.js');
import market = require('./FNAR/FNAR_Market.js');

const client: YFDiscordClient = new YFDiscordClient();
client.commands = new Discord.Collection();
// read in command files
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	// tslint:disable-next-line: no-var-requires
	const command = require(`./commands/${file}`);

	// set a new item in the Collection
	// with the key as the command name and the value as the exported module
	client.commands.set(command.name, command);
}
const dbConfig = {
	host: 'localhost',
	user: 'yellowfin',
	password: 'yellowfin2020!',
	database: 'yellow_fin',
};
let con;

function handleDisconnect() {
	con = mysql.createConnection(dbConfig);

	con.connect(function(err) {
		if(err) {
			console.log('error when connecting to db:', err);
			setTimeout(handleDisconnect, 2000);
		}
		console.log('Connected to yellowfin Database!');
		users.updateUsers(con)
			.then(function() {
				FIO.refresh(con, null).then(function(updateResults) {
					updateResults.forEach(function(item) {
						if(item.status!=='fulfilled') {
							console.log('error: ' + item.reason);
						}
					});
					console.log('FIO Refresh complete');
				});
			});
	});
	con.on('error', function(err) {
		console.log('db error', err);
		if(err.code === 'PROTOCOL_CONNECTION_LOST') {
			handleDisconnect();
		}
		else {
			throw err;
		}
	});
}

handleDisconnect();

// Connect to Discord
client.once('ready', () => {
	console.log('Discord Connected');
});

// Discord Message handler
client.on('message', message => {
	if (message.content.startsWith('$')) market.getInfo(message, message.content.slice(1).trim());
	if (!message.content.startsWith(prefix) || message.author.bot) return;
	const splitString = message.content.slice(prefix.length).trim().split('\n');
	// console.log('splitString');
	// console.log(splitString);
	// const args = message.content.slice(prefix.length).trim().split(/ +/);
	let args;
	let commandName;
	if(splitString.length > 1) {
		// if it's a multiline argument...
		args = splitString.map(x => x.trim().split(/ +/));
		// console.log('multiline');
		// console.log(args.length);
		commandName = args[0].shift().toLowerCase();
	}
	else {
		args = splitString[0].trim().split(/ +/);
		commandName = args.shift().toLowerCase();
		// console.log('singleline');
	}
	// console.log('arguments');
	// console.log(args);

	const command = client.commands.get(commandName)
		|| client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;

	let authorized = false;

	// if the user is in the database, authorize it
	if(users.searchUsers(message.author.id)) authorized = true;

	// if the command is public, authorize it
	if (command.public) authorized = true;
	/*
	// if the command is in a DM, allow previous decision
	if(message.channel.type!=='dm') {
		// check the permissions for everyone, disallow the command if it's in a thread that everyone can see
		let permissions = message.channel.permissionsFor(704907707634941982);
		console.log(permissions);
		console.log((permissions & 0x00000400) === 0x00000400);
		if((permissions & 0x00000400) === 0x00000400) {
			authorized = false;
		}
	}
	*/
	if(!authorized) return;
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
		command.execute(message, args, con, client);
	}
	catch (error) {
		console.error(error);
		message.reply('there was an error trying to execute that command!');
	}
});

client.login(token);

setInterval(function() {
	console.log('refreshing FIO at interval');
	FIO.refresh(con, null).then(function(updateResults) {
		updateResults.forEach(function(item) {
			if(item.status!=='fulfilled') {
				console.log('error: ' + item.reason);
			}
		});
		console.log('FIO Refresh complete');
	});
}, 86400000);
