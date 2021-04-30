import { Message } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import { FIO } from "../classes/FIO";
import { Corp } from "../entity/Corp";
import { Planet } from "../entity/Planet";
import { User, UserRole } from "../entity/User";
import { AllPlanetsPayload } from "../types/planet";

export default class RefreshPlanets implements Command {
    name: string = 'refreshplanets';
    args: boolean = false;
    permissions: UserRole = UserRole.ADMIN;
    description: string = 'Refresh the bot\'s list of planets from FIO';
    usage: string = 'no arguments needed';
    execute: Execute = async function(message: Message, args: string[][], connection: Connection, user: User, corp: Corp | null): Promise<any> {
        const fio = new FIO(connection);
        const allPlanets: AllPlanetsPayload = await fio.getAllPlanets();
        const planetList: Planet[] = [];
        allPlanets.forEach(p => {
            const planet = new Planet();

            planet.truncatedName = p.PlanetName.toLowerCase().replace(' ', '');
            planet.name = p.PlanetName;
            planet.id = p.PlanetNaturalId;

            planetList.push(planet);

        })
        planetList.push({name: 'Benten Station', truncatedName: 'bentenstation', id: 'BEN'});
        planetList.push({name: 'Antares Station', truncatedName: 'antaresstation', id: 'ANT'});
        planetList.push({name: 'Hortus Station', truncatedName: 'hortusstation', id: 'HRT'});
        planetList.push({name: 'Moria Station', truncatedName: 'moriastation', id: 'MOR'});
        planetList.push({name: 'Global', truncatedName: 'global', id: '*global'});
        connection.manager.getRepository(Planet).save(planetList);
    }
}