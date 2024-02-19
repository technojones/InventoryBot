import { Message, Util } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import { FIO } from "../classes/FIO";
import Functions from "../classes/functions";
import Demands from "../classes/demands";
import { Corp } from "../entity/Corp";
import { FIOData } from "../entity/FIOData";
import { Inventory } from "../entity/Inventory";
import { User, UserRole } from "../entity/User";
import { InvWithPrice } from "../nonDBEntity/InventoryWithPrice";
import { queryValue } from "../types/queryValue";
import winston = require("winston");
import { PlanetNickname } from "../entity/PlanetNickname";

const logger = winston.loggers.get('logger')

function FIOUserFilter(arr, query) {
	return arr.filter(function(item) {
		return item.userid === query;
	});
}

export default class QueryDemand implements Command {
    permissions: UserRole = UserRole.USER;
    category = 'Inventory';
	name: string= 'querydemand';
	description: string = `Use this Command to query demand.
        You can provide any combination of materials, planets, and usernames, and multiple of each if desired. If nothing is specified, it will return all of your demand listings.
        This command returns demand data that matches the query values. Positive values indicate the quantity needed to reach the desired inventory levels, while negative is a surplus.`;
	args: boolean = false;
    needCorp: boolean = true;
	aliases: string[] = ['queryd', 'qd'];
	usage: string ='<planet> and/or <mat> - can search for multiple values. If left blank, will return all of your demand';
	execute: Execute = async (message: Message, args: string[][], connection: Connection, user: User, corp: Corp | null) => {
        const f = new Functions(connection);
        const fio = new FIO(connection);


		const queryValues:queryValue = await f.idArgs(args[0], corp);
		let demandResults: InvWithPrice[];
		const FIOResults: User[] = [];

		if(args[0].length === 0) queryValues.user = [user];

        if(!queryValues.material && !queryValues.planet && !queryValues.user) {
            return message.channel.send('No queryable values found.');
        }

        const demands = new Demands();
		const nicknames = connection.manager.getRepository(PlanetNickname).find({where: {corp}});
        demands.queryDemand(queryValues, corp)
            .then((result) => {
                demandResults = result;
                console.log('Inventory lines returned: ' + demandResults.length);
                const key = "id"
                const distinctUsers = [...new Map(result.filter(x => x.user.hasFIO).map(x => [x.user[key], x.user])).values()];
                return fio.updateUserData(distinctUsers);
            })
            .then((result) => {
                const errors = [];
                result.forEach(item => {
                    if(item.status === 'fulfilled') {
                        FIOResults[item.value.id] = item.value;
                    }
                    else {
                        logger.warn("Rejected item from FIO update", {messageID: message.id, messageGuild: message.channel.type !== "DM" ? message.guild.id : "DM", user, args, FIOitem: item});
                        errors.push(item.reason);
                    }
                });
                if(errors.length > 0) {
                    message.channel.send(errors.join('\n'));
                }
                // parse a new message with the results
                return new Promise<string[]>(async (resolve) => {
                    const messageContents: string[] = [];
                    if (demandResults.length === 0) {
                        // if no results in the database, return a message indicating as such.
                        messageContents.push('No results found for the given input');
                        resolve(messageContents);
                    }
                    else {
                        // if there are results, sort through them
                        let lastGroup;
                        const length = demandResults.length;
						const resolvedNicknames = await nicknames;
                        demandResults.forEach(async (item, index) => {
                            // for every item, get the price and terms. This also catagorizes the results by user, adding a header at each new user encountered.
                            let planet = item.planet.name;

							// find nicknames for planets that are not named
							if(planet.match(/^\w{2}[-]\d{3}\w/)) {
								const foundNickname = resolvedNicknames.find(i => i.planet.id === planet);
								if(foundNickname) {
									planet = foundNickname.nickname;
									planet += `(${item.planet.id})`;
									item.planet.name = planet;
								}
							}


                            let groupBy;
                            if(queryValues.planet) {
                                groupBy = 'user';
                            }
                            else {
                                groupBy = 'planet';
                            }

                            if(item.user.hasFIO) {
                                let fioData: FIOData;
                                // If user is FIO user, process the data that way
                                if(FIOResults[item.user.id]) {
                                    fioData = FIOResults[item.user.id].fioData;
                                }
                                else {
                                    fioData = item.user.fioData;
                                }

                                let FIOQuantity = null;
                                let FIOStatus = '▫️';
                                let FIOTimestamp;
								try {
                                    FIOQuantity = fioData.storageData[item.planet.id][item.material.ticker];
                                    FIOTimestamp = Date.parse(fioData.storageData[item.planet.id].timestamp + 'Z');
                                }
                                catch(e) {
                                    FIOStatus = '🔸';
                                    item.quantity = -item.quantity;
                                }
								FIOQuantity = FIOQuantity ? FIOQuantity : 0;
                                FIOTimestamp = FIOTimestamp ? FIOTimestamp : item.timestamp;

                                if (lastGroup!==item[groupBy].name) {
                                    // if the user is different, add the header.
                                    messageContents.push('**' + item[groupBy].name + '**');
                                }
                                const quantityNeeded = item.quantity - FIOQuantity;
                                let thisLine = ('`' + String(quantityNeeded > 0 ? quantityNeeded : 0).padStart(5, ' '));
                                thisLine += (' ' + item.material.ticker.padEnd(3, ' '));
                                // if the grouping is not by user, specify the user
                                if(groupBy!=='user') thisLine += (' needed by ' + item.user.name);
                                else {
                                    thisLine += (' needed');
                                }
                                // if the grouping is not by planet, specify the planet.
                                if(groupBy!=='planet') thisLine += (' on ' + planet);
                                thisLine += (` (${FIOQuantity}/${item.quantity})`);
								messageContents.push(String(thisLine).padEnd(40, ' ') + '` *' + Math.floor((((Date.now() - FIOTimestamp) / 1000) / 60) / 60) + 'h ago* ' + FIOStatus);
                            }
                            lastGroup = item[groupBy].name;
                            // if this is the last item in the list, resolve the contents.
                            if (index===(length - 1)) {
                                resolve(messageContents);
                            }

                        });
                    }
                });
            }).then((result) => {
                // send the message containing the results
                const splitMessage = Util.splitMessage(result.join('\n'));

				splitMessage.forEach(m => {
					message.channel.send(m);
				});
            }).catch(function(error) {
                // catch any errors that pop up.
                message.channel.send('Error! ' + error);
                logger.error('Demand promise error', {messageID: message.id, messageGuild: message.channel.type !== "DM" ? message.guild.id : "DM", user, args, error});
            });
	};
};