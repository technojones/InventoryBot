import { Message } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import { Corp } from "../entity/Corp";
import { User, UserRole } from "../entity/User";

export default class AddCorp implements Command {
    name: string = 'addcorp';
    category = 'Corp';
    args: boolean = false;
    needCorp: boolean = false;
    permissions: UserRole = UserRole.LEAD;
    description: string = `Use this command on an unregistered Discord to add it to the corp database and enable adding users by lead users.
        The user running this command must have the 'manage server' permission level, and will be added to the corporation.`;
    usage: string = 'No arguments needed.';
    execute: Execute = async function(message: Message, args: string[][], con: Connection, user: User, corp: Corp) {
        if(message.channel.type === 'dm'){
            return message.channel.send('I can\'t create a corp from a DM channel, please try again in a discord server');
        }

        if(corp) {
            return message.channel.send('This discord server appears to already be connected to a corporation.');
        }
        else {
            const newCorp = new Corp();
            newCorp.id = message.guild.id;
            newCorp.name = message.guild.name;
            user.corp = newCorp;
            user.role = UserRole.LEAD;
            try {
                con.manager.getRepository(Corp).save(newCorp);
                con.manager.getRepository(User).save(user);
                message.channel.send('Corporation added successfully, and you have been assigned as a lead. Please finish your registration with the register command.');
            }
            catch(e) {
                console.log({
                    'context': 'Creating a new corporation with !addcorp',
                    'message': message.content,
                    'user': user.name + ' ' + user.id,
                    'corp': newCorp.name + ' ' + newCorp.id,
                    'error': e,
                    'time': Date.now().toLocaleString()
                });
                message.channel.send('There was an error saving the corporation. The error has been logged.');
            }
        }
    };
}