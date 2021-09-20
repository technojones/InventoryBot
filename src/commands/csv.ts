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
    name: string = 'test';
    category = 'Utility';
    args: boolean = false;
    needCorp: boolean = false;
    permissions: UserRole = UserRole.LEAD;
    description: string = 'test command';
    usage: string = '';
    execute: Execute = async (message:Message, args, connection, user, corp) => {
       const attachments = message.attachments;

	   attachments.forEach(attachment => {
		   console.log(attachment.name);
		   console.log(attachment.contentType);
		   console.log(attachment);
			const req = https.request(attachment.attachment as string, res => {
				console.log('statusCode:', res.statusCode);
				console.log('headers:', res.headers);
				let data = Buffer.alloc(0)
				res.on('data', (d) => {
					if(Buffer.isBuffer(d)) {
						console.log(d);
				  		data = Buffer.concat([data, d]);
					}
				});

				res.on('close', () => {
					parse(data, {}, (err, parsedData) => {
						console.log('Parsed Data:')
						console.log(parsedData);
					});
				})
			});
			  req.on('error', (e) => {
				console.error(e);
			  });
			  req.end();
		});
    };
}