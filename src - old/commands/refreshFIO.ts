// const FNAR = require('../FNAR/FNAR_Auth.js');
module.exports = {
	name: 'refreshFIO',
	description: 'Refreshes FIO data',
	args: false,
	usage: '',
	aliases: ['rf'],
	execute(message, args, con) {
		const FIOF = require('../FNAR/FIO_functions.js');
		message.channel.send('Refreshing FIO');
		FIOF.refresh(con)
			.then(function() {
				message.channel.send('Refresh Successful');
			}).catch(function(error) {
				message.channel.send(error);
			});
	},
};