// const planetLookup = require('./planets.json');

import * as types from "../types";

module.exports = {
	name: 'queryprices',
	description: 'Use this Command to query prices',
	args: false,
	aliases: ['queryp', 'queryprc', 'qp', 'queryprice'],
	usage: '<planet> and/or <mat>. If left blank, will return all of your price list',
	execute(message, args, con) {
		const users = require('../users.js');
		const functions = require('../functions.js');
		const FIOM = require('../FNAR/FNAR_Market.js');
		const queryValues: types.queryValue = {};
		// identify the values that have been passed. 'id' will change a planet's friendly name to its ID.
		args.forEach(function(value) {
			const identified = functions.id(value);
			if(identified) {
				queryValues[identified.type] = identified.value;
			}
		});

		if(queryValues.material && queryValues.planet) {
			const promise = new Promise((resolve, reject) => {
				const messageContents = [];
				con.query(
					`SELECT * FROM corp_price WHERE mat = '${queryValues.material}' AND (planet = '${queryValues.planet}' OR planet = '*global') ORDER BY userid, planet`,
					function(err, result) {
						if (err) {
							reject(err);
						}
						else if (result.length === 0) {
							messageContents.push(`No ${queryValues.material} on ${queryValues.planet} or global price`);
							resolve(messageContents);
						}
						else {
							let lastuser;
							result.forEach(function(item) {
								let planet = functions.planetName(item.planet);
								planet = planet ? planet : item.planet;
								if (lastuser===item.userid) {
									if(item.planet==='*global') {
										messageContents.push('` ₡' + item.price + ' GLOBAL (' + item.terms + ')`');
									}
									else {
										messageContents.push('` ₡' + item.price + ' on ' + planet + ' (' + item.terms + ')`');
									}

								}
								else if(item.planet==='*global') {
									messageContents.push('**' + users.users[item.userid].user + '**');
									messageContents.push('` ₡' + item.price + ' GLOBAL (' + item.terms + ')`');
								}
								else {
									messageContents.push('**' + users.users[item.userid].user + '**');
									messageContents.push('` ₡' + item.price + ' on ' + planet + ' (' + item.terms + ')`');
								}
								lastuser = item.userid;
							});
							resolve(messageContents);
						}
					});
			});

			let newMessage;
			promise.then((result) => {
				newMessage = result;
				return FIOM.getMarket(queryValues.material + '.CI1');
			}, function(err) {
				message.channel.send('Error!');
				console.log(err);
			})
				.then((result) => {
					newMessage.unshift('__CI1 Average: ' + Math.floor(result.PriceAverage) + ' | Corp Rate: ' + Math.floor(result.PriceAverage * 0.75) + '__');
					message.channel.send(newMessage, { split: true });

				}, function(err) {
					newMessage.unshift('Error retriving market data: ' + err);
					message.channel.send(newMessage, { split: true });
				}).catch(function(err) {
					message.channel.send('Bot Error!');
					console.log(err);
				});
		}
		else if (queryValues.material) {
			const promise = new Promise((resolve, reject) => {
				const messageContents = [];
				con.query(
					`SELECT * FROM corp_price WHERE mat = '${queryValues.material}' ORDER BY userid, planet`,
					function(err, result) {
						if (err) {
							reject(err);
						}
						else if (result.length === 0) {
							messageContents.push(`No ${queryValues.material} prices found, use market`);
							resolve(messageContents);
						}
						else {
							let lastuser;
							result.forEach(function(item) {
								let planet = functions.planetName(item.planet);
								planet = planet ? planet : item.planet;
								if (lastuser===item.userid) {
									if(item.planet==='*global') {
										messageContents.push('` ₡' + item.price + ' GLOBAL (' + item.terms + ')`');
									}
									else {
										messageContents.push('` ₡' + item.price + ' on ' + planet + ' (' + item.terms + ')`');
									}

								}
								else if(item.planet==='*global') {
									messageContents.push('**' + users.users[item.userid].user + '**');
									messageContents.push('` ₡' + item.price + ' GLOBAL (' + item.terms + ')`');
								}
								else {
									messageContents.push('**' + users.users[item.userid].user + '**');
									messageContents.push('` ₡' + item.price + ' on ' + planet + ' (' + item.terms + ')`');
								}
								lastuser = item.userid;
							});
							resolve(messageContents);
						}
					});
			});
			let newMessage;
			promise.then((result) => {
				newMessage = result;
				return FIOM.getMarket(queryValues.material + '.CI1');
			}, function(err) {
				message.channel.send('Error!');
				console.log(err);
			})
				.then((result) => {
					newMessage.unshift('__CI1 Average: ' + Math.floor(result.PriceAverage) + ' | Corp Rate: ' + Math.floor(result.PriceAverage * 0.75) + '__');
					message.channel.send(newMessage, { split: true });

				}, function(err) {
					newMessage.unshift('Error retriving market data: ' + err);
					message.channel.send(newMessage, { split: true });
				}).catch(function(err) {
					message.channel.send('Bot Error!');
					console.log(err);
				});
		}
		else if (queryValues.planet) {
			const promise = new Promise((resolve, reject) => {
				const messageContents = [];
				con.query(
					`SELECT * FROM corp_price WHERE planet = '${queryValues.planet}' ORDER BY userid, mat`,
					function(err, result) {
						if (err) {
							reject(err);
						}
						else if (result.length === 0) {
							messageContents.push(`No ${queryValues.planet} prices found, use market or global`);
							resolve(messageContents);
						}
						else {
							let lastuser;
							result.forEach(function(item) {
								if (lastuser===item.userid) {
									messageContents.push('` ' + item.mat.padEnd(3, ' ') + ' at ₡' + item.price + ' *(' + item.terms + ')*`');
								}
								else {
									messageContents.push('**' + users.users[item.userid].user + '**');
									messageContents.push('` ' + item.mat.padEnd(3, ' ') + ' at ₡' + item.price + ' (' + item.terms + ')`');
								}
								lastuser = item.userid;
							});
							resolve(messageContents);
						}
					});
			});
			promise.then((result) => {
				message.channel.send(result, { split: true });
			}, function(err) {
				message.channel.send('Error!');
				console.log(message);
				console.log(err);
			})
				.catch(function(err) {
					message.channel.send('Bot Error!');
					console.log(message);
					console.log(err);
				});
		}
		else if (args.length === 0) {
			const promise = new Promise((resolve, reject) => {
				const user = users.searchUsers(message.author.id);
				console.log(user);
				const messageContents = [];
				con.query(
					`SELECT * FROM corp_price WHERE userid = '${user.id}' ORDER BY planet, mat`,
					function(err, result) {
						if (err) {
							reject(err);
						}
						else if (result.length === 0) {
							messageContents.push(`No ${user.user} prices found`);
							resolve(messageContents);
						}
						else {
							let lastplanet;
							result.forEach(function(item) {
								if (lastplanet===item.planet) {
									messageContents.push('` ' + item.mat.padEnd(3, ' ') + ' at ₡' + item.price + ' (' + item.terms + ')`');
								}
								else {
									messageContents.push('**' + item.planet + '**');
									messageContents.push('` ' + item.mat.padEnd(3, ' ') + ' at ₡' + item.price + ' (' + item.terms + ')`');
								}
								lastplanet = item.planet;
							});
							resolve(messageContents);
						}
					});
			});
			promise.then((result) => {
				message.channel.send(result, { split: true });
			}, function(err) {
				console.log(message);
				console.log(err);
			})
				.catch(function(err) {
					message.channel.send('Bot Error!');
					console.log(message);
					console.log(err);
				});
		}
		else {
			message.channel.send('Unable to find any results for the given arguments (check your planet and material names)');
		}
	},
};