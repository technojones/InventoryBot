import { Message } from "discord.js";
import { Connection } from "typeorm";
import { Corp } from "../entity/Corp";
import { User, UserRole } from "../entity/User";

export type Execute = (message: Message, args: string[][], connection: Connection, user: User, corp: Corp | null) => any;

export interface Command {
    name: string;
    args: boolean;
    aliases?: string[];
    permissions: UserRole;
    description: string;
    usage: string;
    execute: Execute;
}