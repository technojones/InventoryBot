module.exports = {
	name: 'identify',
	description: 'Identify the provided expression',
	aliases: ['id'],
	execute(message, args) {
		const functions = require('../functions.js');
		if (!args.length) {
			return message.channel.send(`You didn't provide any arguments, ${message.author}!`);
		}
		console.log('Identifying: ' + args[0]);
		const idValue = functions.id(args[0]);
		if(idValue) {
			message.channel.send(idValue.type + ': ' + idValue.value);
		}
		else {
			message.channel.send('could not identify ' + args[0]);
		}
	},
};