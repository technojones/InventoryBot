import { Connection } from "typeorm";
import { User } from "../entity/User";

export default class Users {
    private usersCollection: User[];
    private async refreshCollection(con: Connection) {
        this.usersCollection = await con.manager.getRepository(User).find();
    }
}