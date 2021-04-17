import { Message } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import { Corp } from "../entity/Corp";
import { User, UserRole } from "../entity/User";

export default class RemoveUser implements Command {
    name: string = 'removeuser';
    args: boolean = true;
    permissions: UserRole = UserRole.LEAD;
    description: string = 'Removes a user from the corporation. Will prompt for confirmation.';
    usage: string = '<username or partial username to remove>';
    execute: Execute = async (message: Message, args: string | string[], connection: Connection, user: User, corp: Corp) => {
        const userSearch = await connection.manager.getRepository(User).find({ where: { corp }, relations: ["corp"]})
        // console.log(userSearch);
        const result: User[] = [];
        for(const u of userSearch) {
            console.log(u);
            if(Array.isArray(args))
            {
                for(const a of args) {
                    if(u.name.toLowerCase().includes(a.toLowerCase()) && u.role <= user.role) {
                        result.push(u);
                        break;
                    }
                }
            }
            else {
                if(u.name.includes(args) && u.role <= user.role) {
                    result.push(u);
                }
            }
        }
        console.log(result.length);
        if(result.length === 1) {
            message.channel.send('I found ' + result[0].name + ' in your corp. Do you want to remove them? Respond with (Y/N)').then(() => {
                const filter = m => m.author.id === user.id;
                message.channel.awaitMessages(filter, { max: 1, time: 300000, errors: ['time'] }).then(async collected => {
                    if(collected.first().content.toLowerCase().includes('y')) {
                        try {
                            await connection.manager.getRepository(User).delete(result[0]);
                            message.channel.send('User deleted');
                        }
                        catch (e) {
                            message.channel.send('Error deleting user');
                        }
                    }
                    else {
                        message.channel.send('User not deleted.')
                    }
                }).catch(()=> {
                    message.channel.send('Timeout reached. Please try your command again');
                });
            });
        }
        else if (result.length > 1) {
            const messageContents = [];
            messageContents.push('I found the following users in your corp that matched the criteria. Please try searching again with more a more exact query.');
            for(const r in result) {
                if(result.hasOwnProperty(r)) {
                    messageContents.push(`[${r}] ${result[r]}`);
                }
            }
            message.channel.send(messageContents);
        }
        else {
            message.channel.send('No results found. Please try again, or make sure the user doesn\'t have higher permissions than you.');
        }
    };
}