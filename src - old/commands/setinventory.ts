import { queryValue } from "../types";

module.exports = {
	name: 'setinventory',
	description: 'Use this Command to set your inventory - or for FIO users, your buffer. For FIO users, any item with an entry will be advertised to the corp. Any value above 0 will be subtracted from your inventory as a buffer.',
	args: true,
	aliases: ['seti', 'setinv', 'si', 'setinventories', 'setbuffer', 'sb', 'setb', 'setbuf'],
	usage: '<planet> <mat> <quantity>\n (optional) <mat> <quantity>',
	execute(message, args, con) {
		const users = require('../users.js');
		const functions = require('../functions.js');

		if (args) {
			// Array.isArray(args[0])

			// get the current time for a timestamp
			const ts = Date.now();
			// Find the database user id of the person updating the inventory
			let userID = users.searchUsers(message.author.id);
			if(userID) {
				userID = userID.id;
			}
			else {
				return message.channel.send('**ERROR!** could not find user');
			}

			let firstLine;
			// Check if the command is multiline, and pop the first line out if it is.
			if(Array.isArray(args[0])) {
				firstLine = args[0];
			}
			else {
				firstLine = args;
			}

			// identify all the first line arguments
			const firstLineArgs: queryValue = {};
			firstLine.forEach(function(item) {
				const identified = functions.id(item);
				firstLineArgs[identified.type] = identified.value;
			});

			let planet;
			// If planet is a friendly name, return the designation
			if (firstLineArgs.planet) {
				planet = firstLineArgs.planet;
			}
			else {
				// if no planet was found, return an error
				return message.channel.send('**ERROR!** could not find a planet in the given arguments.');
			}

			// If it's not a multiline command, put the first line in an array - this will allow the program to cycle as if it were multiline.
			if(!Array.isArray(args[0])) {
				args = Array(firstLine);
			}


			// iterate over each line.
			const promise = new Promise((resolve, reject) => {
				const messageContents = [];
				const length = args.length;
				args.forEach(function(item, index) {
					const queryValues: queryValue = {};
					// identify the values that have been passed. 'id' will change a planet's friendly name to its ID.
					item.forEach(function(value) {
						const identified = functions.id(value);
						if(identified) {
							queryValues[identified.type] = identified.value;
						}
					});

					if (!queryValues.material) {
						console.log(queryValues);
						if (index===(length - 1)) {
							setTimeout(function() {
								messageContents.push(`**ERROR!** in line ${index + 1}: improperly formatted or missing material (${item})`);
								resolve(messageContents);
							}, 100);
						}
						else {
							messageContents.push(`**ERROR!** in line ${index + 1}: improperly formatted or missing material (${item})`);
						}
					}
					else if (!queryValues.number) {
						console.log(queryValues);
						if (index===(length - 1)) {
							setTimeout(function() {
								messageContents.push(`**ERROR!** in line ${index + 1}: improperly formatted or missing quantity (${item})`);
								resolve(messageContents);
							}, 100);
						}
						else {
							messageContents.push(`**ERROR!** in line ${index + 1}: improperly formatted or missing quantity (${item})`);
						}
					}
					else {
						const mat = queryValues.material.toUpperCase();
						// Attempt to update a currently set inventory
						con.query(
							'SELECT * FROM inventory WHERE userid = ? AND planet = ? AND mat = ?', [
								userID,
								planet,
								mat,
							], function(err, result) {
								if (err) {
									reject('Database Error: ' + err.sqlMessage);
								}
								// If there was nothing found, create a new row
								else if (!result[0]) {
									con.query(
										'INSERT INTO inventory (userid, planet, mat, quantity, timestamp) VALUES (?, ?, ?, ?, ?)', [
											userID,
											planet,
											mat,
											queryValues.number,
											ts,
										], function(queryErr) {
											let outputplanet = functions.planetName(planet);
											outputplanet = outputplanet ? outputplanet : planet;
											if (queryErr) reject('Database Error: ' + queryErr.sqlMessage);
											else messageContents.push('`' + `Added ${queryValues.number} ${mat} on ${outputplanet}` + '`');
											if (index===(length - 1)) resolve(messageContents);
										});
								}
								// Otherwise, update the row with the new quantity
								else {
									con.query(
										'UPDATE inventory SET quantity = ?, timestamp = ? WHERE userid = ? AND planet = ? AND mat = ?', [
											queryValues.number,
											ts,
											userID,
											planet,
											mat,
										], function(queryErr) {
											let outputplanet = functions.planetName(planet);
											outputplanet = outputplanet ? outputplanet : planet;
											if (queryErr) reject('Database Error: ' + queryErr.sqlMessage);
											else messageContents.push('`' + `Updated ${queryValues.number} ${mat} on ${outputplanet} (prev: ` + result[0].quantity + ')`');
											if (index===(length - 1)) resolve(messageContents);
										});
								}
							});
					}
				});
			});

			promise.then((result) => {
				message.channel.send(result, { split: true });
			}, function(err) {
				message.channel.send(err);
				console.log(err);
			})
				.catch(function(err) {
					message.channel.send('Bot Error! ' + err);
					console.log(err);
				});
		}
		else {
			return message.channel.send('Argument Error');
		}
	},
};