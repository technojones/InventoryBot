import { Message } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import { Corp } from "../entity/Corp";
import { User, UserRole } from "../entity/User";

export default class RemoveUser implements Command {
    name: string = 'removeuser';
    category = 'Corp';
    args: boolean = true;
    needCorp: boolean = true;
    permissions: UserRole = UserRole.LEAD;
    description: string = 'Removes a user from the corporation. Will prompt for confirmation.';
    usage: string = '<username or partial username to remove>';
    execute: Execute = async (message: Message, args: string[][], connection: Connection, user: User, corp: Corp) => {
        const userSearch = await connection.manager.getRepository(User).find({ where: { corp }, relations: ["corp"]})
        // console.log(userSearch);
        args.forEach(arg => {
            const result: User[] = [];
            for(const u of userSearch) {
                console.log(u);
                if(Array.isArray(arg))
                {
                    for(const a of arg) {
                        if(u.name.toLowerCase().includes(a.toLowerCase()) && u.role <= user.role) {
                            result.push(u);
                            break;
                        }
                    }
                }
                else {
                    if(u.name.includes(arg) && u.role <= user.role) {
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
                                result[0].corp = null;
                                result[0].role = UserRole.USER;
                                await connection.manager.getRepository(User).save(result[0]);
                                message.channel.send('User removed from Corporation');
                            }
                            catch (e) {
                                message.channel.send('Error removing user from corporation');
                            }
                        }
                        else {
                            message.channel.send('User not removed.')
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
        });
    };
}