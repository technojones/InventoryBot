import * as types from "../types";

function FIOUserFilter(arr, query) {
	return arr.filter(function(item) {
		return item.userid === query;
	});
}

module.exports = {
	name: 'queryinventory',
	description: 'Use this Command to query inventory',
	args: false,
	aliases: ['queryi', 'queryinv', 'qi'],
	usage: '<planet> and/or <mat>. If left blank, will return all of your inventory',
	execute(message, args, con) {
		const users = require('../users.js');
		const database = require('../databaseCalls.js');
		const FIO = require('../FNAR/FIO_functions.js');
		const functions = require('../functions.js');

		const queryValues: types.queryValue = {};
		let databaseResults;
		let FIOResults;

		// identify the values that have been passed. 'id' will change a planet's friendly name to its ID.
		args.forEach(function(value) {
			const identified = functions.id(value);
			if(identified) {
				console.log(identified);
				if(queryValues[identified.type]) {
					if(Array.isArray(queryValues[identified.type])) {
						queryValues[identified.type].push(identified.value);
					}
					else {
						queryValues[identified.type] = [queryValues[identified.type], identified.value];
					}
				}
				else {
					queryValues[identified.type] = identified.value;
				}
			}
		});
		if(args.length > 0) {

			database.invQuery(con, queryValues)
				.then((result) => {
					databaseResults = result;
					return FIO.getFIOData(con, message);
				})
				.then((result) => {
					FIOResults = result;
					// parse a new message with the results
					return new Promise((resolve) => {
						const messageContents = [];
						if (databaseResults.length === 0) {
							// if no results in the database, return a message indicating as such.
							messageContents.push('No results found for the given input');
							resolve(messageContents);
						}
						else {
							// if there are results, sort through them
							let lastGroup;
							const length = databaseResults.length;
							databaseResults.forEach(function(item, index) {
								// for every item, get the price and terms. This also catagorizes the results by user, adding a header at each new user encountered.
								functions.get_prices(con, item.planet, item.userid, item.mat, function(value, terms) {
									let planet = functions.planetName(item.planet);
									planet = planet ? planet : item.planet;
									item.planetName = planet;
									let groupBy;
									if(queryValues.planet) {
										groupBy = 'user';
									}
									else {
										groupBy = 'planetName';
									}

									item.user = users.users[item.userid].user;

									if(users.isFIOUser(item.userid)) {
										// If user is FIO user, process the data that way
										const userItems = FIOUserFilter(FIOResults, item.userid);
										// console.log(JSON.parse(userItems[0]['storage_data'])[functions.uppercasePlanetID(item.planet)]);
										let FIOQuantity = null;
										let FIOStatus = '▫️';
										let FIOTimestamp;
										try {
											FIOQuantity = JSON.parse(userItems[0].storage_data)[functions.uppercasePlanetID(item.planet)][item.mat.toUpperCase()];
											FIOTimestamp = Date.parse(JSON.parse(userItems[0].storage_data)[functions.uppercasePlanetID(item.planet)].timestamp + 'Z');
										}
										catch(e) {
											console.log(e);
											FIOStatus = '🔸';
										}
										FIOQuantity = FIOQuantity ? FIOQuantity : 0;
										FIOTimestamp = FIOTimestamp ? FIOTimestamp : item.timestamp;

										if (lastGroup!==item[groupBy]) {
											// if the user is different, add the header.
											messageContents.push('**' + item[groupBy] + '**');
										}

										let thisLine = ('` ' + (FIOQuantity - item.quantity));
										if(!queryValues.material || Array.isArray(queryValues.material)) thisLine += (' ' + item.mat);
										if((!queryValues.planet && groupBy!=='planetName') || Array.isArray(queryValues.planet)) thisLine += (' on ' + planet);
										if((!queryValues.user && !queryValues.user_id && (groupBy!=='user')) || Array.isArray(queryValues.user)) thisLine += (' from ' + item.user);
										messageContents.push(String(thisLine + ((value!==undefined) ? ' at ₡' + value + ' (' + terms + ')' : '')).padEnd(35, ' ') + '` *' + Math.floor((((Date.now() - FIOTimestamp) / 1000) / 60) / 60) + 'h ago* ' + FIOStatus);
									}
									else {
										if (lastGroup!==item[groupBy]) {
											// if the user is different, add the header.
											messageContents.push('**' + item[groupBy] + '**');
										}
										let thisLine = ('` ' + item.quantity);
										if(!queryValues.material || Array.isArray(queryValues.material)) thisLine += (' ' + item.mat);
										if((!queryValues.planet && groupBy!=='planetName') || Array.isArray(queryValues.planet)) thisLine += (' on ' + planet);
										if((!queryValues.user && !queryValues.user_id && (groupBy!=='user')) || Array.isArray(queryValues.user)) thisLine += (' from ' + item.user);
										messageContents.push(String(thisLine + ((value!==undefined) ? ' at ₡' + value + ' (' + terms + ')' : '')).padEnd(35, ' ') + '` *' + Math.floor((((Date.now() - item.timestamp) / 1000) / 60) / 60) + 'h ago*');
									}
									lastGroup = item[groupBy];
									// if this is the last item in the list, resolve the contents.
									if (index===(length - 1)) {
										resolve(messageContents);
									}
								});

							});
						}
					});
				}).then((result) => {
					// send the message containing the results
					message.channel.send(result, { split: true });
				}).catch(function(error) {
					// catch any errors that pop up.
					message.channel.send('Error! ' + error);
					console.log(error);
				});
		}
		else if (args.length === 0) {
			const user = users.searchUsers(message.author.id);
			const promise = new Promise((resolve, reject) => {
				const messageContents = [];
				con.query(
					`SELECT * FROM inventory WHERE userid = '${user.id}' ORDER BY planet, mat`,
					function(err, result) {
						if (err) {
							reject(err);
						}
						else if (result.length === 0) {
							messageContents.push(`No ${user.user} inventory found`);
							resolve(messageContents);
						}
						else {
							let lastplanet;
							const length = result.length;
							if(users.isFIOUser(user.id)) {
								messageContents.push(`__Listing Buffer Values for FIO user ${user.user}__`);
							}
							else {
								messageContents.push(`__Listing Inventory Values for ${user.user}__`);
							}
							result.forEach(function(item, index) {
								functions.get_prices(con, item.planet, item.userid, item.mat, function(value, terms) {
									let planet = functions.planetName(item.planet);
									planet = planet ? planet : item.planet;
									if (lastplanet===item.planet) {
										messageContents.push(String('` ' + item.mat.padEnd(3, ' ') + ': ' +
											item.quantity + ((value!==undefined) ? ' at ₡' + value + ' (' + terms + ')' : '')).padEnd(30, ' ') + '` *' +
											Math.floor((((Date.now() - item.timestamp) / 1000) / 60) / 60) + 'h ago* ');
									}
									else {
										messageContents.push('**' + planet + '**');
										messageContents.push(String('` ' + item.mat.padEnd(3, ' ') + ': ' +
											item.quantity + ((value!==undefined) ? ' at ₡' + value + ' (' + terms + ')' : '')).padEnd(30, ' ') + '` *' +
											Math.floor((((Date.now() - item.timestamp) / 1000) / 60) / 60) + 'h ago* ');
									}
									lastplanet = item.planet;
									if (index===(length - 1)) {
										resolve(messageContents);
									}
								});
							});
						}
					});
			});

			promise.then((result) => {
				message.channel.send(result, { split: true });
			}, function(err) {
				message.channel.send('Database Error!');
				console.log(err);
			})
				.catch(function(err) {
					message.channel.send('Bot Error!');
					console.log(err);
				});
		}
		else {
			message.channel.send('Unable to find any results for the given arguments (check your planet and material names)');
		}
	},
};