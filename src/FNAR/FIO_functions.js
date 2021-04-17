const FIO_R = require('./FNAR_Requests.js');
const users = require('../users.js');
const { FIO_Auth } = require('../config.json');

function updateFIODatabase(connection, userid, storage, sites, site_ts, wars) {
	const ts = Date.now();
	let updateString = 'UPDATE storage SET storage_data = ?, timestamp = ?';
	let insertString = 'INSERT INTO storage (storage_data, timestamp';
	let queryValues = [storage, ts];
	if(sites) {
		updateString += ', site_data = ?, site_timestamp = ?';
		insertString += ', site_data, site_timestamp';
		queryValues.push(sites);
		queryValues.push(site_ts);
	}
	if(wars) {
		updateString += ', war_data = ?';
		insertString += ', war_data';
		queryValues.push(wars);
	}

	updateString += ' WHERE userid = ?';
	insertString += ') VALUES (?, ?';
	queryValues.push(userid);
	for (let i = 0; i < queryValues.length; i++) {
		insertString += ', ?';
	}
	insertString += ')';
	return new Promise((resolve, reject) => {
		connection.query(updateString,
			queryValues,
			function(err, result) {
				if(err) return reject(err);

				if(result.changedRows == 0) {
					connection.query(insertString,
						queryValues,
						function(err, updateResult) {
							if(err) return reject(err);
							else resolve(updateResult);
						});
				}
				else {
					resolve(result);
				}
			});
	});
}

async function updateAll(con, data) {
	// get the FIO data.
	let userList = users.returnFIO();
	console.log('refreshing FIO data');

	return Promise.allSettled(userList.map(function(user) {
		return new Promise((resolve, reject) => {
			let sites = {};
			let wars = {};
			let storage;
			let assembled = {};
			let war_assembled = {};
			FIO_R.requestP(FIO_Auth, ('/storage/' + user))
				.then(function(storageResult) {
					storage = storageResult;
					let now = Date.now();
					// with the storage result, return a new promise to get the sites for a certian player.
					let siteData = null;
					let warData = null;
					if(data) {
						data.forEach(function(item) {
							if(item['userid'] == users.searchFIOUsername(user)['id']) {
								if (item.site_timestamp > (now - 86400000)) {
									siteData = item.site_data;
									warData = item.war_data;
								}
							}
						});
						if(siteData) {
							return new Promise((resolve) => { resolve([siteData, warData]); });
						}
						else {
							return Promise.all([FIO_R.requestP(FIO_Auth, ('/sites/' + user)),
								FIO_R.requestP(FIO_Auth, ('/sites/warehouses/' + user))]);
						}
					}
					else {
						return Promise.all([FIO_R.requestP(FIO_Auth, ('/sites/' + user)),
							FIO_R.requestP(FIO_Auth, ('/sites/warehouses/' + user))]);
					}
				}).then(function(siteAndWarResult) {
					let siteResult = siteAndWarResult[0];
					let warResult = siteAndWarResult[1];

					// now that we have the site results, we can process the data.
					if(siteResult['Sites'] != undefined) {
						siteResult['Sites'].forEach(function(item) {
							sites[item.SiteId] = item.PlanetIdentifier;
						});
						warResult.forEach(function(war) {
							wars[war.StoreId] = war.LocationNaturalId;
						});
					}
					else {
						sites = JSON.parse(siteResult);
						wars = JSON.parse(warResult);
					}

					storage.forEach(function(item) {
						if(sites[item.AddressableId]) {
							let site_storage = {};
							item.StorageItems.forEach(function(storage_item) {
								site_storage[storage_item.MaterialTicker] = storage_item.MaterialAmount;
							});
							// if the data hasn't already been found for a site, add it to the assembled data.
							if(!assembled[sites[item.AddressableId]]) {
								assembled[sites[item.AddressableId]] = site_storage;
								assembled[sites[item.AddressableId]]['timestamp'] = item.Timestamp;
							}
							// if it has been found, then make sure the new data is used.
							else if(Date.parse(assembled[sites[item.AddressableId]]['timestamp']) < Date.parse(item.Timestamp)) {
								assembled[sites[item.AddressableId]] = site_storage;
								assembled[sites[item.AddressableId]]['timestamp'] = item.Timestamp;
							}
						}
						else if(item.Name && item.Name.toLowerCase().includes('ben')) {
							let site_storage = {};
							item.StorageItems.forEach(function(storage_item) {
								site_storage[storage_item.MaterialTicker] = storage_item.MaterialAmount;
							});
							if(!assembled[item.Name]) {
								assembled[item.Name] = site_storage;
								assembled[item.Name]['timestamp'] = item.Timestamp;
							}
							// if it has been found, then make sure the new data is used.
							else if(Date.parse(assembled[item.Name]['timestamp']) < Date.parse(item.Timestamp)) {
								assembled[item.Name] = site_storage;
								assembled[item.Name]['timestamp'] = item.Timestamp;
							}
						}
						// if it's a warehouse, add it to the warehouse list.
						if(item.Type == 'WAREHOUSE_STORE') {
							if(wars[item.StorageId]) {
								let war_storage = {};
								item.StorageItems.forEach(function(storage_item) {
									war_storage[storage_item.MaterialTicker] = storage_item.MaterialAmount;
								});
								// if the data hasn't already been found for a site, add it to the assembled data.
								if(!war_assembled[wars[item.StorageId]]) {
									war_assembled[wars[item.StorageId]] = war_storage;
									war_assembled[wars[item.StorageId]]['timestamp'] = item.Timestamp;
								}
								// if it has been found, then make sure the new data is used.
								else if(Date.parse(war_assembled[wars[item.StorageId]]['timestamp']) < Date.parse(item.Timestamp)) {
									war_assembled[wars[item.StorageId]] = war_storage;
									war_assembled[wars[item.StorageId]]['timestamp'] = item.Timestamp;
								}
							}
						}
					});
					if(war_assembled) {
						Object.entries(war_assembled).forEach(function([war_planet, war_store]) {
							if(assembled[war_planet]) {
								let result = {};
								for (let [key, value] of Object.entries(assembled[war_planet])) {
									if (result[key]) {
										result[key] += value;
									}
									else {
										result[key] = value;
									}
								}
								for (let [key, value] of Object.entries(war_store)) {
									if (result[key]) {
										result[key] += value;
									}
									else {
										result[key] = value;
									}
								}
								assembled[war_planet] = result;
							}
							else {
								assembled[war_planet] = war_store;
							}
						});
					}
					// console.log(user + ' inventory length: ' + JSON.stringify(assembled).length);
					if(JSON.stringify(assembled).length < 50) {
						console.log(assembled);
					}
					// console.log(JSON.stringify(assembled));
					// console.log(war_assembled);
					updateFIODatabase(con, users.searchFIOUsername(user)['id'], JSON.stringify(assembled), JSON.stringify(sites), Date.now(), JSON.stringify(wars));
					/*
					// send the data to the database
					if(oldSiteData) {
						return updateStorage(con, , JSON.stringify(assembled));
					}
					else {
						return updateSiteAndStorage(con, users.searchFIOUsername(user)['id'], JSON.stringify(sites), Date.now(), JSON.stringify(assembled));
					}
					*/
				}).then((result) => {
					resolve(result);
				}).catch(function(err) {
					// catch and log any errors
					console.log(err);

					reject('Error retreiving data from ' + user + '! Cached data returned instead. *(' + err + ')*');
				});
		});
	}));
}

