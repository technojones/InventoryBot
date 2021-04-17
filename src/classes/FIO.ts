import { Message } from 'discord.js';
import * as https from 'https';
import { Connection } from 'typeorm';
import matLookup = require('../commands/materials.json');
import { FIOData } from '../entity/FIOData';
import { User } from '../entity/User';

import { sitesPayload } from '../types/sites';
import { warehousePayload } from '../types/warehouses';
import { storagePayload } from '../types/storage';
import { Corp } from '../entity/Corp';

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
    private con;
    constructor(con: Connection) {
        this.con = con;
    }
    private get(path: string, token?: string) {
            const tokenHeader = token ? { 'Authorization': token } : {};

            const options = {
				hostname: 'rest.fnar.net',
				path,
				method: 'GET',
				headers: tokenHeader
			};

            return this.requestOptions(options);

    }
    private requestOptions(options: object) {
        return new Promise((resolve: (value: any) => void, reject: (error: string) => void,) => {

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
                    console.log(res.statusCode);
                    console.log(str);
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
    post(options: object, data) {
        return new Promise((resolve, reject) => {

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
                    console.log(res.statusCode);
                    console.log(str);
                    if(res.statusCode === 200) {
						resolve(str);
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
            req.write(JSON.stringify(data));
            // Write data to request body
            req.end();
        });
    }
    public getMarket(ticker) {
        return this.get(`/exchange/${ticker}`);
    };

    public getAPIKey = function(username:string, password:string): Promise<string> {
        const options = {
            hostname: 'rest.fnar.net',
            path: '/auth/createapikey',
            method: 'POST',
        };
        const data = {
            "UserName": username,
            "Password": password,
            "Application": "Inventory Discord Bot"
        };
        console.log(options);
        return this.post(options, data);
    };

    public getCXInfo(message, arg) {
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

    private assembleStorageData(storage, siteData, warData) {
        const assembled = {};
        const warAssembled = {};
        storage.forEach(storageItem => {
            if(siteData[storageItem.AddressableId]) {
                const siteStorage = {};
                storageItem.StorageItems.forEach(storageMaterial =>{
                    siteStorage[storageMaterial.MaterialTicker] = storageMaterial.MaterialAmount;
                });
                // if the data hasn't already been found for a site, add it to the assembled data.
                if(!assembled[siteData[storageItem.AddressableId]]) {
                    assembled[siteData[storageItem.AddressableId]] = siteStorage;
                    assembled[siteData[storageItem.AddressableId]].timestamp = storageItem.Timestamp;
                }
                // if it has been found, then make sure the new data is used.
                else if(Date.parse(assembled[siteData[storageItem.AddressableId]].timestamp) < Date.parse(storageItem.Timestamp)) {
                    assembled[siteData[storageItem.AddressableId]] = siteStorage;
                    assembled[siteData[storageItem.AddressableId]].timestamp = storageItem.Timestamp;
                }
            }
            // if it's a warehouse, add it to the warehouse list.
            if(storageItem.Type === 'WAREHOUSE_STORE') {
                if(warData[storageItem.StorageId]) {
                    const warStorage = {};
                    storageItem.StorageItems.forEach(storageMaterial => {
                        warStorage[storageMaterial.MaterialTicker] = storageMaterial.MaterialAmount;
                    });
                    // if the data hasn't already been found for a site, add it to the assembled data.
                    if(!warAssembled[warData[storageItem.StorageId]]) {
                        warAssembled[warData[storageItem.StorageId]] = warStorage;
                        warAssembled[warData[storageItem.StorageId]].timestamp = storageItem.Timestamp;
                    }
                    // if it has been found, then make sure the new data is used.
                    else if(Date.parse(warAssembled[warData[storageItem.StorageId]].timestamp) < Date.parse(storageItem.Timestamp)) {
                        warAssembled[warData[storageItem.StorageId]] = warStorage;
                        warAssembled[warData[storageItem.StorageId]].timestamp = storageItem.Timestamp;
                    }
                }
            }
        });

        if(warAssembled) {
            Object.entries(warAssembled).forEach(([warPlanet, warStore]) => {
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
        return assembled;
    }

    /**
     * Feed this function an array of FIO data that needs updating. It will return a Promise.allSettled object that either resolve with that data or reject with old data.
     * @param fioArray: FIOData[]
     * @returns Promise[]
     */

    public async updateFIOData(fioArray: FIOData[]) {
        return Promise.allSettled(fioArray.map(item => {
            return new Promise(async (resolve: (item: FIOData) => void, reject: (error: string, item: FIOData) => void) => {
                const user = item.user;
                const token = user.FIOAPIKey;

                let assembled = {};

                let storage: storagePayload;
                let siteResult: sitesPayload;
                let warResult: warehousePayload;

                // get storage data
                this.get('/storage/' + user.name, token).then(storageResult => {
                    storage = storageResult;
                }).catch(reason => {
                    console.log(reason);
                    reject('Error retriving storage data', item);
                });

                // if the site data is out of date, get new site data as well
                if((Date.now() - item.siteTS.valueOf()) > (1000 * 60 * 60 * 24)) {
                    const siteAndWarRequests = Promise.all([this.get('/sites/' + user.name, token),
                        this.get('/sites/warehouses/' + user.name, token)]);

                    siteAndWarRequests.then(siteAndWarResult => {
                        siteResult = siteAndWarResult[0];
                        warResult = siteAndWarResult[1];

                        // now that we have the site results, we can process the data.
                        siteResult.Sites.forEach(siteItem => {
                            item.siteData[siteItem.SiteId] = siteItem.PlanetIdentifier;
                        });
                        warResult.forEach(function(warItem) {
                            item.warData[warItem.StoreId] = warItem.LocationNaturalId;
                        });
                        item.siteTS = new Date(Date.now());
                    }).catch(e => {
                        console.log(e);
                        reject('Error retriving new site data', item);
                    });
                }

                assembled = this.assembleStorageData(storage, item.siteData, item.warData);

                item.storageData = assembled;
                item.storageTS = new Date(Date.now());

                try {
                    await this.con.manager.getRepository(FIOData).save(item);
                }
                catch(e) {
                    reject(e, item);
                }
                resolve(item);

            });
        }));
    }

    /**
     * Feed this function a corp to do a full refresh of all FIO data
     * @param fioArray: FIOData[]
     * @returns Promise[]
     */

    public async refreshFIOData(corp: Corp) {
        const fioArray = this.con.manager.getRepository(FIOData).find({ where: { user: { corp } }, relations: ["user", "corp"]});
        return Promise.allSettled(fioArray.map(item => {
            return new Promise(async (resolve: (item: FIOData) => void, reject: (error: string, item: FIOData) => void) => {
                const user = item.user;
                const token = user.FIOAPIKey;

                let assembled = {};

                let storage: storagePayload;
                let siteResult: sitesPayload;
                let warResult: warehousePayload;

                // if the site data is out of date, get new site data as well
                const siteAndWarRequests = Promise.all([this.get('/sites/' + user.name, token),
                    this.get('/sites/warehouses/' + user.name, token),
                    this.get('/storage/' + user.name, token)]);

                siteAndWarRequests.then(siteAndWarResult => {
                    siteResult = siteAndWarResult[0];
                    warResult = siteAndWarResult[1];
                    storage = siteAndWarResult[2];

                    // now that we have the site results, we can process the data.
                    siteResult.Sites.forEach(siteItem => {
                        item.siteData[siteItem.SiteId] = siteItem.PlanetIdentifier;
                    });
                    warResult.forEach(function(warItem) {
                        item.warData[warItem.StoreId] = warItem.LocationNaturalId;
                    });
                    item.siteTS = new Date(Date.now());
                }).catch(e => {
                    console.log(e);
                    reject('Error retriving new FIO data', item);
                });

                assembled = this.assembleStorageData(storage, item.siteData, item.warData);

                item.storageData = assembled;
                item.storageTS = new Date(Date.now());

                try {
                    await this.con.manager.getRepository(FIOData).save(item);
                }
                catch(e) {
                    reject(e, item);
                }
                resolve(item);

            });
        }));
    }

    public fetchUserData(user: User) {
            return new Promise(async (resolve: (item: FIOData) => void, reject: (e: string, item: FIOData) => void) => {
                const token = user.FIOAPIKey;
                const item = new FIOData();
                item.user = user;
                let assembled = {};

                let storage: storagePayload;
                let siteResult: sitesPayload;
                let warResult: warehousePayload;

                // if the site data is out of date, get new site data as well
                const siteAndWarRequests = Promise.all([this.get('/sites/' + user.name, token),
                    this.get('/sites/warehouses/' + user.name, token),
                    this.get('/storage/' + user.name, token)]);

                siteAndWarRequests.then(siteAndWarResult => {
                    siteResult = siteAndWarResult[0];
                    warResult = siteAndWarResult[1];
                    storage = siteAndWarResult[2];

                    // now that we have the site results, we can process the data.
                    siteResult.Sites.forEach(siteItem => {
                        item.siteData[siteItem.SiteId] = siteItem.PlanetIdentifier;
                    });
                    warResult.forEach(function(warItem) {
                        item.warData[warItem.StoreId] = warItem.LocationNaturalId;
                    });
                    item.siteTS = new Date(Date.now());
                }).catch(e => {
                    console.log(e);
                    reject('Error retriving new FIO data', item);
                });

                assembled = this.assembleStorageData(storage, item.siteData, item.warData);

                item.storageData = assembled;
                item.storageTS = new Date(Date.now());

                try {
                    await this.con.manager.getRepository(FIOData).save(item);
                }
                catch(e) {
                    reject(e, item);
                }
                resolve(item);
            });
    }

    public queryUser(username, token) {
		return new Promise<void>((resolve, reject) => {
			this.get('/sites/' + username, token)
				.then(() => {
					return this.get('/storage/' + username, token);
				}).then(() => {
					resolve();
				}).catch((e) => {
					reject(e);
				});
		});
	};
}