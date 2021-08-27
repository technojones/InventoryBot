import { Message, Util } from "discord.js";
import { Connection } from "typeorm";
import { FIO } from "../classes/FIO";
import { Corp } from "../entity/Corp";
import { User, UserRole } from "../entity/User";
import { Command, Execute } from "../classes/Command";

export default class AddUser implements Command {
	public name: string = 'adduser';
	category = 'Users';
	description: string = 'Command to add a user or group of users to your Corporation';
	args: boolean= true;
	needCorp: boolean = true;
	usage: string = `Provide a Discord mention of the user you want to add, or a Discord role mention of a group of Discord users you want to add.
		You may add the 'lead' keyword to designate a corp lead`;
	permissions: UserRole = UserRole.LEAD;
	execute: Execute = async function(message: Message, args: string[][], con: Connection, user:User, corp?:Corp) {
		// Check to make sure a user was mentioned
		const messageUser = message.mentions.users.first();
		const messageRole = message.mentions.roles.first();

		if (messageUser) {
			let newUser: User;
			// Check if this user has already been entered, and assigned a corp. If no corp is assigned, then continue.
			const userSearch =  await con.manager.getRepository(User).findOne({where: {id: messageUser.id}});
			if(userSearch) {
				if(userSearch.corp) {
					return message.channel.send(messageUser.username + ' is already setup with me.');
				}
				else {
					newUser = userSearch;
					newUser.role = UserRole.USER;
				}
			}
			else {
				newUser = new User();
				newUser.role = UserRole.USER;
				newUser.id = messageUser.id;

			}
			// Create new user object and assign id and default user role

			// Check to see if the 'lead' keyword was used. If so, and the requester was also a lead or greater, assign the lead role to the new user.
			if(args[0].includes('lead') && user.role >= UserRole.LEAD) {
				newUser.role = UserRole.LEAD;
			}

			// If this message is sent on the home discord, don't assign a corp so it can be assigned later (during the corp creation process)
			if(message.guild.id !== '830266352270311424') {
				// otherwise, check to make sure the corp is set up, and assign the corp to the new user
				if(!corp) return message.channel.send('This discord channel is not setup as a corporation.');
				newUser.corp = corp;
			}
			else {
				newUser.role = UserRole.LEAD;
			}

			try {
				await con.manager.getRepository(User).save(newUser);
			}
			catch(e) {
				return message.channel.send('There was an issue adding the new user to the database: ' + e);
			}

			if(message.guild.id === '830266352270311424') {
				// send the confirmation to the requester that the command has finished successfully and that the user will be contacted.
				message.channel.send('I am sending a message to ' + messageUser.username  + ' to get more information. Home Discord detected, no corporation has been assigned and lead permission set.');
				messageUser.send(message.author.username + ' has added you to my database. To register, please respond with !register. Once you register, you may add a discord server as a corporation with !addcorp')
			}
			else if(newUser.name && newUser.companyCode) {
				// send the confirmation to the requester that the command has finished successfully and that the user will be contacted.
				await message.channel.send(messageUser.username  + ' already had data associated with me, I\'ve added them to your corp.');
				return messageUser.send(message.author.username + ' has added your to their corporation. If you need to update any of your information please run !updateuser. Otherwise, all previous information will be used.')
			}
			else {
				// send the confirmation to the requester that the command has finished successfully and that the user will be contacted.
				message.channel.send('I am sending a message to ' + messageUser.username  + ' to get more information');
				messageUser.send(message.author.username + ' has added your to their corporation. To register, please respond with !register')
			}
		}
		else if(messageRole) {
			const errors: string[] = []
			const success: string[] = []
			const promises = messageRole.members.map(member => {
				return new Promise<void>(resolve => {
					const username = member.nickname ? member.nickname : member.user.username;
					con.manager.getRepository(User).findOne({where: {id: member.id}}).then(foundUser => {
						if(foundUser) {
							if(foundUser.corp) {
								errors.push(username + ' is already setup with me.');
								return resolve();
							}
						}
						// Create new user object and assign id and default user role
						const newUser = new User();
						newUser.role = UserRole.USER;
						newUser.id = member.id;

						// Check to see if the 'lead' keyword was used. If so, and the requester was also a lead or greater, assign the lead role to the new user.
						if(args[0].includes('lead') && user.role >= UserRole.LEAD) {
							newUser.role = UserRole.LEAD;
						}

						// If this message is sent on the home discord, don't assign a corp so it can be assigned later (during the corp creation process)
						if(message.guild.id !== '830266352270311424') {
							// otherwise, check to make sure the corp is set up, and assign the corp to the new user
							if(!corp) {
								errors.push('this discord is not setup as a corporation');
								resolve();
							}
							newUser.corp = corp;
						}
						try {
							con.manager.getRepository(User).save(newUser).then(() =>{
								try {
									member.send(message.author.username + ' has added your to their corporation. To register, please respond with !register');
									success.push(username + ' has been messaged');
								}
								catch {
									errors.push(username + ' could not be added');
								}
								resolve();
							});
						}
						catch(e) {
							console.log(e);
							errors.push(username + ' could not be added');
							resolve();
						}
					});
				});
			});
			Promise.allSettled(promises).then(() => {
				const messageContents = [];
				if(errors.length !== 0) {
					messageContents.push('**I encountered the following errors:**');
					messageContents.push(errors.join(', '));
				}
				messageContents.push('**The following users were added successfully and messaged:**');
				messageContents.push(success.join(', '));
				
				const splitMessage = Util.splitMessage(messageContents.join('\n'));

				splitMessage.forEach(m => {
					message.channel.send(m);
				});
			});
		}
		else {
			return message.channel.send('Please mention a user so I can contact them.');
		}
	};
};