import { CollectorFilter, Message, MessageReaction, User as DiscordUser } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import Demands from "../classes/demands";
import Functions from "../classes/functions";
import { Corp } from "../entity/Corp";
import { Demand } from "../entity/Demand";
import { User, UserRole } from "../entity/User";
import { queryValue } from "../types/queryValue";

export default class DeleteDemand implements Command {
    name: string = 'deletedemand';
    category = 'Inventory';
    aliases: string[] = ['deleted', 'dd'];
    args: boolean = true;
    needCorp: boolean = false;
    permissions = UserRole.USER;
    description: string = 'Delete some/all of your demand values. It will ask for confirmation before deleting.';
    usage: string = 'Provide parameters to search your demand (planets and/or materials). Leave blank if you want to delete all of your demand';
    execute: Execute = async function(message: Message, args: string[][], connection: Connection, user: User, corp: Corp | null) {
        const f = new Functions(connection);

		const queryValues:queryValue = await f.idArgs(args[0]);

		queryValues.user = [user];

        const demands = new Demands();
        console.log(queryValues);
        demands.queryDemand(queryValues, corp)
            .then((result) => {
                const selectResults = '`' + f.queryPrint(queryValues) + '` \n';
                let messageContents = selectResults + 'I found ' + result.length + ' items in your demand that match the provided criteria. React with ✅ to confirm deletion, ❌ to cancel`'
                message.channel.send(selectResults).then(msg => {
                    msg.react('✅').then(() => msg.react('❌'));

                    const filter: CollectorFilter = (reaction: MessageReaction, discordUser: DiscordUser) => {
                        return ['✅', '❌'].includes(reaction.emoji.name) && discordUser.id === message.author.id;
                    };

                    msg.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
                    .then((collected) => {
                        const reaction = collected.first();
                        if (reaction.emoji.name === '✅') {
                            connection.manager.getRepository(Demand).remove(result).then(()=> {
                                messageContents = selectResults + 'I\'ve deleted the requested items';
                                msg.edit(messageContents);
                                msg.reactions.resolve('✅').users.remove(message.client.user);
                                msg.reactions.resolve('❌').users.remove(message.client.user);
                            }).catch(e => {
                                console.log(e);
                                message.channel.send('I\'ve encountered an issue deleting the requested items, and the operation may not have completed.');
                            });
                        }
                        else {
                            msg.delete();
                        }
                    }).catch(function() {
                        msg.edit('timeout reached');
                        msg.reactions.resolve('✅').users.remove(message.client.user);
                        msg.reactions.resolve('❌').users.remove(message.client.user);
                    });
                });
            });
    };
}