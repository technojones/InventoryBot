import { Message } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import { FIO } from "../classes/FIO";
import { Corp } from "../entity/Corp";
import { Material } from "../entity/Material";
import { User, UserRole } from "../entity/User";
import { MaterialPayload } from "../types/material";
import winston = require("winston");

const logger = winston.loggers.get('logger')

export default class RefreshMaterials implements Command {
    name: string = 'refreshmaterials';
    category = 'Admin';
    args: boolean = false;
    needCorp: boolean = false;
    permissions: UserRole = UserRole.ADMIN;
    description: string = 'Refresh the bot\'s definition of materials from FIO';
    usage: string = 'no arguments needed';
    execute: Execute = async function(message: Message, args: string[][], connection: Connection, user: User, corp: Corp | null): Promise<any> {
        const fio = new FIO(connection);
        let materials: MaterialPayload;
        try {
            materials = await fio.getMaterials();
        }
        catch (e) {
            logger.error('Material refresh error', {messageID: message.id, messageGuild: message.channel.type !== "DM" ? message.guild.id : "DM", user, args, e});
            return message.channel.send('There was an error updating the material list');
        }
        const materialList: Material[] = [];
        materials.forEach(m => {
            const material = new Material();

            material.ticker = m.Ticker;
            material.name = m.Name;
            material.volume = m.Volume;
            material.weight = m.Weight;
            material.category = m.CategoryName;

            materialList.push(material);

        })
        try {
            connection.manager.getRepository(Material).save(materialList);
            message.channel.send('Successfully updated material list.');
        }
        catch (e) {
            message.channel.send('There was an error updating the material list');
            logger.error('Material Database refresh error', {messageID: message.id, messageGuild: message.channel.type !== "DM" ? message.guild.id : "DM", user, args, e});
        }
    }
}