import { Connection } from "typeorm";
import { Corp } from "../entity/Corp";
import { User } from "../entity/User";

export default class Users {
    private con: Connection;
    constructor(con: Connection) {
        this.con = con;
    }
    /**
     * belongsToCorp
     */
    public async belongingToCorp(corp: Corp): Promise<User[]> {
        return this.con.manager.getRepository(User).find({where: { corp }, relations: ["corp", "fioData"]});
    }
    /**
     * hasFIOData
     */
    public hasFIOData(users: User[]) {
        return users.filter(user => user.fioData != null);
    }
    public hasFIO(users: User[]) {
        return users.filter(user => user.hasFIO);
    }
}