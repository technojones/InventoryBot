import { Message } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import { Corp } from "../entity/Corp";
import { User, UserRole } from "../entity/User";


export default class EditCorp implements Command {
    name: string = 'editcorp';
    category = 'Corp';
    aliases = ['ec'];
    args: boolean = false;
    needCorp: boolean = false;
    permissions: UserRole = UserRole.LEAD;
    description: string = 'Edit parameters for the corp such as Prefix and Nickname';
    usage: string = `The first argument is the corp parameter you wish to change. Currently supported options are 'prefix' and 'nickname'
    After the first argument, enter what you wish that parameter to be changed to. Leave it blank to change it back to the default.`;
    execute: Execute = async (message:Message, args: string[][], connection: Connection, user: User, corp: Corp) => {
       if(args[0][0].toLowerCase() === 'prefix') {
            if(!args[0][1] || args[0][1].length <= 3) {
                if(args[0][1]) {
                    corp.prefix = args[0][1];
                }
                else {
                    corp.prefix = null;
                }
                try{
                   await connection.manager.getRepository(Corp).save(corp);
                }
                catch(e) {
                    console.log(e);
                    return message.channel.send('There was an issue updating the corp information');
                }
                message.channel.send(`I've updated the message prefix to ` + (corp.prefix ? `'${corp.prefix}'` : 'default'));
            }
            else {
                return message.channel.send('That prefix is too long! Please keep it to 3 characters o  r less.');
            }
       }
       else if(args[0][0].toLowerCase() === 'nickname') {
            message.guild.members.fetch(message.client.user.id)
                .then(guildUser => {
                    if(args[0].length > 1) {
                        try {
                            guildUser.setNickname(args[0].slice(1).join(' '));
                            message.channel.send('I\'ve set my nickname to \'' + args[0].slice(1).join(' ') + '\'');
                        }
                        catch(e) {
                            console.log(e);
                            message.channel.send('There was an issue updating my nickname!');
                        }
                    }
                    else {
                        try {
                            guildUser.setNickname(null);
                            message.channel.send('I\'ve reset my nickname to default');
                        }
                        catch(e) {
                            console.log(e);
                            message.channel.send('There was an issue updating my nickname!');
                        }
                    }
                })
                .catch(console.error);
        }
    };
}