import { Message, Util } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import Demands from "../classes/demands";
import Functions from "../classes/functions";
import Inventories from "../classes/inventories";
import Prices from "../classes/prices";
import { Corp } from "../entity/Corp";
import { PlanetNickname } from "../entity/PlanetNickname";
import { User, UserRole } from "../entity/User";


export default class About implements Command {
    name: string = 'about';
    category = 'Utility';
    args: boolean = false;
    needCorp: boolean = false;
    permissions: UserRole = UserRole.PUBLIC;
    description: string = 'Returns informaiton that the bot has on you, or your corp';
    usage: string = 'No arguments needed to return your information. Use the \'corp\' keyword to see corp info.';
    execute: Execute = async (message:Message, args: string[][], connection: Connection, user: User, corp: Corp) => {
        const inv = new Inventories();
        const prc = new Prices();
        const demand = new Demands();
        const f = new Functions(connection);
        const messageContents: string[] = [];
        if(args[0].includes('corp')) {
            if(user.corp.id === corp.id) {
                const corpUsers = await connection.manager.getRepository(User).find({where:{ corp }});
                messageContents.push('**Showing information for "' + corp.name + '"**');
                messageContents.push('**Prefix:** ' + (corp.prefix ? corp.prefix : '! (default)'));
                messageContents.push('**The following users are registered as part of your corp:**');
                corpUsers.forEach(u => {
                    if(u.name) {
                        messageContents.push('  ' + u.name + (u.role >= UserRole.LEAD ? ' *(lead)*' : ''));
                    }
                })
				messageContents.push('**You have registered the following nicknames for planets:**');
				let nicknames = await connection.manager.getRepository(PlanetNickname).find({where: {corp}});
				nicknames.forEach(n => {
					messageContents.push(`  ${n.planet.name}: ${n.nickname}`)
				});
            }
            else {
                messageContents.push('**Showing public information for ' + corp.name + '**');
                messageContents.push('Prefix: ' + (corp.prefix ? corp.prefix : '! (default)'));
            }
        }
        else {
            messageContents.push('**User:** ' + user.name);
            messageContents.push('**Company Code:** ' + user.companyCode);

            messageContents.push('**Corp:** ' + (user.corp ? user.corp.name : 'none'));

            if(user.hasFIO) {
                messageContents.push('**FIO Storage Data:**');
                for(const [location, storage] of Object.entries(user.fioData.storageData)) {
                    messageContents.push('` ' +  await f.planetName(location) + ':`');
                    for(const [material, quantity] of Object.entries(storage)) {
                        if(material !== 'timestamp') {
                            messageContents.push(String('`  ' + material + ': ' + quantity).padEnd(20, ' ') + '`');
                        }
                    }
                }

                messageContents.push('**FIO sites:**');
                for(const [key, site] of Object.entries(user.fioData.siteData)) {
                    messageContents.push(String('` ' + await f.planetName(site)).padEnd(20,' ') + '`');
                }

                messageContents.push('**FIO warehouses:**');
                for(const [key, site] of Object.entries(user.fioData.warData)) {
                    messageContents.push(String('` ' + await f.planetName(site)).padEnd(20, ' ') + '`');
                }

                messageContents.push('Site Data updated: ' + user.fioData.siteTS.toString());
                messageContents.push('Storage Data updated: ' + user.fioData.storageTS.toString());
                messageContents.push('');
            }

            await inv.queryInventory({user: [user]}, corp).then(items =>{
                messageContents.push('**Inventory Entries:**');
                if(user.hasFIO) messageContents.push('These entries are your buffer values for FIO, not the quantities returned by the !queryinventory command.')
                let lastGroup;
                items.forEach(item => {
                    if (lastGroup!==item.planet.name) {
                        // if the user is different, add the header.
                        messageContents.push('`' + item.planet.name + ':`');
                    }
                    messageContents.push(String('` ' + item.material.ticker + ': ' + item.quantity).padEnd(20, ' ') + '`');
                    lastGroup = item.planet.name;
                })
                messageContents.push('');
            });

            await prc.queryPrices({user: [user]}, corp).then(items =>{
                messageContents.push('**Price Entries:**');
                let lastGroup;
                items.forEach(item => {
                    if (lastGroup!==item.planet.name) {
                        // if the user is different, add the header.
                        messageContents.push('`' + item.planet.name + ':`');
                    }
                    messageContents.push(String('` ' + item.material.ticker + ': ' + item.price).padEnd(20, ' ') + '`');
                    lastGroup = item.planet.name;
                })
                messageContents.push('');
            });

            await demand.queryDemand({user: [user]}, corp).then(items =>{
                messageContents.push('**Demand Entries:**');

                let lastGroup;
                items.forEach(item => {
                    if (lastGroup!==item.planet.name) {
                        // if the user is different, add the header.
                        messageContents.push('`' + item.planet.name + ':`');
                    }
                    messageContents.push(String('` ' + item.material.ticker + ': ' + item.quantity).padEnd(20, ' ') + '`');
                    lastGroup = item.planet.name;
                })
            });
        }
		const splitMessage = Util.splitMessage(messageContents.join('\n'));

		splitMessage.forEach(m => {
			message.channel.send(m);
		});
    };
}