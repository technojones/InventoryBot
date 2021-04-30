import { Message } from "discord.js";
import { Command, Execute } from "../classes/Command";
import { FIO } from "../classes/FIO";
import Functions from "../classes/functions";
import Inventories from "../classes/inventories";
import { Material } from "../entity/Material";
import { User, UserRole } from "../entity/User";
import { queryValue } from "../types/queryValue";

export default class Test implements Command {
    name: string = 'test';
    args: boolean = false;
    permissions: UserRole = UserRole.ADMIN;
    description: string = 'test command';
    usage: string = '';
    execute: Execute = async (message:Message, args, connection, user, corp) => {
        const inv = new Inventories();
        const f = new Functions(connection);

        const queryValues:queryValue = await f.idArgs(args[0]);

        inv.queryInvWithPrice(queryValues,corp);

    };
}