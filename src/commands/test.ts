import { Message, Util } from "discord.js";
import { Command, Execute } from "../classes/Command";
import { FIO } from "../classes/FIO";
import Inventories from "../classes/inventories";
import { FIOData } from "../entity/FIOData";
import { User, UserRole } from "../entity/User";
import { InvWithPrice } from "../nonDBEntity/InventoryWithPrice";


export default class Test implements Command {
    name: string = 'test';
    category = 'Utility';
    args: boolean = false;
    needCorp: boolean = false;
    permissions: UserRole = UserRole.LEAD;
    description: string = 'test command';
    usage: string = '';
    execute: Execute = async (message:Message, args, connection, user, corp) => {
		const inv = new Inventories();
		const fio = new FIO(connection);
		let databaseResults: InvWithPrice[] = []
		const FIOResults: User[] = [];

        inv.queryInvWithPrice({}, corp)
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
					message.channel.send(errors.join('\n'));
				}
				// parse a new message with the results
				return new Promise<string[]>((resolve) => {
					const messageContents:string[] = [];
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
							const groupBy = 'planet';

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
								// then user
								thisLine += (' from ' + item.user.name);
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
								// then planet
								thisLine += (' on ' + planet);
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
				const splitMessage = Util.splitMessage(result.join('\n'));

				splitMessage.forEach((m, index) => {
					console.log(m);
				});
			}).catch(function(error) {
				// catch any errors that pop up.
				message.channel.send('Error! ' + error);
				console.log(error);
			});
    }
}