import { Message } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import { Corp } from "../entity/Corp";
import { User, UserRole } from "../entity/User";

export default class AddCorp implements Command {
    name: string = 'addcorp';
    args: boolean = false;
    permissions: UserRole = UserRole.LEAD;
    description: string = `Use this command on an unregistered Discord to add it to the corp database and enable adding users by lead users.
        If a user is not assigned a Corporation, then it will assign them to the new corporation as part of this process`;
    usage: string = 'No arguments needed.';
    execute: Execute = async function(message: Message, args: string[][], con: Connection, user: User, corp: Corp) {
        if(message.channel.type === 'dm'){
            return message.channel.send('I can\'t create a corp from a DM channel, please try again in a discord server');
        }
        if(corp) {
            return message.channel.send('This discord server appears to already be connected to a corporation.');
        }
        if(user.role >= UserRole.LEAD) {
            const newCorp = new Corp();
            newCorp.id = message.guild.id;
            newCorp.name = message.guild.name;
            try {
                con.manager.getRepository(Corp).save(newCorp);
                message.channel.send('Corporation added successfully');
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

            if(!user.corp) {
                user.corp = newCorp;
                try {
                    con.manager.getRepository(User).save(user);
                    message.channel.send('You have successfully been added to the new corporation');
                }
                catch(e) {
                    console.log({
                        'context': 'Saving a new corp into a user that did not have one after creating the new corp.',
                        'message': message.content,
                        'user': user.name + ' ' + user.id,
                        'corp': newCorp.name + ' ' + newCorp.id,
                        'error': e,
                        'time': Date.now().toLocaleString()
                    });
                    message.channel.send('There was an error updating your corporation to the new one. The error has been logged.');
                }
            }
        }
    };
}