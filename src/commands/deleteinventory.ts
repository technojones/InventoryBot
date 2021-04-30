import { CollectorFilter, Message, MessageReaction, User as DiscordUser } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import Functions from "../classes/functions";
import Inventories from "../classes/inventories";
import { Corp } from "../entity/Corp";
import { Inventory } from "../entity/Inventory";
import { User, UserRole } from "../entity/User";
import { queryValue } from "../types/queryValue";

export default class DeleteInventory implements Command {
    name: string = 'deleteinventory';
    aliases: string[] = ['deletei', 'deleteinv', 'di'];
    args: boolean = true;
    permissions: UserRole.USER;
    description: string = 'Delete some/all of your inventory values. It will ask for confirmation before deleting.';
    usage: string = 'Parameters to search your inventory (planets and/or materials). Leave blank if you want to delete all of your inventory';
    execute: Execute = async function(message: Message, args: string[][], connection: Connection, user: User, corp: Corp | null) {
        const f = new Functions(connection);

		const queryValues:queryValue = await f.idArgs(args[0]);

		queryValues.user = [user];

        const inv = new Inventories();
        console.log(queryValues);
        inv.queryInventory(queryValues, corp)
            .then((result) => {
                const selectResults = 'I found ' + result.length + ' items in your inventory that match the provided criteria. React with ✅ to confirm deletion, ❌ to cancel`'
                message.channel.send(selectResults).then(msg => {
                    msg.react('✅').then(() => msg.react('❌'));

                    const filter: CollectorFilter = (reaction: MessageReaction, discordUser: DiscordUser) => {
                        return ['✅', '❌'].includes(reaction.emoji.name) && discordUser.id === message.author.id;
                    };

                    msg.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
                    .then((collected) => {
                        const reaction = collected.first();
                        if (reaction.emoji.name === '✅') {
                            connection.manager.getRepository(Inventory).remove(result).then(()=> {
                                message.channel.send('I\'ve deleted the requested items');
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
                    });
                });
            });
    };
}