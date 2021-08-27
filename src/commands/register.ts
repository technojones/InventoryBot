import { Message } from "discord.js";
import { Connection } from "typeorm";
import { FIO } from "../classes/FIO";
import { Corp } from "../entity/Corp";
import { User, UserRole } from "../entity/User";
import { Command, Execute } from "../classes/Command";

export default class Register implements Command {
	public name: string = 'register';
	category = 'Users';
	description: string = 'After a user has been added by a corp lead, they can use this command to complete registration';
	args: boolean = false;
	needCorp: boolean = false;
	usage: string = 'No arguments required';
	permissions: UserRole = UserRole.USER;
	execute: Execute = async function(message: Message, args: string[][], con: Connection, user:User, corp?:Corp) {

		const fio = new FIO(con);
		// Check to make sure a user was mentioned
		const messageUser = message.author;
		if (messageUser) {
			// check to make sure the user has been entered.
			const newUser =  await con.manager.getRepository(User).findOne({where: {id: messageUser.id}});
			if(newUser) {
				if(newUser.name && newUser.corp) {
					return message.channel.send('You seem to already be setup with me. To update your information, use the updateuser command.');
				}
			}

			const filter = m => m.author.id === newUser.id;
			const stepOne = function() {
				const messageContents = [];
				messageContents.push('Hello! Thank you for registering with me.');
				messageContents.push('First, please reply with your Prosperous Universe username');
				return new Promise<void>((resolve, reject) => {
					messageUser.send(messageContents.join('\n')).then(dmMessage => {
						dmMessage.channel.awaitMessages({filter, max: 1, time: 300000, errors: ['time'] })
							.then(async collected => {
								newUser.name = collected.first().content;
								await dmMessage.channel.send(`Great! I've recorded your username as ${collected.first().content} (you can change this later)`);
								resolve();
							})
							.catch(() => {
								dmMessage.channel.send('Timeout reached.');
								reject();
							});
					});
				});
			}
			const stepTwo = function() {
				const messageContents = [];
				messageContents.push('Next, please reply with your company code.');
				return new Promise<void>((resolve, reject) => {
					messageUser.send(messageContents.join('\n')).then(dmMessage => {
						dmMessage.channel.awaitMessages({filter, max: 1, time: 300000, errors: ['time'] })
							.then(async collected => {
								newUser.companyCode = collected.first().content;
								await dmMessage.channel.send(`Great! I've recorded your company code as ${collected.first().content} (you can change this later)`);
								resolve();
							})
							.catch(() => {
								dmMessage.channel.send('Timeout reached.');
								reject();
							});
					});
				});
			}

			const askFIO = async function() {
				return new Promise<void>((resolve, reject) => {
					messageUser.send('Are you a FIO user? Respond with (Y/N).').then(dmMessage => {
						dmMessage.channel.awaitMessages({filter, max: 1, time: 300000, errors: ['time'] })
							.then(async collected => {
								if(collected.first().content.toLowerCase() === 'y') {
									newUser.hasFIO = true;
									await dmMessage.channel.send(`Great! I've recorded that you have FIO (you can change this later)`);
									resolve();
								}
								else if(collected.first().content.toLowerCase() === 'n') {
									newUser.hasFIO = false;
									await dmMessage.channel.send(`Great! I've recorded that you do not have FIO (you can change this later)`);
									resolve();
								}
								else {
									await dmMessage.channel.send('I didn\'t understand that');
									return askFIO();
								}
							})
							.catch(() => {
								dmMessage.channel.send('Timeout reached.');
								reject();
							});
					});
				});
			};

			const getFIOKey = function() {
				return new Promise<void>((resolve, reject) => {
					const messageContents = []
					messageContents.push('In order to get your FIO data, I need to connect to FIO on your behalf. I either need an API key, or your password.');
					messageContents.push('If you would like to create your own API key for me to use, please see https://doc.fnar.net/#/auth/post_auth_createapikey');
					messageContents.push('If you would like me to make an API key for you, please provide your password. Note, your password is never stored.');

					messageUser.send(messageContents.join('\n')).then(dmMessage => {
						dmMessage.channel.awaitMessages({filter, max: 1, time: 300000, errors: ['time'] })
							.then(async collected => {
								const regex = collected.first().content.match(/[a-f\d]{32}|[-a-f\d]{36}/gm);
								if(regex) {
									newUser.FIOAPIKey = regex[0];
									await dmMessage.channel.send('Thank you for providing your FIO API key. Proceeding to FIO testing. Please standby while I connect with FIO.');
									resolve();
								}
								else {
									fio.getAPIKey(newUser.name, collected.first().content).then(async apiKey => {
										newUser.FIOAPIKey = apiKey;
										await dmMessage.channel.send('Thank you for providing your password, I was able to generate an API Key. Proceeding to FIO testing. Please standby while I connect with FIO.');
										console.log(apiKey);
										resolve();
									}).catch(async (err) => {
										console.log(err);
										await dmMessage.channel.send('There was an issue getting an API key! Please retry or cancel registration.');
										reject();
									});
								}
							})
							.catch(() => {
								dmMessage.channel.send('Timeout reached.');
								reject();
							});
					});
				});
			}
			const checkFIO = function() {
				return new Promise<boolean>(async (resolve, reject) => {
					fio.queryUser(newUser.name, newUser.FIOAPIKey).then(async () => {
						await messageUser.send(`I was able to verify your FIO connection. Your registration is complete!
Please note! As a FIO user, your inventory is automatically updated. The !setinventory command now works differently! It now is used to specify what you are offering for corp sale.
To add all of your FIO stock of an item for Corp sale, simple use !setinventory with the planet and material and leave the quantity blank or set it to 0.
To reserve some of your stock, use the amount you want to reserve as the quantity. Any amount above that in your FIO data will be made available.

To get started, use the !help command to find out about the commmands available to you. A good place to start is the !setinventory, !deleteinventory, and !queryinventory commands.
You'll find that all of the query commands behave similarly, all of the set commands behave similarly, and all of the delete commands behave similarly.
You can DM me any commands you would like to run, or you can look for a bot channel provided by your corporation.
You can run a limited set of commands on other corporations that have have also added me to query public data.
For more information on what commands you can run on a particular server, use the !help command on that server.`);
						resolve(true);
					}).catch(async err => {
						console.log(err);
						await messageUser.send('I was unable to verify your FIO connection. Your Username or API key may be incorrect. Please restart registration and make sure your username and API key are correct.');
						reject();
					});
				});
			}
			let result = false;
			do {
				try {
					await stepOne();
					await stepTwo();
					// await stepThree();
					await askFIO();
					if(newUser.hasFIO) {
						await getFIOKey();
						result = await checkFIO();
						if(result === true) {
							await con.manager.getRepository(User).save(newUser);
						}
					}
					else {
						await con.manager.getRepository(User).save(newUser);
						messageUser.send(`You have been successfully registered! If you ever need to update any of your information please use the !updateuser command.
To get started, use the !help command to find out about the commmands available to you. A good place to start is the !setinventory, !deleteinventory, and !queryinventory commands.
You'll find that all of the query commands behave similarly, all of the set commands behave similarly, and all of the delete commands behave similarly.`);
						result = true;
					}
				}
				catch(e) {
					console.log(e);
					const errorHandle = function() {
						return new Promise<boolean>(async (resolve) => {
							messageUser.send('There was an issue with your registration. If you would like to retry the registration, please respond with "retry". No action is required to cancel.').then(dmMessage => {
								dmMessage.channel.awaitMessages({filter, max: 1, time: 300000, errors: ['time'] })
									.then(async collected => {
										if(collected.first().content.toLowerCase() !== 'retry') {
											await messageUser.send('Sorry registration was unsuccessful! Please contact ' + message.author.username + ' to re-register.');
											resolve(true);
										} else {
											resolve(false);
										}
									})
									.catch(async () => {
										await dmMessage.channel.send('Timeout reached, cancelling registration.');
										resolve(true);
									});
							});
						});
					}
					result = await errorHandle();
				}
			}
			while(result === false)

		}
		else {
			return message.channel.send('Please mention a user so I can contact them.');
		}
	};
};