import { Material } from "./entity/Material";
import { Planet } from "./entity/Planet";

export type User = {
    id: number,
    user: string,
    discord: string,
    discordID: number,
    companyID: string,
    fioUsername: string | null
};
