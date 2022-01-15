import { Message } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import Functions from "../classes/functions";
import { Corp } from "../entity/Corp";
import { User, UserRole } from "../entity/User";

export default class Identify implements Command {
    name: string = 'identify';
    category = 'Utility';
    args: boolean = true;
    needCorp: boolean = false;
    permissions: UserRole.PUBLIC;
    description: string = 'See how the bot views a certian value';
    usage: string = 'A string to be scanned by the bot';
    execute: Execute = async function(message: Message, args: string[][], connection: Connection, user: User, corp: Corp | null) {
        const functions = new Functions(connection);
        const identified = await functions.id(args[0][0], corp);
        // const messageContents = [];
        if(identified.type === 'user') {
            const idUser: any = identified.value
            message.channel.send(identified.type + ': ' + idUser.name);
        }
        else {
            message.channel.send(identified.type + ': ' + JSON.stringify(identified.value));
        }

        // message.channel.send(messageContents);
    };
}