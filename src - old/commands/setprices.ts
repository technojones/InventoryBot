import { queryValue } from "../types";

module.exports = {
	name: 'setprices',
	description: 'Use this Command to set your corp prices',
	args: true,
	aliases: ['setp', 'setprc', 'sp', 'setprice'],
	usage: '<planet> <mat> <price> <terms>\n (optional) <mat> <price> <terms>\n [use `-` or `global to set universal price]',
	execute(message, args, con) {
		const users = require('../users.js');
		const functions = require('../functions.js');

		if (args) {

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
					const terms = item[item.length + 1] ? item[item.length + 1] : '';
					// if the material isn't a material, return an error
					if (!queryValues.material) {
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
						if (index===(length - 1)) {
							setTimeout(function() {
								messageContents.push(`**ERROR!** in line ${index + 1}: improperly formatted or missing price (${item})`);
								resolve(messageContents);
							}, 100);
						}
						else {
							messageContents.push(`**ERROR!** in line ${index + 1}: improperly formatted or missing price (${item})`);
						}
					}
					else {
						const mat = queryValues.material.toUpperCase();
						// Attempt to update a currently set inventory
						con.query(
							'SELECT * FROM corp_price WHERE userid = ? AND planet = ? AND mat = ?', [
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
										'INSERT INTO corp_price (userid, planet, mat, price, terms) VALUES (?, ?, ?, ?, ?)', [
											userID,
											planet,
											mat,
											queryValues.number,
											terms,
										], function(queryErr) {
											let outputplanet = functions.planetName(planet);
											outputplanet = outputplanet ? outputplanet : planet;
											if (queryErr) reject('Database Error: ' + queryErr.sqlMessage);
											else messageContents.push('`' + `Added ${mat} for ₡${queryValues.number} on ${outputplanet}` + '`');
											if (index===(length - 1)) resolve(messageContents);
										});
								}
								// Otherwise, update the row with the new quantity
								else {
									con.query(
										'UPDATE corp_price SET price = ?, terms = ? WHERE userid = ? AND planet = ? AND mat = ?', [
											queryValues.number,
											terms,
											userID,
											planet,
											mat,
										], function(queryErr) {
											let outputplanet = functions.planetName(planet);
											outputplanet = outputplanet ? outputplanet : planet;
											if (queryErr) reject('Database Error: ' + queryErr.sqlMessage);
											else messageContents.push('`' + `Updated ${mat} for ₡${queryValues.number} on ${outputplanet} (prev: ₡` + result[0].price + ')`');
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