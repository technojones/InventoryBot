module.exports = {
	name: 'help',
	description: 'List all of my commands or info about a specific command.',
	usage: '[command name]',
	execute(message, args) {
		const { prefix } = require('../config.json');
		const users = require('../users.js');
		const data = [];
		const { commands } = message.client;
		let filteredCommands;
		console.log(commands);
		if(users.searchUsers(message.author.id)) {
			filteredCommands = commands;
			console.log(filteredCommands);
		}
		else {
			filteredCommands = commands.filter((item => item.public));
		}

		if (!args.length) {
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
		const name = args[0].toLowerCase();
		const command = filteredCommands.get(name) || filteredCommands.find(c => c.aliases && c.aliases.includes(name));

		if (!command) {
			return message.reply('that\'s not a valid command!');
		}

		data.push(`**Name:** ${command.name}`);

		if (command.aliases) data.push(`**Aliases:** ${command.aliases.join(', ')}`);
		if (command.description) data.push(`**Description:** ${command.description}`);
		if (command.usage) data.push(`**Usage:** ${prefix}${command.name} ${command.usage}`);

		message.channel.send(data, { split: true });

	},
};