import { FindOperator, getConnection, In } from "typeorm";
import { Corp } from "../entity/Corp";
import { Price } from "../entity/Price";
import { queryValue } from "../types/queryValue";

export default class Prices {
    public async queryPrices(queryValues: queryValue, corp: Corp):Promise<Price[]> {
        const queryObject: {
            material?: FindOperator<unknown>,
            user?: FindOperator<unknown>,
            planet?: FindOperator<unknown>
        } = {};
        if(queryValues.material) {
            queryObject.material = In(queryValues.material.map(mat => mat.ticker));
        }
        if(queryValues.user) {
            queryObject.user = In(queryValues.user.map(u => u.id));
        }
        if(queryValues.planet) {
            queryObject.planet = In(queryValues.planet.map(p => p.id));
        }
        const result: Price[] = await getConnection().getRepository(Price).find({where: queryObject, relations:['user', 'user.corp']});
        console.log(result);
        return result.filter(item => item.user.corp.id === corp.id);
    }
}
