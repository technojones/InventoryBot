import { Message, Util } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import Functions from "../classes/functions";
import { Corp } from "../entity/Corp";
import { Demand } from "../entity/Demand";
import { User, UserRole } from "../entity/User";
import { queryValue } from "../types/queryValue";
import winston = require("winston");
import { PlanetNickname } from "../entity/PlanetNickname";

const logger = winston.loggers.get('logger')

export default class SetNickname implements Command {
	permissions: UserRole = UserRole.LEAD;
	category = 'Corp';
	name = 'setnickname';
	description = `Use this command to set a nickname for a planet.
		You must provide a planet id or name, and then a nickname you'd like your corp to use (all one word)
		To delete a nickname, simply provide the current nickname or the planet ID with no other arguments.`;
	args = true;
    needCorp: boolean = true;
	aliases = ['setn', 'sn'];
	usage = '`<planet> <nickname>`';
	execute: Execute = async function(message: Message, args: string[][], connection: Connection, user: User, corp: Corp | null): Promise<any> {
		const functions = new Functions(connection);
		let planet;

		// identify all the first line arguments
		const identArgs: queryValue = await functions.idArgs(args[0], corp);
		// If planet is a friendly name, return the designation
		if (identArgs.planet) {
			planet = identArgs.planet[0];
		}
		else {
			logger.warn("Unprovided Planet in setnickname", {messageID: message.id, messageGuild: message.channel.type !== "DM" ? message.guild.id : "DM", user, args});
			return message.channel.send('You must provide a planet');
		}

		let found: PlanetNickname;
		try {
			found = await connection.manager.getRepository(PlanetNickname).findOne({where : {planet, corp}});
		}
		catch(e) {
			logger.error("Database error in setnickname", {messageID: message.id, messageGuild: message.channel.type !== "DM" ? message.guild.id : "DM", user, args, e});
			return message.channel.send('There was a database error');
		}

		if(!found) {
			if(!identArgs.uncatagorized) {
				logger.warn("Unprovided Nickname in setnickname", {messageID: message.id, messageGuild: message.channel.type !== "DM" ? message.guild.id : "DM", user, args});
				return message.channel.send('You must provide a nickname');
			}

			found = new PlanetNickname();
			found.corp = corp;
			found.planet = planet;
			found.nickname = identArgs.uncatagorized[0];
		}
		else {
			if(!identArgs.uncatagorized) {
				try {
					await connection.manager.getRepository(PlanetNickname).delete(found);
					
				}
				catch {
					return message.channel.send(`There was an error deleting that nickname`);
				}
				return message.channel.send(`Nickname for ${found.planet.name} has been deleted.`);
			}
					

			found.nickname = identArgs.uncatagorized[0];
		}
		try {
			const result = await connection.manager.getRepository(PlanetNickname).save(found);
			if(result) {
				return message.channel.send(`Successfully added the nickname ${result.nickname} to ${result.planet.name}`);
			}
			else {
				logger.error("Error updating the database in setnickname", {messageID: message.id, messageGuild: message.channel.type !== "DM" ? message.guild.id : "DM", user, args});
				return message.channel.send('There was an error updating the database');
			}
		}
		catch(e) {
			logger.error("Database error in setnickname", {messageID: message.id, messageGuild: message.channel.type !== "DM" ? message.guild.id : "DM", user, args, e});
			return message.channel.send('There was a database error');
		}
		
	};
};