function getDatabase(connection) {
	return new Promise((resolve, reject) => {
		connection.query('SELECT * FROM storage',
			function(err, result) {
				if(err) return reject(err);
				else resolve(result);
			});
	});
}
function filterAge(value) {
	const ts = Date.now();
	return value.timestamp > (ts - 3600000);
}

module.exports = {
	refresh: updateAll,
	getFIOData: function(con, message) {
		return new Promise((resolve, reject) => {
			// get data from the database
			getDatabase(con).then((result) => {
				return new Promise((resolve) => {
					// check if it's old
					if(result.filter(filterAge).length != result.length) {
						// if it's old, get new values
						// console.log('getting new values');
						let standbyMessage;
						if(message) {
							message.channel.send('Getting new FIO data, please standby').then(function(messageResult) {
								standbyMessage = messageResult;
							});
						}
						updateAll(con, result).then(function(updateResults) {
							updateResults.forEach(function(item) {
								// console.log(item);
								if(item.status == 'fulfilled') {
									// console.log('success: ' + item.value);
								}
								else {
									if(message) message.channel.send('❗ ' + item.reason);
									console.log('error: ' + item.reason);
								}
							});
							// once the values are updated, get them back again from the database
							// in the future, this could be made better by returning the values directly instead of re-fetching from the DB
							// console.log('returning values from database');
							getDatabase(con).then(function(result2) {
								// double check the age
								if(result2.filter(filterAge).length == result2.length) {
									if(message) standbyMessage.delete();
									resolve(result2);
								}
								else {
									// if the values are still old, throw an error.
									console.log('Error, not all data is up to date');
									if(message) standbyMessage.edit('There has been an error, not all data is up to date');
									resolve(result2);
								}
							});
						}).catch(function(error) {
							console.log(error);
							if(message)standbyMessage.edit('❗ Error getting new FIO data, returning cached data ❗');
							resolve(result);
						});
					}
					else {
						// if the values are not old, return them
						resolve(result);
					}
				});
			}).then((result) => {
				resolve(result);
			}).catch(function(err) {
				reject(err);
			});
		});
	},
	queryUser: function(username) {
		return new Promise((resolve, reject) => {
			FIO_R.requestP(FIO_Auth, ('/sites/' + username))
				.then(function() {
					return FIO_R.requestP(FIO_Auth, ('/storage/' + username));
				}).then(function() {
					resolve();
				}).catch(function(e) {
					reject(e);
				});
		});
	},
};