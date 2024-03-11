import winston = require("winston");
import { Message, Util } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import { Corp } from "../entity/Corp";
import { User, UserRole } from "../entity/User";
import { queryValue } from "../types/queryValue";
import Functions from "../classes/functions";
import { FIO } from "../classes/FIO";
import Inventories from "../classes/inventories";
import { PlanetNickname } from "../entity/PlanetNickname";
import { InvWithPrice } from "../nonDBEntity/InventoryWithPrice";
import Demands from "../classes/demands";
import { Demand } from "../entity/Demand";
import { FIOData } from "../entity/FIOData";

export default class Buy implements Command {
    name: string = 'buy';
    category = 'Inventory';
    args: boolean = false;
    needCorp: boolean = false;
    permissions: UserRole = UserRole.ADMIN;
    description: string = `This command will return a list of buying suggestions based on your current demand and your Corp\'s inventory.
    You can pass in materials, planets, and/or users to filter down the list of results, or leave it blank to return all available opportunities`;
    usage: string = '<planet>, <mat>, and/or <user> - can search for multiple of each value. If left blank, will return matches for all of your demand';
    execute: Execute = async (message:Message, args: string[][], connection: Connection, user: User, corp: Corp | null) => {
        const logger = winston.loggers.get('logger')
        const f = new Functions(connection);
        const fio = new FIO(connection);

        if(corp === null) {
            return message.channel.send('Use of this command requires being registered with a corporation.');
        }

        // Determine what was passed in on the first line
        const invQueryValues: queryValue = await f.idArgs(args[0], corp);
        const demandQueryValues:queryValue = invQueryValues;
        let databaseResults: {demand: Demand[], inventory: InvWithPrice[]} = {demand: [], inventory: []};
		const FIOResults: User[] = [];
        
        const inv = new Inventories();
        const demands = new Demands();
		const nicknames = connection.manager.getRepository(PlanetNickname).find({where: {corp}});

        // We only want to return the inventory values of the user sending us the command
        demandQueryValues.user = [user];

        const results: Promise<[InvWithPrice[], Demand[]]> = Promise.all([inv.queryInvWithPrice(invQueryValues, corp), demands.queryDemand(demandQueryValues, corp)])

       
        results.then(([invResult, demandResult]) => {
            databaseResults.inventory = invResult;
            databaseResults.demand = demandResult;
            logger.http("Sell Command Database results", {messageID: message.id, databaseResults});
            const key = "id"
            const distinctUsers = [...new Map(databaseResults.inventory.filter(x => x.user.hasFIO).map(x => [x.user[key], x.user])).values()];
            // if the user wasn't included in the demand returned, then make sure their FIO values are updated.
            if(!distinctUsers.filter(x => x.id === user.id))
            {
                distinctUsers.push(user);
            }
            logger.http("QI: Distinct FIO users", {messageID: message.id, distinctUsers});
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
                const messageContents:string[] = [];

                if (databaseResults.demand.length === 0) {
                    // if no results in the database, return a message indicating as such.
                    messageContents.push('You don\'t appear to have any current demand');
                    resolve(messageContents);
                }
                else {
                    messageContents.push('Here is a list of items you may be able to buy:');
                    // Process out the demand items, only leaving the items that have a positive inventory
                    let updatedInventory = databaseResults.inventory.map((inventoryItem) => {
                        if(inventoryItem.user.hasFIO) {
                            let fioData: FIOData;
                            // If user is FIO user, process the data that way
                            if(FIOResults[inventoryItem.user.id]) {
                                fioData = FIOResults[inventoryItem.user.id].fioData;
                            }
                            else {
                                fioData = inventoryItem.user.fioData;
                            }

                            let FIOQuantity = 0;
                            let FIOTimestamp;
                            try {
                                FIOQuantity = fioData.storageData[inventoryItem.planet.id][inventoryItem.material.ticker];
                                FIOTimestamp = Date.parse(fioData.storageData[inventoryItem.planet.id].timestamp + 'Z');
                            }
                            catch(e) {
                                // This will throw an error if the FIO data for this planet/material isn't available. In this case, just set the quantity to 0.
                                FIOQuantity = 0;
                            }

                            // Modify the Inventory item quantity to be the "True" quantity, the FIO inventory level minus the buffer value
                            inventoryItem.quantity =  FIOQuantity - inventoryItem.quantity;
                        }

                        if(inventoryItem.quantity > 0) {
                            return inventoryItem;
                        }
                        else {
                            return null;
                        }
                    });

                    // Process out the inventory results, only returning the selling oppurtunities for inventory items that have a positive value
                    databaseResults.demand.forEach((demandItem) => {
                        if(demandItem.user.hasFIO) {
                            let fioData: FIOData;
                            // If user is FIO user, process the data that way
                            if(FIOResults[demandItem.user.id]) {
                                fioData = FIOResults[demandItem.user.id].fioData;
                            }
                            else {
                                fioData = demandItem.user.fioData;
                            }

                            let FIOQuantity = 0;
                            let FIOTimestamp;
                            try {
                                FIOQuantity = fioData.storageData[demandItem.planet.id][demandItem.material.ticker];
                                FIOTimestamp = Date.parse(fioData.storageData[demandItem.planet.id].timestamp + 'Z');
                            }
                            catch(e) {
                                // This will throw an error if the FIO data for this planet/material isn't available. In this case, just set the quantity to 0.
                                FIOQuantity = 0;
                            }

                            // Modify the Inventory item quantity to be the "True" quantity, the FIO value minus the buffer value
                            demandItem.quantity =  demandItem.quantity - FIOQuantity; 
                        }
                        
                        if(demandItem.quantity > 0) {
                            var buyOpportunities = updatedInventory.filter(invItem => {
                                // Filter the demand results to this planet and this material
                                return demandItem.planet.id == invItem.planet.id && demandItem.material.ticker == invItem.material.ticker;
                            });

                            if(buyOpportunities.length > 0) {
                                messageContents.push('**' + demandItem.material.ticker.toLocaleUpperCase() + ' on ' + demandItem.planet.name + '**');

                                buyOpportunities.forEach(opportunity => {
                                    let thisLine: string;
                                    if(demandItem.quantity > opportunity.quantity ) {
                                        thisLine = `Buy all ${opportunity.quantity} from ${opportunity.user.name}`;
                                        if (opportunity.price) {
                                            thisLine += `  for ₡${opportunity.price * opportunity.quantity}`;
                                        }
                                    }
                                    else {
                                        thisLine = `Buy ${demandItem.quantity} from ${opportunity.user.name}`;
                                        if (opportunity.price) {
                                            thisLine += `  for ₡${opportunity.price * demandItem.quantity}`;
                                        }
                                    }
                                    messageContents.push(thisLine);
                                    });
                            }
                        }
                    });

                    if(messageContents.length === 0) {
                        messageContents.push('I couldn\'t find any sale opportunities');
                    }

                    resolve(messageContents);
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
                logger.error('Inventory promise error', {messageID: message.id, messageGuild: message.channel.type !== "DM" ? message.guild.id : "DM", user, args, error});
            });

        return;
    };
}