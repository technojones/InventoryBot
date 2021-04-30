import { Message } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import { FIO } from "../classes/FIO";
import { Corp } from "../entity/Corp";
import { Material } from "../entity/Material";
import { User, UserRole } from "../entity/User";
import { MaterialPayload } from "../types/material";

export default class RefreshMaterials implements Command {
    name: string = 'refreshmaterials';
    args: boolean = false;
    permissions: UserRole = UserRole.ADMIN;
    description: string = 'Refresh the bot\'s definition of materials from FIO';
    usage: string = 'no arguments needed';
    execute: Execute = async function(message: Message, args: string[][], connection: Connection, user: User, corp: Corp | null): Promise<any> {
        const fio = new FIO(connection);
        const materials: MaterialPayload = await fio.getMaterials();
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
        connection.manager.getRepository(Material).save(materialList);
    }
}