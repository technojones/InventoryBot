import { Message } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import { Corp } from "../entity/Corp";
import { User, UserRole } from "../entity/User";


export default class Test implements Command {
    name: string = 'template';
    category = 'Utility';
    args: boolean = false;
    needCorp: boolean = false;
    permissions: UserRole = UserRole.ADMIN;
    description: string = 'Description for Command';
    usage: string = 'How the syntax is supposed to look';
    execute: Execute = async (message:Message, args: string[][], connection: Connection, user: User, corp: Corp) => {
       return;
    };
}