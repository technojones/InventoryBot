import { Message } from 'discord.js';
import * as https from 'https';
import matLookup = require('../commands/materials.json');

// tslint:disable-next-line: no-var-requires
const users = require('../users.js');


function roundOff(num: number, places?: number): number {
	places = places ? places : 2;
	const x = Math.pow(10, places);
	return Math.round(num * x) / x;
};

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

function updateFIODatabase(connection, userid, storage, sites, siteTS, wars) {
	const ts = Date.now();
	let updateString = 'UPDATE storage SET storage_data = ?, timestamp = ?';
	let insertString = 'INSERT INTO storage (storage_data, timestamp';
	const queryValues = [storage, ts];
	if(sites) {
		updateString += ', site_data = ?, site_timestamp = ?';
		insertString += ', site_data, site_timestamp';
		queryValues.push(sites);
		queryValues.push(siteTS);
	}
	if(wars) {
		updateString += ', war_data = ?';
		insertString += ', war_data';
		queryValues.push(wars);
	}

	updateString += ' WHERE userid = ?';
	insertString += ') VALUES (?, ?';
	queryValues.push(userid);
	// tslint:disable-next-line: prefer-for-of
	for (let i = 0; i < queryValues.length; i++) {
		insertString += ', ?';
	}
	insertString += ')';
	return new Promise((resolve, reject) => {
		connection.query(updateString,
			queryValues,
			function(err, result) {
				if(err) return reject(err);

				if(result.changedRows === 0) {
					connection.query(insertString,
						queryValues,
						function(queryErr, updateResult) {
							if(queryErr) return reject(queryErr);
							else resolve(updateResult);
						});
				}
				else {
					resolve(result);
				}
			});
	});
}

