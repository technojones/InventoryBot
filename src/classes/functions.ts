import { Connection, getConnection, Like } from 'typeorm';
import { Material } from '../entity/Material';
import { Planet } from '../entity/Planet';
import { User } from '../entity/User';
import { queryValue } from '../types/queryValue';


type identifiedType = "planet" | "user_id" | "number" | "material" | "user" | "user_id" | "discord_mention" | null;

type idReturn = {
	type: identifiedType | null
	value: string | number | null | User | Material | Planet
}
/*
REGEX for PrUn Materials and planets
Planets: /^\w{2}[-]\d{3}\w/
Materials: /^\w{1,3}$/
Numbers: /^\d+$/
*/
export default class Functions {
	private con:Connection;
	constructor(connection: Connection) {
		this.con = connection;
	}
	uppercasePlanetID = function(planetID: string) {
		if(planetID.match(/^\w{2}[-]\d{3}\w/)) {
			return(planetID.slice(0, 2).toUpperCase() + planetID.slice(2));
		}
		else if (planetID.match(/^\w{1,3}$/)) {
			return(planetID.toUpperCase());
		}
		else {
			return(planetID.slice(0, 2).toUpperCase() + planetID.slice(2));
		}
	};
	public async asyncForEach(array, callback) {
		for (let index = 0; index < array.length; index++) {
		  await callback(array[index], index, array);
		}
	};
	/**
	 * Identifies the type of the value passed
	 * @param {String} value the value to be identified
	 * @returns {Object|null} the type of the passed value (.type) and a coerced value (.value). Options for .type are 'number', 'material', 'planet', 'user', 'user_id'. Returns null if none of the above.
	 */
	async planetName(planetID) {
		const planetQuery = await getConnection().manager.getRepository(Planet).findOne({where: [
			{ truncatedName: planetID.toLowerCase() },
			{ id: this.uppercasePlanetID(planetID) }
		]});
		return planetQuery.name;
	};
	async idArgs(args: string []):Promise<queryValue> {
		const queryValues: queryValue = {};
		await this.asyncForEach(args, async value => {
			const identified = await this.id(value);
			if(identified) {
				if(queryValues[identified.type]) {
					queryValues[identified.type].push(identified.value);
				}
				else {
					queryValues[identified.type] = [identified.value];
				}
			}
		});
		return queryValues;
	}
	async id(value: string): Promise<idReturn> {
		const returned: idReturn = {
			"type": null,
			"value": null
		};

		if(value === undefined) return returned;

		return new Promise(async (resolve) => {
			let searchPlanet: Planet;
			let searchMat: Material;
			let searchUsers: User;

			try {
				searchPlanet = await this.con.manager.getRepository(Planet).findOne({where: [
					{ truncatedName: value.toLowerCase() },
					{ id: this.uppercasePlanetID(value) }
				]});
				searchMat = await this.con.manager.getRepository(Material).findOne({where: {ticker: value.toLowerCase()}});
				searchUsers = await this.con.manager.getRepository(User).findOne({ where: [
					{ name: Like(value) },
					{ id: value }
				]});
			}
			catch(e) {
				console.log(e);
				console.log(value);
			}

			if(value.match(/<@!*(\d{10,})>/) !== null) {
				try{
					searchUsers = await this.con.manager.getRepository(User).findOne({ where: { id: value.match(/\d{10,}/) }});
				}
				catch(e) {
					console.log(e);
					console.log(value);
				}
			}

			if (searchPlanet) {
				returned.type = 'planet';
				returned.value = searchPlanet;
			}
			else if (searchUsers) {
				returned.type = 'user';
				returned.value = searchUsers;
			}
			else if (value.match(/<@!*(\d{10,})>/) !== null) {
				returned.type = 'discord_mention';
				returned.value = value;
			}
			else if(value.match(/^\d+\.*\d*$/) !== null) {
				returned.type = 'number';
				returned.value = value;
			}
			else if (searchMat) {
				returned.type = 'material';
				returned.value = searchMat;
			}
			resolve(returned);
		});
	};
	/**
	 * queryPrint
	 */
	public queryPrint(qV: queryValue):  string {
		let queryString: string = '';

		if(qV.material) {
			queryString += 'Materials:(';
			queryString += `${qV.material.shift().ticker}`;
			qV.material.forEach(material => {
				queryString += `, ${material.ticker}`;
			});
			queryString += ') ';
		}

		if(qV.planet) {
			queryString += 'Planets:(';
			queryString += `${qV.planet.shift().name}`;
			qV.planet.forEach(planet => {
				queryString += `, ${planet.name}`;
			});
			queryString += ') ';
		}

		if(qV.user) {
			queryString += 'Users:(';
			queryString += `${qV.user.shift().name}`;
			qV.user.forEach(u => {
				queryString += `, ${u.name}`;
			});
			queryString += ') ';
		}

		return queryString;
	}
	/**
	 * Swaps the key/value pairs of the array
	 * @param {Array} json swaps the key/value pairs of the array
	 * @returns {Array} the swapped array
	 */
	swap(json) {
		const ret = {};
		for(const key in json) {
			if (json.hasOwnProperty(key)) {
				ret[json[key]] = key;
			}
		}
		return ret;
	};
	/**
	 * @callback get_pricesCallback
	 * @param {number} value
	 * @param {string} terms
	 */
	/**
	 * Gets the prices for the specified planet/user/material. Returns the value and terms if applicable through a callback.
	 * @param {import("mysql").Connection} con mysql connection
	 * @param {string} planet planet ID string
	 * @param {number} user database userid
	 * @param {string} mat material Identifier
	 * @param {get_pricesCallback} callback callback with prices and terms
 	*/
	get_prices(con, planet, user, mat, callback) {
		con.query(
			`SELECT * FROM corp_price WHERE mat = '${mat}' AND (planet = '${planet}' OR planet = '*global') AND userid = '${user}' ORDER BY planet DESC`,
			function(err, result) {
				if (err) {
					return null;
				}
				else if (result.length === 0) {
					callback(null);
				}
				else {
					const value = result[0].price;
					const terms = result[0].terms ? result[0].terms : '';
					callback(value, terms);
				}
			});
	};
};