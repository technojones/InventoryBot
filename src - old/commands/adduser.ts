
module.exports = {
	name: 'adduser',
	description: 'Command to add a user to the database',
	args: true,
	usage: '<3 Letter Company ID> <User Name> <Discord mention> <Is FIO User? [true/yes/fio will add to FIO list]>',
	execute(message, args, con) {
		const users = require('../users.js');
		const FIO_F = require('../FNAR/FIO_functions');

		const messageUser = message.mentions.users.first();
		if (messageUser && args[0] && args[1]) {
			console.log(args[3]);
			if(args[3].toLowerCase() === 'true' || args[3].toLowerCase() === 'yes' || args[3].toLowerCase() === 'fio') {
				message.channel.send(`Company ID: ${args[0]}\nUser: ${args[1]}\nDiscord: ${messageUser.id}, ${messageUser.username}\nIs FIO User? ${args[3]}`);
				FIO_F.queryUser(args[1])
					.then(function() {
						message.channel.send('FIO User Verified');
						con.query(
							`INSERT INTO users (companyID, user, discordID, discord, fioUsername) VALUES ('${args[0]}','${args[1]}','${messageUser.id}','${messageUser.username}','${args[1]}')`,
							function(err, result) {
								if (err) {
									message.channel.send('**ERROR!** ' + err.sqlMessage);
								}
								else {
									message.channel.send('Result: ' + result);
								}
							});
						users.updateUsers(con);
					}, function(e) {
						message.channel.send('Error retriving FIO data. Make sure Site and Storage permissions are set. (' + e + ')');
					}).catch(e => message.channel.send(e));
			}
			else {
				message.channel.send(`Company ID: ${args[0]}\nUser: ${args[1]}\nDiscord: ${messageUser.id}, ${messageUser.username}\nIs FIO User? No`);
				con.query(
					`INSERT INTO users (companyID, user, discordID, discord) VALUES ('${args[0]}','${args[1]}','${messageUser.id}','${messageUser.username}')`,
					function(err, result) {
						if (err) message.channel.send('**ERROR!** ' + err.sqlMessage);
						else message.channel.send('Result: ' + result);
					});
				users.updateUsers(con);
			}
		}
		else {
			return message.channel.send('Please use the following structure: 3 Letter Company ID, User Name, Discord Tag');
		}
	},
};