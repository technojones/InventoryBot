import { Message } from "discord.js";
import { Command, Execute } from "../classes/Command";
import { FIO } from "../classes/FIO";
import Functions from "../classes/functions";
import Inventories from "../classes/inventories";
import { Material } from "../entity/Material";
import { User, UserRole } from "../entity/User";
import { queryValue } from "../types/queryValue";
import * as parse from 'csv-parse';
import * as https from 'https';


export default class Test implements Command {
    name: string = 'csv';
    category = 'Utility';
    args: boolean = false;
    needCorp: boolean = false;
    permissions: UserRole = UserRole.ADMIN;
    description: string = 'test command';
    usage: string = '';
    execute: Execute = async (message:Message, args, connection, user, corp) => {
       const attachments = message.attachments;
	   const f = new Functions(connection);

	   attachments.forEach(async attachment =>  {
		   console.log(attachment.name);
		   console.log(attachment.contentType);
		   console.log(attachment);
			console.log(await f.CSVtoArgs(attachment));
	   });
    };
}