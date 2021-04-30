import { Message } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import Functions from "../classes/functions";
import { Corp } from "../entity/Corp";
import { Inventory } from "../entity/Inventory";
import { User, UserRole } from "../entity/User";
import { queryValue } from "../types/queryValue";


export default class SetInventory implements Command {
	permissions: UserRole = UserRole.USER;
	name = 'setinventory';
	description = 'Use this Command to set your inventory - or for FIO users, your buffer. For FIO users, any item with an entry will be advertised to the corp. Any value above 0 will be subtracted from your inventory as a buffer.';
	args = true;
	aliases = ['seti', 'setinv', 'si', 'setinventories', 'setbuffer', 'sb', 'setb', 'setbuf'];
	usage = '<planet> <mat> <quantity>\n (optional) <mat> <quantity>';
	execute: Execute = async function(message: Message, args: string[][], connection: Connection, user: User, corp: Corp | null): Promise<any> {
		const functions = new Functions(connection);

		if (args) {
			// get the current time for a timestamp
			const ts = new Date(Date.now());

			const firstLine = args[0];

			// identify all the first line arguments
			const firstLineArgs: queryValue = await functions.idArgs(args[0]);;
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
					const queryValues: queryValue = {};
					// identify the values that have been passed. Will return objects for Planets and Materials.
					await functions.asyncForEach(item, async (value) => {
						const identified = await functions.id(value);
						if(identified.type) {
							queryValues[identified.type] = identified.value;
						}
					});

					if (!queryValues.material) {
						reject(`**ERROR!** in line ${index + 1}: improperly formatted or missing material (${item})`);
					}
					else if (!queryValues.number) {
						reject(`**ERROR!** in line ${index + 1}: improperly formatted or missing quantity (${item})`);
					}
					else {
						let found = await connection.manager.getRepository(Inventory).findOne({where : {material: queryValues.material, user, planet }});
						if(!found) {
							found = new Inventory();
							found.material = queryValues.material[0];
							found.planet = planet;
							found.quantity = queryValues.number[0];
							found.timestamp = ts;
							found.user = user;
							const result = await connection.manager.getRepository(Inventory).save(found);
							if(result) {
								resolve('`' + `Added ${result.quantity} ${result.material.ticker} on ${result.planet.name}` + '`');
							}
							else {
								reject('There was an issue updating the database');
							}
						}
						else {
							const oldQuantity = found.quantity;
							found.quantity = queryValues.number[0];
							found.timestamp = ts;
							const result = await connection.manager.getRepository(Inventory).save(found);
							if(result) {
								resolve('`' + `Updated ${result.quantity} ${result.material.ticker} on ${result.planet.name} (prev: ${oldQuantity}` + ')`');
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