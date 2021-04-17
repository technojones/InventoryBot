import { Message } from "discord.js";
import { Connection } from "typeorm";
import { FIO } from "../classes/FIO";
import { Corp } from "../entity/Corp";
import { User, UserRole } from "../entity/User";
import { Command, Execute } from "../classes/Command";

export default class AddUser implements Command {
	public name: string = 'adduser';
	description: string = 'Command to add a user to your Corporation';
	args: boolean= true;
	usage: string = 'Discord mention of the user you want to add';
	permissions: UserRole = UserRole.LEAD;
	execute: Execute = async function(message: Message, args: string | string[], con: Connection, user:User, corp?:Corp) {

		const fio = new FIO(con);
		// Check to make sure a user was mentioned
		const messageUser = message.mentions.users.first();
		if (messageUser) {
			// Check if this user has already been entered, and assigned a corp. If no corp is assigned, then continue.
			const userSearch =  await con.manager.getRepository(User).findOne({where: {id: messageUser.id}});
			if(userSearch) {
				if(userSearch.corp) {
					return message.channel.send(messageUser.username + ' is already setup with me.');
				}
			}
			// Create new user object and assign id and default user role
			const newUser = new User();
			newUser.role = UserRole.USER;
			newUser.id = messageUser.id;

			// Check to see if the 'lead' keyword was used. If so, and the requester was also a lead or greater, assign the lead role to the new user.
			if(args.includes('lead') && user.role >= UserRole.LEAD) {
				newUser.role = UserRole.LEAD;
			}

			// If this message is sent on the home discord, don't assign a corp so it can be assigned later (during the corp creation process)
			if(message.guild.id === '830266352270311424') {
				message.channel.send('Home discord detected, no corporation assigned');
			}
			else {
				// otherwise, check to make sure the corp is set up, and assign the corp to the new user
				if(!corp) return message.channel.send('This discord channel is not setup as a corporation.');
				newUser.corp = corp;
			}

			// send the confirmation to the requester that the command has finished successfully and that the user will be contacted.
			message.channel.send('I am sending a message to ' + messageUser.username  + ' to get more information');

			const filter = m => m.author.id === newUser.id;
			const stepOne = function() {
				const messageContents = [];
				messageContents.push('Hello! ' + message.author.username + ' has asked me to get more information from you to integrate you in their corporation\'s discord.');
				messageContents.push('First, please reply with your Prosperous Universe username');
				return new Promise<void>((resolve, reject) => {
					messageUser.send(messageContents).then(dmMessage => {
						dmMessage.channel.awaitMessages(filter, { max: 1, time: 300000, errors: ['time'] })
							.then(async collected => {
								newUser.name = collected.first().content;
								await dmMessage.channel.send(`Great! I've recorded your username as ${collected.first().content} (you can change this later)`);
								resolve();
							})
							.catch(() => {
								message.channel.send('Timeout reached.');
								reject();
							});
					});
				});
			}

			const askFIO = async function() {
				return new Promise<void>((resolve, reject) => {
					messageUser.send('Are you a FIO user? Respond with (Y/N).').then(dmMessage => {
						dmMessage.channel.awaitMessages(filter, { max: 1, time: 300000, errors: ['time'] })
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

					messageUser.send(messageContents).then(dmMessage => {
						dmMessage.channel.awaitMessages(filter, { max: 1, time: 300000, errors: ['time'] })
							.then(async collected => {
								const regex = collected.first().content.match(/[a-f\d]{32}|[-a-f\d]{36}/gm);
								if(regex) {
									newUser.FIOAPIKey = regex[0];
									await dmMessage.channel.send('Thank you for providing your FIO API key. Proceeding to FIO testing');
									resolve();
								}
								else {
									fio.getAPIKey(newUser.name, collected.first().content).then(async apiKey => {
										newUser.FIOAPIKey = apiKey;
										await dmMessage.channel.send('Thank you for providing your password, I was able to generate an API Key. Proceeding to FIO testing');
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
						await messageUser.send('I was able to verify your FIO connection. Your registration is complete!');
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
					// await stepTwo();
					// await stepThree();
					await askFIO();
					if(newUser.hasFIO) {
						await getFIOKey();
						result = await checkFIO();
						if(result === true) {
							await con.manager.getRepository(User).save(newUser);
						}
					}
				}
				catch(e) {
					console.log(e);
					const errorHandle = function() {
						return new Promise<boolean>(async (resolve) => {
							messageUser.send('There was an issue with your registration. If you would like to retry the registration, please respond with "retry". No action is required to cancel.').then(dmMessage => {
								dmMessage.channel.awaitMessages(filter, { max: 1, time: 300000, errors: ['time'] })
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