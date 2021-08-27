import { Message } from "discord.js";
import { Connection } from "typeorm";
import { FIO } from "../classes/FIO";
import { Corp } from "../entity/Corp";
import { User, UserRole } from "../entity/User";
import { Command, Execute } from "../classes/Command";

export default class UpdateUser implements Command {
	public name: string = 'updateuser';
	category = 'Users';
	description: string = 'Command to update a user';
	args: boolean= false;
	needCorp: boolean = false;
	usage: string = `Discord mention of the user you want to update, or blank to update yourself.
		If you are a corp lead, you may designate another corp lead by adding the 'lead' keyword`;
	permissions: UserRole = UserRole.USER;
	execute: Execute = async function(message: Message, args: string[][], con: Connection, user:User, corp?:Corp) {

		const fio = new FIO(con);
		// Check to make sure a user was mentioned
        let messageUser: User;
		let discordUser = message.mentions.users.first();
        if(!discordUser) {
            messageUser = user;
            discordUser = message.author;
        }
        else {
            messageUser = await con.manager.getRepository(User).findOne({where: {id: discordUser.id}});
        }
        if(!messageUser) {
            return message.channel.send('I did not find a user to update');
        }
		if (messageUser) {

			// Check to see if the 'lead' keyword was used. If so, and the requester was also a lead or greater, assign the lead role to the new user.
			if(args[0].includes('lead') && user.role >= UserRole.LEAD) {
				messageUser.role = UserRole.LEAD;
			}

            if(message.channel.type !== 'DM') {
                // send the confirmation to the requester that the command has finished successfully and that the user will be contacted.
                message.channel.send('I am sending a message to ' + messageUser.name  + ' to get more information');
            }

			const filter = m => m.author.id === messageUser.id;
			const stepOne = function() {
				const messageContents = [];
				messageContents.push('Let\'s update your info!');
				messageContents.push('First, please reply with your Prosperous Universe username. Current value: ' + messageUser.name);
				return new Promise<void>((resolve, reject) => {
					discordUser.send(messageContents.join('\n')).then(dmMessage => {
						dmMessage.channel.awaitMessages({filter, max: 1, time: 300000, errors: ['time'] })
							.then(async collected => {
								messageUser.name = collected.first().content;
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
				messageContents.push('Now, reply with your company code. Current Value: ' + messageUser.companyCode);
				return new Promise<void>((resolve, reject) => {
					discordUser.send(messageContents.join('\n')).then(dmMessage => {
						dmMessage.channel.awaitMessages({filter, max: 1, time: 300000, errors: ['time'] })
							.then(async collected => {
								messageUser.companyCode = collected.first().content;
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
					discordUser.send('Are you a FIO user? Respond with (Y/N). Currently set as: ' + (messageUser.hasFIO ? 'Y' : 'N')).then(dmMessage => {
						dmMessage.channel.awaitMessages({filter, max: 1, time: 300000, errors: ['time'] })
							.then(async collected => {
								if(collected.first().content.toLowerCase() === 'y') {
									messageUser.hasFIO = true;
									await dmMessage.channel.send(`Great! I've recorded that you have FIO (you can change this later)`);
									resolve();
								}
								else if(collected.first().content.toLowerCase() === 'n') {
									messageUser.hasFIO = false;
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

                    if(messageUser.FIOAPIKey !== null) {
                        messageContents.push('**If you would like to keep using your current API key, just respond with a single character like \'-\'**');
                    }

					discordUser.send(messageContents.join('\n')).then(dmMessage => {
						dmMessage.channel.awaitMessages({filter, max: 1, time: 300000, errors: ['time'] })
							.then(async collected => {
								const regex = collected.first().content.match(/[a-f\d]{32}|[-a-f\d]{36}/gm);
								if(regex) {
									messageUser.FIOAPIKey = regex[0];
									await dmMessage.channel.send('Thank you for providing your FIO API key. Proceeding to FIO testing. Please standby while I connect with FIO.');
									resolve();
								}
                                else if(collected.first().content.length === 1) {
                                    await dmMessage.channel.send('Reusing previous API key. Please standby while I connect with FIO.');
									resolve();
                                }
								else {
									fio.getAPIKey(messageUser.name, collected.first().content).then(async apiKey => {
										messageUser.FIOAPIKey = apiKey;
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
					fio.updateUserData([messageUser]).then(async () => {
						await discordUser.send(`I was able to verify your FIO connection. Your registration is complete!
Please note! As a FIO user, your inventory is automatically updated. The !setinventory command now works differently! It now is used to specify what you are offering for corp sale.
To add all of your FIO stock of an item for Corp sale, simple use !setinventory with the planet and material and leave the quantity blank or set it to 0.
To reserve some of your stock, use the amount you want to reserve as the quantity. Any amount above that in your FIO data will be made available.`);
						resolve(true);
					}).catch(async err => {
						console.log(err);
						await discordUser.send('I was unable to verify your FIO connection. Your Username or API key may be incorrect. Please restart registration and make sure your username and API key are correct.');
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
					if(messageUser.hasFIO) {
						await getFIOKey();
						result = await checkFIO();
						if(result === true) {
							await con.manager.getRepository(User).save(messageUser);
						}
					}
					else {
						await con.manager.getRepository(User).save(messageUser);
						discordUser.send('You have been successfully updated!')
						result = true;
					}
				}
				catch(e) {
					console.log(e);
					const errorHandle = function() {
						return new Promise<boolean>(async (resolve) => {
							discordUser.send('There was an issue updating your info. If you would like to retry, please respond with "retry". No action is required to cancel.').then(dmMessage => {
								dmMessage.channel.awaitMessages({filter, max: 1, time: 300000, errors: ['time'] })
									.then(async collected => {
										if(collected.first().content.toLowerCase() !== 'retry') {
											await discordUser.send('Sorry the update was unsuccessful. Please retry!');
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