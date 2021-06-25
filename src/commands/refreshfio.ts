import { Message } from "discord.js";
import { Command, Execute } from "../classes/Command";
import { FIO } from "../classes/FIO";
import { Material } from "../entity/Material";
import { User, UserRole } from "../entity/User";

export default class RefreshFIO implements Command {
    name: string = 'refreshfio';
    category = 'Corp';
    args: boolean = false;
    needCorp: boolean = true;
    permissions: UserRole = UserRole.USER;
    description: string = 'Refreshes FIO data for your corporation';
    usage: string = 'No arguments are taken for this command. It uses the corporation data of the current server or the user if it\'s a DM channel';
    execute: Execute = async (message:Message, args, connection, user, corp) => {
        const fio = new FIO(connection);

        try {
            // console.log(await connection.manager.getRepository(User).find({ where: { id: user.id }, relations: ['fioData']}));
            // await fio.fetchUserData(user);
            // console.log(await connection.manager.getRepository(User).findOne(user));
            fio.refreshCorpData(corp).then(() => {
                message.channel.send('FIO data updated successfully');
            }).catch(e => {
                console.log(e);
                message.channel.send('There was an issue updating FIO ' + e)
            })
        }
        catch(e) {
            console.log (e);
        }

    };
}