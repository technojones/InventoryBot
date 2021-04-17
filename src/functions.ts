
// tslint:disable-next-line: no-var-requires
const users = require('./users.js');
import newPlanetLookup = require('./commands/planets.json');
import matLookup = require('./commands/materials.json');
import * as types from './types';

type identifiedType = "planet" | "user_id" | "number" | "material" | "user" | "user_id" | "discord_mention" | null;
/*
REGEX for PrUn Materials and planets
Planets: /^\w{2}[-]\d{3}\w/
Materials: /^\w{1,3}$/
Numbers: /^\d+$/
*/
module.exports = {
	uppercasePlanetID(planetID: string) {
		if(planetID.match(/^\w{2}[-]\d{3}\w/)) {
			return(planetID.slice(0, 2).toUpperCase() + planetID.slice(2));
		}
		else if (planetID.match(/^\w{1,3}$/)) {
			return(planetID.toUpperCase());
		}
		else {
			return(planetID.slice(0, 2).toUpperCase() + planetID.slice(2));
		}
	},
	/**
	 * Identifies the type of the value passed
	 * @param {String} value the value to be identified
	 * @returns {String|null} the type of the passed value - 'planet lookup', 'number', 'material', or 'planet'. Returns null if none of the above.
 	*/
	id_old(value: string): string | null {
		if(value === undefined) return null;
		if(newPlanetLookup.find(element => element.PlanetName.toLowerCase===value.toLowerCase)) {
			return 'planet lookup';
		}
		else if(value.match(/^\d+$/) !== null) {
			return 'number';
		}
		else if (value.match(/^\w{1,3}$/) !== null) {
			return 'material';
		}
		else if (value.match(/^\w{2}[-]\d{3}\w/) !== null) {
			return 'planet';
		}
		else {
			return null;
		}
	},
	/**
	 * Identifies the type of the value passed
	 * @param {String} value the value to be identified
	 * @returns {Object|null} the type of the passed value (.type) and a coerced value (.value). Options for .type are 'number', 'material', 'planet', 'user', 'user_id'. Returns null if none of the above.
	 */
	planetName(planetID) {
		return newPlanetLookup.find(element => element.PlanetNaturalId.toLowerCase()===planetID.toLowerCase()).PlanetName;
	},
	id(value: string): object | null {
		const returned: {
			type: types.identifiedType,
			value: string | number | null
		} = {
			"type": null,
			"value": null
		};

		if(value === undefined) return null;
		let searchName;
		let searchID;
		let searchMat;
		try {
			searchName = newPlanetLookup.find(element => element.PlanetName.toLowerCase()===value.toLowerCase());
			searchID = newPlanetLookup.find(element => element.PlanetNaturalId.toLowerCase()===value.toLowerCase());
			searchMat = matLookup.find(element => element.Ticker.toLowerCase()===value.toLowerCase());
		}
		catch(e) {
			console.log(e);
			console.log(value);
		}
		if(searchName) {
			returned.value = searchName.PlanetNaturalId;
			returned.type = 'planet';
		}
		else if (searchID) {
			returned.type = 'planet';
			returned.value = this.uppercasePlanetID(value);
		}
		else if (users.searchUsers(value) !== null) {
			returned.type = 'user_id';
			returned.value = users.searchUsers(value);
		}
		else if (users.searchUsername(value) !== null) {
			returned.type = 'user';
			returned.value = users.searchUsername(value);
		}
		else if (value.match(/<@!*(\d{10,})>/) !== null) {
			returned.type = 'discord_mention';
			returned.value = value;
		}
		else if(value.match(/^\d+$/) !== null) {
			returned.type = 'number';
			returned.value = value;
		}
		else if (searchMat) {
			returned.type = 'material';
			returned.value = value.toUpperCase();
		}
		else {
			return null;
		}
		return returned;
	},
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
	},
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
	},
};