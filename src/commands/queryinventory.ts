import { Message } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import { FIO } from "../classes/FIO";
import Functions from "../classes/functions";
import Inventories from "../classes/inventories";
import { Corp } from "../entity/Corp";
import { FIOData } from "../entity/FIOData";
import { Inventory } from "../entity/Inventory";
import { User, UserRole } from "../entity/User";
import { InvWithPrice } from "../nonDBEntity/InventoryWithPrice";
import { queryValue } from "../types/queryValue";

function FIOUserFilter(arr, query) {
	return arr.filter(function(item) {
		return item.userid === query;
	});
}

export default class QueryInventory implements Command {
    permissions: UserRole = UserRole.USER;
    category = 'Inventory';
	name: string= 'queryinventory';
	description: string = `Use this Command to query inventory.
        You can provide any combination of materials, planets, and usernames, and multiple of each if desired. If nothing is specified, it will return all of your inventory listings.
        For the users that use FIO, it will return their information from FIO. FIO data is indicated with a '▫️'.
        If there is an issue with the FIO data, there will be a '🔸' instead. This generally means that the user has indicated they have inventory but FIO has no data. You can generally treat this information as manually entered, and the timestamps reflect when the data was entered.
        Each entry will have a timestamp. For FIO data, that timestamp is when that data was sent to the FIO server. For manually entered data, it's when that data was added to the bot.
        If possible, it will also return the price associated with that user/planet/material, or a global price if it is available`;
	args: boolean = false;
    needCorp: boolean = true;
	aliases: string[] = ['queryi', 'queryinv', 'qi'];
	usage: string ='<planet> and/or <mat> - can search for multiple values. If left blank, will return all of your inventory';
	execute: Execute = async (message: Message, args: string[][], connection: Connection, user: User, corp: Corp | null) => {
        const f = new Functions(connection);
        const fio = new FIO(connection);

        if(corp === null) {
            return message.channel.send('Use of this command requires being registered with a corporation.');
        }


		const queryValues:queryValue = await f.idArgs(args[0]);
		let databaseResults: InvWithPrice[];
		const FIOResults: User[] = [];

		if(args[0].length === 0) queryValues.user = [user];

        if(!queryValues.material && !queryValues.planet && !queryValues.user) {
            return message.channel.send('No queryable values found.');
        }

        const inv = new Inventories();
        inv.queryInvWithPrice(queryValues, corp)
            .then((result) => {
                databaseResults = result;
                console.log('Inventory lines returned: ' + databaseResults.length);
                const distinctUsers = [...new Set(result.map(x => x.user))];
                return fio.updateUserData(distinctUsers);
            })
            .then((result) => {
                const errors = [];
                result.forEach(item => {
                    if(item.status === 'fulfilled') {
                        FIOResults[item.value.id] = item.value;
                    }
                    else {
                        errors.push(item.reason);
                    }
                });
                if(errors.length > 0) {
                    message.channel.send(errors);
                }
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
                        databaseResults.forEach(async (item, index) => {
                            // for every item, get the price and terms. This also catagorizes the results by user, adding a header at each new user encountered.
                            const planet = item.planet.name;
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
                                // console.log(JSON.parse(userItems[0]['storage_data'])[functions.uppercasePlanetID(item.planet)]);
                                let FIOQuantity = null;
                                let FIOStatus = '▫️';
                                let FIOTimestamp;
                                try {
                                    FIOQuantity = fioData.storageData[item.planet.id][item.material.ticker];
                                    FIOTimestamp = Date.parse(fioData.storageData[item.planet.id].timestamp + 'Z');
                                }
                                catch(e) {
                                    console.log(e);
                                    FIOStatus = '🔸';
                                    item.quantity = -item.quantity;
                                }
                                FIOQuantity = FIOQuantity ? FIOQuantity : 0;
                                FIOTimestamp = FIOTimestamp ? FIOTimestamp : item.timestamp;

                                if (lastGroup!==item[groupBy].name) {
                                    // if the user is different, add the header.
                                    messageContents.push('**' + item[groupBy].name + '**');
                                }
                                // Form the line starting with quantity
                                let thisLine = ('` ' + (FIOQuantity - item.quantity));
                                // then material name
                                thisLine += (' ' + item.material.ticker);
                                // if the grouping is not by planet, specify the planet.
                                if(groupBy!=='planet') thisLine += (' on ' + planet);
                                // if the grouping is not by user, specify the user
                                if(groupBy!=='user') thisLine += (' from ' + item.user.name);
                                // add the price if it exists
                                thisLine += (String((item.price!==undefined) ? ' at ₡' + item.price : ''));
                                messageContents.push(String(thisLine).padEnd(35, ' ') + '` *' + Math.floor((((Date.now() - FIOTimestamp) / 1000) / 60) / 60) + 'h ago* ' + FIOStatus);
                            }
                            else {
                                if (lastGroup!==item[groupBy].name) {
                                    // if the user is different, add the header.
                                    messageContents.push('**' + item[groupBy].name + '**');
                                }
                                let thisLine = ('` ' + item.quantity);
                                // then material name
                                thisLine += (' ' + item.material.ticker);
                                // if the grouping is not by planet, specify the planet.
                                if(groupBy!=='planet') thisLine += (' on ' + planet);
                                // if the grouping is not by user, specify the user
                                if(groupBy!=='user') thisLine += (' from ' + item.user.name);
                                // add the price if it exists
                                thisLine += (String((item.price!==undefined) ? ' at ₡' + item.price : ''));
                                messageContents.push(String(thisLine).padEnd(35, ' ') + '` *' + Math.floor((((Date.now() - item.timestamp.valueOf()) / 1000) / 60) / 60) + 'h ago* ');
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
                message.channel.send(result, { split: true });
            }).catch(function(error) {
                // catch any errors that pop up.
                message.channel.send('Error! ' + error);
                console.log(error);
            });
	};
};