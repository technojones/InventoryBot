import {createConnection} from "typeorm";
import "reflect-metadata";
import { User, UserRole } from "./entity/User";
import { Inventory } from "./entity/Inventory";


// createConnection method will automatically read connection options
// from your ormconfig file or environment variables
// const connection = createConnection();
createConnection().then(async connection => {
    console.log(await connection.manager.getRepository(User).find({where: {id: 21394094219}}));
    const userSearch = await connection.manager.getRepository(Inventory)
    .createQueryBuilder("inventory")
    .where("inventory.userId = :id", { id: 2 })
    .getOne();

    console.log(userSearch);
    userSearch.quantity = 20;

    await connection.manager.save(userSearch);
    console.log("Saved a new user with id: " + userSearch.id);

    console.log("Loading users from the database...");
    const users = await connection.manager.find(User);
    console.log("Loaded users: ", users);
    console.log(connection.name)
});