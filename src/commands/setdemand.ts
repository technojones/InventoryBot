import { Message } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import Functions from "../classes/functions";
import { Corp } from "../entity/Corp";
import { Demand } from "../entity/Demand";
import { User, UserRole } from "../entity/User";
import { queryValue } from "../types/queryValue";

export default class SetDemand implements Command {
	permissions: UserRole = UserRole.USER;
	category = 'Inventory';
	name = 'setdemand';
	description = `Use this Command to set your demand (FIO users only) The arguments can be in any order on each line.
		Items set with this command are your 'ideal' inventory levels. When someone queries the demand, your current inventory will be compared with your demand to see how many of that item you might be in the market for.
		You can set multiple items for a planet with a single command. Simply seperate each item on it's own line (shift + enter creates a linebreak)`;
	args = true;
    needCorp: boolean = false;
	aliases = ['setd', 'sd'];
	usage = '`<planet> <mat> <quantity>\n (optional) <mat> <quantity>`';
	execute: Execute = async function(message: Message, args: string[][], connection: Connection, user: User, corp: Corp | null): Promise<any> {
		const functions = new Functions(connection);

		if (args) {
			// get the current time for a timestamp
			const ts = new Date(Date.now());

			// identify all the first line arguments
			const firstLineArgs: queryValue = await functions.idArgs(args[0]);
			let planet;
			// If planet is a friendly name, return the designation
			if (firstLineArgs.planet) {
				planet = firstLineArgs.planet[0];
			}
			else {
				// if no planet was found, return an error
				return message.channel.send('**ERROR!** could not find a planet in the given arguments.');
			}

			// iterate over each line.
			const messageContents = [];
			const promise = args.map((item, index) => {
				return new Promise(async (resolve: (messageLine: string) => void, reject: (errorMessage: string) => void) => {
					// identify the values that have been passed. Will return objects for Planets and Materials.
					const queryValues:queryValue = await functions.idArgs(item);

					if(!queryValues.number && user.hasFIO) {
						queryValues.number = [0];
					}

					if (!queryValues.material) {
						reject(`**ERROR!** in line ${index + 1}: improperly formatted or missing material (${item})`);
					}
					else if (!queryValues.number) {
						reject(`**ERROR!** in line ${index + 1}: improperly formatted or missing quantity (${item})`);
					}
					else {
                        let found: Demand;
                        try {
						    found = await connection.manager.getRepository(Demand).findOne({where : {material: queryValues.material[0], user, planet}});
                        }
                        catch {
                            reject('There was an issue connecting to the database');
                        }
						if(!found) {
							const newDemand = new Demand();
							newDemand.material = queryValues.material[0];
							newDemand.planet = planet;
							newDemand.quantity = queryValues.number[0];
							newDemand.timestamp = ts;
							newDemand.user = user;
							try {
								const result = await connection.manager.getRepository(Demand).save(newDemand);
								if(result) {
									resolve('`' + `Added demand for ${result.quantity} ${result.material.ticker} on ${result.planet.name}` + '`');
								}
								else {
									reject('There was an issue updating the database');
								}
							}
							catch(e) {
								console.log(e);
								reject('There was an issue updating the database');
							}
						}
						else {
							const oldQuantity = found.quantity;
							found.quantity = queryValues.number[0];
							found.timestamp = ts;
							try {
								const result = await connection.manager.getRepository(Demand).save(found);
								if(result) {
									resolve('`' + `Updated demand for ${result.quantity} ${result.material.ticker} on ${result.planet.name} (prev: ${oldQuantity}` + ')`');
								}
								else {
									reject('There was an issue updating the database');
								}
							}
							catch(e) {
								console.log(e);
								reject('There was an issue updating the database');
							}
						}
					}
				});
			});

			Promise.allSettled(promise).then((result) => {
				const rejected = result.map(r => { return (r.status === 'rejected') ? r.reason : '' });
				const successful = result.map(r =>{ return (r.status === 'fulfilled') ? r.value : ''});
				message.channel.send(rejected.concat(successful).filter(v => v !== ''), { split: true });
			}, function(err) {
				message.channel.send(err);
				console.log(err);
			})
				.catch(function(err) {
					message.channel.send('Bot Error! ' + err);
					console.log(err);
				});
		}
		else {
			return message.channel.send('Argument Error');
		}
	};
};