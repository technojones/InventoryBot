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
	description = `Use this Command to set your inventory - or for FIO users, your buffer. The arguments can be in any order on each line.
		For FIO users, any item with an entry will be advertised to the corp. Any value above 0 will be subtracted from your inventory as a buffer.
		You can set multiple items for a planet with a single command. Simply seperate each item on it's own line (shift + enter creates a linebreak)`;
	args = true;
	needCorp: boolean = false;
	aliases = ['seti', 'setinv', 'si', 'setinventories', 'setbuffer', 'sb', 'setb', 'setbuf'];
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
						const found = await connection.manager.getRepository(Inventory).findOne({where : {material: queryValues.material[0], user, planet}});
						if(!found) {
							const newInv = new Inventory();
							newInv.material = queryValues.material[0];
							newInv.planet = planet;
							newInv.quantity = queryValues.number[0];
							newInv.timestamp = ts;
							newInv.user = user;
							try {
								const result = await connection.manager.getRepository(Inventory).save(newInv);
								if(result) {
									resolve('`' + `Added ${result.quantity} ${result.material.ticker} on ${result.planet.name}` + '`');
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
								const result = await connection.manager.getRepository(Inventory).save(found);
								if(result) {
									resolve('`' + `Updated ${result.quantity} ${result.material.ticker} on ${result.planet.name} (prev: ${oldQuantity}` + ')`');
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