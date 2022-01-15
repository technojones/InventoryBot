import { Material } from "../entity/Material";
import { Planet } from "../entity/Planet";
import { User } from "../entity/User";

export type identifiedType = "planet" | "number" | "material" | "user" | "discord_mention" | "uncatagorized";
export type queryValue = {
    planet?: Planet[],
    number?: number[],
    material?: Material[],
    user?: User[],
    discord_mention?: string[],
	uncatagorized?: string[]
};