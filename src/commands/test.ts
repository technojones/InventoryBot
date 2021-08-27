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
    category = 'Utility';
    args: boolean = false;
    needCorp: boolean = false;
    permissions: UserRole = UserRole.LEAD;
    description: string = 'test command';
    usage: string = '';
    execute: Execute = async (message:Message, args, connection, user, corp) => {
       if(message.guild.members.resolve(message.author.id).permissions.has('MANAGE_GUILD')) {
           message.channel.send('You have permissions!');
       }
       else {
            message.channel.send('You do not have permissions!');
       }

    };
}