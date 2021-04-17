import { queryValue } from "../types";

function FIOUserFilter(arr, query) {
	return arr.filter(function(item) {
		return item.userid === query;
	});
}

function uppercasePlanetID(planetID) {
	return(planetID.slice(0, 2).toUpperCase() + planetID.slice(2));
}

module.exports = {
	name: 'buy',
	description: 'Use this command to query what Yellow Fin members may have the desired material',
	args: false,
	aliases: ['b'],
	public: true,
	usage: '<material> <planet(optional)>',
	execute(message, args, con) {
		const database = require('../databaseCalls.js');
		const FIO = require('../FNAR/FIO_functions.js');
		const users = require('../users.js');
		const functions = require('../functions.js');

		const queryValues: queryValue = {};
		let databaseResults;
		let FIOResults;

		// identify the values that have been passed. 'id' will change a planet's friendly name to its ID.
		args.forEach((value) => {
			const identified = functions.id(value);
			if(identified) {
				queryValues[identified.type] = identified.value;
			}
		});
		if(queryValues.material) {

			database.invQuery(con, queryValues)
				.then((result) => {
					databaseResults = result;
					return FIO.getFIOData(con, message);
				})
				.then((result) => {
					FIOResults = result;
					// parse a new message with the results
					return new Promise((resolve, reject) => {

						if (databaseResults.length === 0) {
							// if no results in the database, return a message indicating as such.
							console.log('No database results');
							reject('No results found for the given input');
						}
						else {
							// if there are results, sort through them
							const length = databaseResults.length;
							const returnedInventory = [];
							databaseResults.forEach(function(item, index) {
								// for every item, get the price and terms. This also catagorizes the results by user, adding a header at each new user encountered.
								let planet = functions.planetName(item.planet);
								planet = planet ? planet : item.planet;
								item.planetName = planet;

								item.user = users.users[item.userid].user;

								if(users.isFIOUser(item.userid)) {
									// If user is FIO user, process the data that way
									const userItems = FIOUserFilter(FIOResults, item.userid);
									// console.log(JSON.parse(userItems[0]['storage_data'])[uppercasePlanetID(item.planet)]);
									let FIOQuantity = null;
									let FIOTimestamp;
									try {
										FIOQuantity = JSON.parse(userItems[0].storage_data)[uppercasePlanetID(item.planet)][item.mat.toUpperCase()];
										FIOTimestamp = Date.parse(JSON.parse(userItems[0].storage_data)[uppercasePlanetID(item.planet)].timestamp + 'Z');
									}
									catch(e) {
										console.log(e);
									}
									FIOQuantity = FIOQuantity ? FIOQuantity : 0;
									FIOTimestamp = FIOTimestamp ? FIOTimestamp : item.timestamp;

									item.quantity = FIOQuantity - item.quantity;
									item.timestamp = FIOTimestamp;
									if(item.quantity > 0) {
										returnedInventory.push(item);
									}
								}
								else if(item.quantity > 0) {
									returnedInventory.push(item);
								}

								if (index === (length - 1)) {
									resolve(returnedInventory);
								}

							});
						}
					});
				}).then((result) => {
					const planetAppend = (queryValues.planet ? (' on ' + functions.planetName(queryValues.planet)) : '');
					if(result.length === 0) {
						console.log('quantities found <= 0');
						message.channel.send('No YellowFin members appear to have the material requested' + planetAppend + '.');
					}
					else {
						const messageContents = [];
						messageContents.push('The following Yellow Fin members may have inventory available' + planetAppend + ':');
						// send the message containing the results
						result.forEach(function(item) {
							if(queryValues.planet) {
								messageContents.push(`<@${users.users[item.userid].discordID}>`);
							}
							else {
								messageContents.push(`<@${users.users[item.userid].discordID}> on ${item.planetName}`);
							}
						});
						message.channel.send(messageContents, { split: true });
					}
				}, function() {
					const planetAppend = (queryValues.planet ? (' on ' + functions.planetName(queryValues.planet)) : '');
					message.channel.send('No YellowFin members appear to have the material requested' + planetAppend + '.');
				}).catch(function(error) {
					// catch any errors that pop up.
					message.channel.send('Error! ' + error);
					// console.log(error);
				});
		}
		else {
			message.channel.send('Unable to find any results for the given arguments (check your planet and material names)');
		}
	},
};