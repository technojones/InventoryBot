import { Message } from "discord.js";
import { Command, Execute } from "../classes/Command";
import { FIO } from "../classes/FIO";
import Functions from "../classes/functions";
import Inventories from "../classes/inventories";
import { Material } from "../entity/Material";
import { User, UserRole } from "../entity/User";
import { queryValue } from "../types/queryValue";

export default class Test implements Command {
    name: string = 'test';
    args: boolean = false;
    needCorp: boolean = false;
    permissions: UserRole = UserRole.ADMIN;
    description: string = 'test command';
    usage: string = '';
    execute: Execute = async (message:Message, args, connection, user, corp) => {
        const inv = new Inventories();
        const f = new Functions(connection);
        // console.log(message.mentions.roles.first());
        let role = message.mentions.roles.first();
        if(!role) role = message.guild.roles.cache.find(r => r.id === args[0][0]);
        if(!role) return message.reply('that role does not exist!');
        const arr = new Array();
        role.members.forEach(u => {
            arr.push(`--> **${u.user.username}**`);
        });

        message.channel.send(arr.join(' | '));
       /*
        message.mentions.roles.first().members.forEach(async member => {
             console.log(member.user.username);
        });
        */
    };
}