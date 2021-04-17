// const FNAR = require('../FNAR/FNAR_Auth.js');

module.exports = {
	name: 'refreshauth',
	description: 'Get FIO authentication key',
	args: false,
	usage: '',
	aliases: ['ra'],
	execute(message) {
		/*
		FNAR.authTokenP().then(function(value) {
			message.channel.send(value);
		}, function(err) {
			message.channel.send(err);
		});
		*/
	},
};