

module.exports = {
	name: 'deleteinventory',
	description: 'Use this Command to delete inventory listings',
	args: false,
	aliases: ['deletei', 'deleteinv', 'di'],
	usage: '<planet> and/or <mat>, blank to delete all of your inventory listings. ',
	execute(message, args, con) {
		const users = require('../users.js');
		const functions = require('../functions.js');
		const queryValues: any = {};
		let userID = users.searchUsers(message.author.id);
		if(userID) {
			userID = userID.id;
		}
		else {
			return message.channel.send('**ERROR!** could not find user');
		}
		// identify the values that have been passed. 'id' will change a planet's friendly name to its ID.
		args.forEach(function(value) {
			const identified = functions.id(value);
			if(identified) {
				queryValues[identified.type] = identified.value;
			}
		});
		if(queryValues.material && queryValues.planet) {
			const selectInv = new Promise((resolve, reject) => {
				const messageContents: string[] = [];
				con.query(
					`SELECT * FROM inventory WHERE mat = '${queryValues.material}' AND planet = '${queryValues.planet}' AND userid = ${userID}`,
					function(err, result) {
						console.log(result);
						if (err) {
							reject(err);
						}
						else if (result.length === 0) {
							messageContents.push(`No ${queryValues.material} on ${queryValues.planet}`);
							resolve(messageContents);
						}
						else {
							messageContents.push(`Found ${result.length} row${(result.length===1 ? '' : 's')} of ${queryValues.material} on ${queryValues.planet}. React with ✅ to confirm, ❌ to cancel`);
							resolve(messageContents);
						}
					});
			});

			let replyMessage;
			selectInv.then(function(selectResults) {
				message.channel.send(selectResults).then(function(msg) {
					replyMessage = msg;
					replyMessage.react('✅').then(() => replyMessage.react('❌'));

					const filter = (reaction, user) => {
						return ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
					};

					replyMessage.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
						.then(collected => {
							const reaction = collected.first();

							if (reaction.emoji.name === '✅') {

								const deleteInv = new Promise((resolve, reject) => {
									const messageContents: string[] = [];
									con.query(
										`DELETE FROM inventory WHERE mat = '${queryValues.material}' AND planet = '${queryValues.planet}' AND userid = ${userID}`,
										function(err, result) {
											if (err) {
												reject(err);
											}
											else if (result.length === 0) {
												messageContents.push(`No ${queryValues.material} on ${queryValues.planet}`);
												resolve(messageContents);
											}
											else {
												messageContents.push(`Deleted ${result.affectedRows} row${(result.affectedRows===1 ? '' : 's')} of ${queryValues.material} on ${queryValues.planet}.`);
												resolve(messageContents);
											}
										});
								});

								deleteInv.then((result) => {
									message.channel.send(result, { split: true });
								}, function(err) {
									message.channel.send('Error!');
									console.log(err);
								})
									.catch(function(err) {
										message.channel.send('Bot Error!');
										console.log(err);
									});
							}
							else {
								replyMessage.delete();
							}
						}).catch(function() {
							replyMessage.edit('timeout reached');
						});
				});
			});
		}
		else if (queryValues.material) {
			const selectInv = new Promise((resolve, reject) => {
				const messageContents: string[] = [];
				con.query(
					`SELECT * FROM inventory WHERE mat = '${queryValues.material}' AND userid = ${userID}`,
					function(err, result) {
						console.log(result);
						if (err) {
							reject(err);
						}
						else if (result.length === 0) {
							messageContents.push(`No ${queryValues.material} found`);
							resolve(messageContents);
						}
						else {
							messageContents.push(`Found ${result.length} row${(result.length===1 ? '' : 's')} of ${queryValues.material}.`);
							resolve(messageContents);
						}
					});
			});

			let replyMessage;
			selectInv.then(function(selectResults) {
				message.channel.send(selectResults).then(function(msg) {
					replyMessage = msg;
					replyMessage.react('✅').then(() => replyMessage.react('❌'));

					const filter = (reaction, user) => {
						return ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
					};

					replyMessage.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
						.then(collected => {
							const reaction = collected.first();

							if (reaction.emoji.name === '✅') {

								const deleteInv = new Promise((resolve, reject) => {
									const messageContents: string[] = [];
									con.query(
										`DELETE FROM inventory WHERE mat = '${queryValues.material}' AND userid = ${userID}`,
										function(err, result) {
											if (err) {
												reject(err);
											}
											else if (result.length === 0) {
												messageContents.push(`No ${queryValues.material} found`);
												resolve(messageContents);
											}
											else {
												messageContents.push(`Deleted ${result.affectedRows} row${(result.affectedRows===1 ? '' : 's')} of ${queryValues.material}.`);
												resolve(messageContents);
											}
										});
								});

								deleteInv.then((result) => {
									message.channel.send(result, { split: true });
								}, function(err) {
									message.channel.send('Error!');
									console.log(err);
								})
									.catch(function(err) {
										message.channel.send('Bot Error!');
										console.log(err);
									});
							}
							else {
								replyMessage.delete();
							}
						}).catch(function() {
							replyMessage.edit('timeout reached');
						});
				});
			});
		}
		else if (queryValues.planet) {
			const selectInv = new Promise((resolve, reject) => {
				const messageContents: string[] = [];
				con.query(
					`SELECT * FROM inventory WHERE planet = '${queryValues.planet}' AND userid = ${userID}`,
					function(err, result) {
						console.log(result);
						if (err) {
							reject(err);
						}
						else if (result.length === 0) {
							messageContents.push(`No ${queryValues.planet} entries found`);
							resolve(messageContents);
						}
						else {
							messageContents.push(`Found ${result.length} row${(result.length===1 ? '' : 's')} on ${queryValues.planet}.`);
							resolve(messageContents);
						}
					});
			});

			let replyMessage;
			selectInv.then(function(selectResults) {
				message.channel.send(selectResults).then(function(msg) {
					replyMessage = msg;
					replyMessage.react('✅').then(() => replyMessage.react('❌'));

					const filter = (reaction, user) => {
						return ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
					};

					replyMessage.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
						.then(collected => {
							const reaction = collected.first();

							if (reaction.emoji.name === '✅') {

								const deleteInv = new Promise((resolve, reject) => {
									const messageContents: string[] = [];
									console.log('deleting inventory');
									con.query(
										`DELETE FROM inventory WHERE planet = '${queryValues.planet}' AND userid = ${userID}`,
										function(err, result) {
											if (err) {
												reject(err);
											}
											else if (result.length === 0) {
												messageContents.push(`No ${queryValues.planet} entries found.`);
												resolve(messageContents);
											}
											else {
												messageContents.push(`Deleted ${result.affectedRows} row${(result.affectedRows===1 ? '' : 's')} on ${queryValues.planet}.`);
												resolve(messageContents);
											}
										});
								});

								deleteInv.then((result) => {
									message.channel.send(result, { split: true });
								}, function(err) {
									message.channel.send('Error!');
									console.log(err);
								})
									.catch(function(err) {
										message.channel.send('Bot Error!');
										console.log(err);
									});
							}
							else {
								replyMessage.delete();
							}
						}).catch(function() {
							replyMessage.edit('timeout reached');
						});
				});
			});
		}
		else if (args.length === 0) {
			const selectInv = new Promise((resolve, reject) => {
				const messageContents: string[] = [];
				con.query(
					`SELECT * FROM inventory WHERE userid = ${userID}`,
					function(err, result) {
						console.log(result);
						if (err) {
							reject(err);
						}
						else if (result.length === 0) {
							messageContents.push(`No entries found for ${message.author.username}`);
							resolve(messageContents);
						}
						else {
							messageContents.push(`Found ${result.length} row${(result.length===1 ? '' : 's')} for ${message.author.username}.`);
							resolve(messageContents);
						}
					});
			});

			let replyMessage;
			selectInv.then(function(selectResults) {
				message.channel.send(selectResults).then(function(msg) {
					replyMessage = msg;
					replyMessage.react('✅').then(() => replyMessage.react('❌'));

					const filter = (reaction, user) => {
						return ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
					};

					replyMessage.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
						.then(collected => {
							const reaction = collected.first();

							if (reaction.emoji.name === '✅') {

								const deleteInv = new Promise((resolve, reject) => {
									const messageContents: string[] = [];
									console.log('deleting inventory');
									con.query(
										`DELETE FROM inventory WHERE userid = ${userID}`,
										function(err, result) {
											if (err) {
												reject(err);
											}
											else if (result.length === 0) {
												messageContents.push(`No entries found for ${message.author.username}`);
												resolve(messageContents);
											}
											else {
												messageContents.push(`Deleted ${result.affectedRows} row${(result.affectedRows===1 ? '' : 's')} for ${message.author.username}.`);
												resolve(messageContents);
											}
										});
								});

								deleteInv.then((result) => {
									message.channel.send(result, { split: true });
								}, function(err) {
									message.channel.send('Error!');
									console.log(err);
								})
									.catch(function(err) {
										message.channel.send('Bot Error!');
										console.log(err);
									});
							}
							else {
								replyMessage.delete();
							}
						}).catch(function() {
							replyMessage.edit('timeout reached');
						});
				});
			});
		}
	},
};