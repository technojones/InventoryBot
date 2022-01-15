import { userInfo } from "os";
import { FindOperator, getConnection, In } from "typeorm";
import { Corp } from "../entity/Corp";
import { Inventory } from "../entity/Inventory";
import { Price } from "../entity/Price";
import { User } from "../entity/User";
import { InvWithPrice } from "../nonDBEntity/InventoryWithPrice";
import { queryValue } from "../types/queryValue";

export default class Inventories {
    public async queryInventory(queryValues: queryValue, corp: Corp):Promise<Inventory[]> {
        const queryObject: {
            material?: FindOperator<unknown>,
            user?: FindOperator<unknown>,
            planet?: FindOperator<unknown>
        } = {};

        if(queryValues === {}) {
            const users = await getConnection().getRepository(User).find({where: {corp}})
            queryObject.user = In(users.map(u => u.id))
        }

        if(queryValues.material) {
            queryObject.material = In(queryValues.material.map(mat => mat.ticker));
        }
        if(queryValues.user) {
            queryObject.user = In(queryValues.user.map(u => u.id));
        }
        if(queryValues.planet) {
            queryObject.planet = In(queryValues.planet.map(p => p.id));
        }
        const result: Inventory[] = await getConnection().getRepository(Inventory).find({where: queryObject,
			relations: ['user', 'user.corp'],
			order: {
				planet: 'ASC',
				user: 'ASC',
				material: 'ASC'

			}});
        return result.filter(item => item.user.corp.id === corp.id);
    }
    public async queryInvWithPrice(queryValues: queryValue, corp: Corp): Promise<InvWithPrice[]> {
        return new Promise(async (resolve, reject) => {
            const queryObject: {
                material?: FindOperator<unknown>,
                user?: FindOperator<unknown>,
                planet?: FindOperator<unknown>
            } = {};
			const users = await getConnection().getRepository(User).find({where: {corp}})

            if(queryValues.material) {
                queryObject.material = In(queryValues.material.map(mat => mat.ticker));
            }
            if(queryValues.user) {
                queryObject.user = In(queryValues.user.map(u => u.id));
            }
			else {
				queryObject.user = In(users.map(u => u.id))
			}
            if(queryValues.planet) {
                queryObject.planet = In(queryValues.planet.map(p => p.id));
            }

            const results: Promise<[Inventory[], Price[]]> = Promise.all([getConnection().getRepository(Inventory).find({where: queryObject,
                relations: ['user', 'user.corp'],
                order: {
                    planet: 'ASC',
                    user: 'ASC',
                    material: 'ASC'

                }}),
                getConnection().getRepository(Price).find({where: queryObject,
                    relations:['user', 'user.corp'],
                    order: {
                        planet: 'ASC',
                        user: 'ASC',
                        material: 'ASC'
                    }})]);

            results.then(([inv, prc]) => {
                const addedPrice: InvWithPrice[] = [];
                inv.forEach((i, index) => {
                    const match = prc.filter(p => p.material.ticker === i.material.ticker && (p.planet.id === i.planet.id || p.planet.id === '*global') && p.user.id === i.user.id);
                    addedPrice[index] = i;
                    if(match.length > 0) {
                        addedPrice[index].price = match[match.length - 1].price;
                    }
                });
                resolve(addedPrice.filter(item => item.user.corp.id === corp.id));
            }).catch(e => {
                reject(e);
            });
        });
    }
}
