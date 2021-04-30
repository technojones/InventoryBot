import { Message } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import Functions from "../classes/functions";
import { Corp } from "../entity/Corp";
import { Inventory } from "../entity/Inventory";
import { Price } from "../entity/Price";
import { User, UserRole } from "../entity/User";
import { queryValue } from "../types/queryValue";


export default class SetInventory implements Command {
	permissions: UserRole = UserRole.USER;
	name = 'setprices';
	description = `Use this command to set prices for a material. To set a global price, use 'global'. The arguments can be in any order on each line.
		You can set multiple prices for a planet with a single command. Simply seperate each item on it's own line (ctrl + enter creates a linebreak)`;
	args = true;
	aliases = ['setp', 'sp', 'setprice'];
	usage = '<planet> <mat> <quantity>\n (optional) <mat> <quantity>';
	execute: Execute = async function(message: Message, args: string[][], connection: Connection, user: User, corp: Corp | null): Promise<any> {
		const functions = new Functions(connection);

		if (args) {
			// get the current time for a timestamp
			const ts = new Date(Date.now());

			const firstLine = args[0];

			// identify all the first line arguments
			const firstLineArgs: queryValue = {};
			await functions.asyncForEach(firstLine, async (item) => {
				const identified = await functions.id(item);
				if(identified && identified.type !== null) {
					firstLineArgs[identified.type] = identified.value;
				}
			});
			console.log(firstLineArgs);
			let planet;
			// If planet is a friendly name, return the designation
			if (firstLineArgs.planet) {
				planet = firstLineArgs.planet;
			}
			else {
				// if no planet was found, return an error
				return message.channel.send('**ERROR!** could not find a planet in the given arguments.');
			}

			// iterate over each line.
			const messageContents = [];
			const promise = args.map((item, index) => {
				return new Promise(async (resolve: (messageLine: string) => void, reject: (errorMessage: string) => void) => {
					const queryValues: queryValue = await functions.idArgs(args[0]);;
					// identify the values that have been passed. Will return objects for Planets and Materials.

					if (!queryValues.material) {
						reject(`**ERROR!** in line ${index + 1}: improperly formatted or missing material (${item})`);
					}
					else if (!queryValues.number) {
						reject(`**ERROR!** in line ${index + 1}: improperly formatted or missing price (${item})`);
					}
					else {
						let found = await connection.manager.getRepository(Price).findOne({where : {material: queryValues.material, user, planet }});
						if(!found) {
							found = new Price();
							found.material = queryValues.material[0];
							found.planet = planet;
							found.price = queryValues.number[0];
							found.timestamp = ts;
							found.user = user;
							const result = await connection.manager.getRepository(Price).save(found);
							if(result) {
								resolve('`' + `Added ${result.material.ticker} for ₡${result.price} on ${result.planet.name}` + '`');
							}
							else {
								reject('There was an issue updating the database');
							}
						}
						else {
							const oldPrice = found.price;
							found.price = queryValues.number[0];
							found.timestamp = ts;
							const result = await connection.manager.getRepository(Price).save(found);
							if(result) {
								resolve('`' + `Updated ${result.material.ticker} for ₡${result.price} on ${result.planet.name} (prev: ₡${oldPrice}` + ')`');
							}
							else {
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