export class FIO {
    private token;
    private con;
    constructor(token, con) {
        this.token = token;
        this.con = con;
    }
    request(path) {
        return new Promise((resolve, reject) => {
            const options = {
				hostname: 'rest.fnar.net',
				path,
				method: 'GET',
				headers: {
					'Authorization': this.token,
				},
			};

            const req = https.request(options, (res) => {
                let str = '';
                // console.log(`STATUS: ${res.statusCode}`);
                // console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    str += chunk;
                    // console.log(str);
                });
                res.on('end', () => {

                    if(res.statusCode === 200) {
						let json;
						try {
							json = JSON.parse(str);
						}
						catch (error) {
							console.log(error);
							console.log(options);
							// console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
							console.log(`STATUS: ${res.statusCode}`);
							// console.log(str);
							return reject(error);
						}
						resolve(json);
					}
					else if(res.statusCode === 204) {
						// console.log(options);
						// console.log(`STATUS: ${res.statusCode}`);
						return reject('204: User may not have data or CX ticker not found.');
					}
					else if(res.statusCode === 502) {
						return reject('502: Bad Gateway. Server may be down, try again later');
					}
					else if(res.statusCode === 401) {
						return reject('401: Authentication error. Please double check that storage and site permissions are set');
					}
                });
            });

            req.on('error', (e) => {
                console.log(e);
                reject(`problem with request: ${e.message}`);
            });

            // Write data to request body
            req.end();
        });
    }

    getMarket(ticker) {
        const options = {
            hostname: 'rest.fnar.net',
            path: `/exchange/${ticker}`,
            method: 'GET',
            headers: {

            },
        };
        return this.request(options);
    };

    getCXInfo(message, arg) {
		let cx = null;
		let ticker = null;
		if(arg.includes('.')) {
			cx = arg.split('.')[1];
			ticker = arg.split('.')[0];
		}
		else {
			ticker = arg;
		}
		if(!matLookup.find(element => element.Ticker.toLowerCase() === ticker.toLowerCase())) {
			message.channel.send('No valid material found.');
		}
		else {
			cx = cx ? cx : 'CI1';
			this.getMarket(`${ticker}.${cx}`).then(function(marketResults: any) {
				const messageContents = [];
				const marketDifference = marketResults.Price - marketResults.Previous;
				messageContents.push(`**Market Results for ${marketResults.MaterialTicker}.${marketResults.ExchangeCode}**`);
				messageContents.push('`' + `Price: ${roundOff(marketResults.Price, 2)} (${(marketDifference >= 0) ? '+' : ''}${roundOff(marketDifference, 2)})` + '`');
				messageContents.push('`' + `Price Average: ${roundOff(marketResults.PriceAverage, 2)}` + '`');
				messageContents.push('`' + `Ask: ${roundOff(marketResults.Ask, 2)} (${marketResults.AskCount})${(marketResults.Ask === marketResults.MMSell && marketResults.MMSell) ? ' (MM)' : ''}` + '`');
				messageContents.push('`' + `Bid: ${roundOff(marketResults.Bid, 2)} (${marketResults.BidCount})${(marketResults.Bid === marketResults.MMBuy && marketResults.MMBuy) ? '(MM)' : ''}` + '`');
				message.channel.send(messageContents);
			}).catch(function(error) {
				message.channel.send(error);
			});
		}
	};

    async updateAll(con, data) {
        // get the FIO data.
        const userList = users.returnFIO();
        console.log('refreshing FIO data');

        return Promise.allSettled(userList.map(function(user) {
            return new Promise((resolve, reject) => {
                let sites = {};
                let wars = {};
                let storage;
                const assembled = {};
                const warAssembled = {};
                this.request('/storage/' + user)
                    .then(function(storageResult) {
                        storage = storageResult;
                        const now = Date.now();
                        // with the storage result, return a new promise to get the sites for a certian player.
                        let siteData = null;
                        let warData = null;
                        if(data) {
                            data.forEach(function(item) {
                                if(item.userid === users.searchFIOUsername(user).id) {
                                    if (item.site_timestamp > (now - 86400000)) {
                                        siteData = item.site_data;
                                        warData = item.war_data;
                                    }
                                }
                            });
                            if(siteData) {
                                return new Promise((resolveSiteData) => { resolveSiteData([siteData, warData]); });
                            }
                            else {
                                return Promise.all([this.request('/sites/' + user),
                                    this.request('/sites/warehouses/' + user)]);
                            }
                        }
                        else {
                            return Promise.all([this.request('/sites/' + user),
                                this.request('/sites/warehouses/' + user)]);
                        }
                    }).then(function(siteAndWarResult) {
                        const siteResult = siteAndWarResult[0];
                        const warResult = siteAndWarResult[1];

                        // now that we have the site results, we can process the data.
                        if(siteResult.Sites !== undefined) {
                            siteResult.Sites.forEach(function(item) {
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
                                const siteStorage = {};
                                item.StorageItems.forEach(function(storageItem) {
                                    siteStorage[storageItem.MaterialTicker] = storageItem.MaterialAmount;
                                });
                                // if the data hasn't already been found for a site, add it to the assembled data.
                                if(!assembled[sites[item.AddressableId]]) {
                                    assembled[sites[item.AddressableId]] = siteStorage;
                                    assembled[sites[item.AddressableId]].timestamp = item.Timestamp;
                                }
                                // if it has been found, then make sure the new data is used.
                                else if(Date.parse(assembled[sites[item.AddressableId]].timestamp) < Date.parse(item.Timestamp)) {
                                    assembled[sites[item.AddressableId]] = siteStorage;
                                    assembled[sites[item.AddressableId]].timestamp = item.Timestamp;
                                }
                            }
                            else if(item.Name && item.Name.toLowerCase().includes('ben')) {
                                const siteStorage = {};
                                item.StorageItems.forEach(function(storageItem) {
                                    siteStorage[storageItem.MaterialTicker] = storageItem.MaterialAmount;
                                });
                                if(!assembled[item.Name]) {
                                    assembled[item.Name] = siteStorage;
                                    assembled[item.Name].timestamp = item.Timestamp;
                                }
                                // if it has been found, then make sure the new data is used.
                                else if(Date.parse(assembled[item.Name].timestamp) < Date.parse(item.Timestamp)) {
                                    assembled[item.Name] = siteStorage;
                                    assembled[item.Name].timestamp = item.Timestamp;
                                }
                            }
                            // if it's a warehouse, add it to the warehouse list.
                            if(item.Type === 'WAREHOUSE_STORE') {
                                if(wars[item.StorageId]) {
                                    const warStorage = {};
                                    item.StorageItems.forEach(function(storageItem) {
                                        warStorage[storageItem.MaterialTicker] = storageItem.MaterialAmount;
                                    });
                                    // if the data hasn't already been found for a site, add it to the assembled data.
                                    if(!warAssembled[wars[item.StorageId]]) {
                                        warAssembled[wars[item.StorageId]] = warStorage;
                                        warAssembled[wars[item.StorageId]].timestamp = item.Timestamp;
                                    }
                                    // if it has been found, then make sure the new data is used.
                                    else if(Date.parse(warAssembled[wars[item.StorageId]].timestamp) < Date.parse(item.Timestamp)) {
                                        warAssembled[wars[item.StorageId]] = warStorage;
                                        warAssembled[wars[item.StorageId]].timestamp = item.Timestamp;
                                    }
                                }
                            }
                        });
                        if(warAssembled) {
                            Object.entries(warAssembled).forEach(function([warPlanet, warStore]) {
                                if(assembled[warPlanet]) {
                                    const result = {};
                                    for (const [key, value] of Object.entries(assembled[warPlanet])) {
                                        if (result[key]) {
                                            result[key] += value;
                                        }
                                        else {
                                            result[key] = value;
                                        }
                                    }
                                    for (const [key, value] of Object.entries(warStore)) {
                                        if (result[key]) {
                                            result[key] += value;
                                        }
                                        else {
                                            result[key] = value;
                                        }
                                    }
                                    assembled[warPlanet] = result;
                                }
                                else {
                                    assembled[warPlanet] = warStore;
                                }
                            });
                        }
                        // console.log(user + ' inventory length: ' + JSON.stringify(assembled).length);
                        if(JSON.stringify(assembled).length < 50) {
                            console.log(assembled);
                        }
                        // console.log(JSON.stringify(assembled));
                        // console.log(war_assembled);
                        updateFIODatabase(con, users.searchFIOUsername(user).id, JSON.stringify(assembled), JSON.stringify(sites), Date.now(), JSON.stringify(wars));
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

    // refresh: updateAll,
	getFIOData(message: Message) {
		return new Promise((resolve, reject) => {
			// get data from the database
			getDatabase(this.con).then((result: any) => {
				return new Promise((resolveDB) => {
					// check if it's old
					if(result.filter(filterAge).length !== result.length) {
						// if it's old, get new values
						// console.log('getting new values');
						let standbyMessage;
						if(message) {
							message.channel.send('Getting new FIO data, please standby').then(function(messageResult) {
								standbyMessage = messageResult;
							});
						}
						this.updateAll(this.con, result).then(function(updateResults: any) {
							updateResults.forEach(function(item) {
								// console.log(item);
								if(item.status === 'fulfilled') {
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
							getDatabase(this.con).then(function(result2: any) {
								// double check the age
								if(result2.filter(filterAge).length === result2.length) {
									if(message) standbyMessage.delete();
									resolveDB(result2);
								}
								else {
									// if the values are still old, throw an error.
									console.log('Error, not all data is up to date');
									if(message) standbyMessage.edit('There has been an error, not all data is up to date');
									resolveDB(result2);
								}
							});
						}).catch(function(error) {
							console.log(error);
							if(message)standbyMessage.edit('❗ Error getting new FIO data, returning cached data ❗');
							resolveDB(result);
						});
					}
					else {
						// if the values are not old, return them
						resolveDB(result);
					}
				});
			}).then((result) => {
				resolve(result);
			}).catch(function(err) {
				reject(err);
			});
		});
	};

    queryUser(username) {
		return new Promise<void>((resolve, reject) => {
			this.request('/sites/' + username)
				.then(function() {
					return this.request('/storage/' + username);
				}).then(function() {
					resolve();
				}).catch(function(e) {
					reject(e);
				});
		});
	};
}