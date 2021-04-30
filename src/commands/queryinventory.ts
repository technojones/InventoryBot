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
	name: string= 'queryinventory';
	description: string = 'Use this Command to query inventory';
	args: boolean = false;
	aliases: string[] = ['queryi', 'queryinv', 'qi'];
	usage: string ='<planet> and/or <mat>. If left blank, will return all of your inventory';
	execute: Execute = async (message: Message, args: string[][], connection: Connection, user: User, corp: Corp | null) => {
        const f = new Functions(connection);
        const fio = new FIO(connection);


		const queryValues:queryValue = await f.idArgs(args[0]);
		let databaseResults: InvWithPrice[];
		const FIOResults: User[] = [];

		if(args[0].length === 0) queryValues.user = [user];

        const inv = new Inventories();
        console.log(queryValues);
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
                console.log(FIOResults);
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