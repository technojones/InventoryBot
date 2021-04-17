const queryLookup = {
	'material': 'mat',
	'planet': 'planet',
	'user': 'userid',
	'user_id': 'userid',
};

module.exports = {
	invMat(con, mat) {
		return new Promise((resolve, reject) => {
			con.query(
				'SELECT * FROM inventory WHERE mat = ? ORDER BY planet, userid', [
					mat,
				],
				function(err, result) {
					if(err) reject(err);
					else resolve(result);
				});
		});
	},
	invPlanet(con, planet) {
		return new Promise((resolve, reject) => {
			con.query(
				'SELECT * FROM inventory WHERE planet = ? ORDER BY userid, mat', [
					planet,
				],
				function(err, result) {
					if(err) reject(err);
					else resolve(result);
				});
		});
	},
	invMatAndPlanet(con, mat, planet) {
		return new Promise((resolve, reject) => {
			con.query(
				'SELECT * FROM inventory WHERE mat = ? AND planet = ? ORDER BY userid', [
					mat,
					planet,
				],
				function(err, result) {
					if(err) reject(err);
					else resolve(result);
				});
		});
	},
	invQuery(con, queryValues) {
		console.log(queryValues);
		let queryString = 'SELECT * FROM inventory WHERE';
		let first = true;
		const values = [];

		for (const property in queryValues) {
			if (queryValues.hasOwnProperty(property)) {
				console.log(`${property}: ${queryValues[property]}`);
			}
		}
		for(let index in queryValues) {
			if(queryValues.hasOwnProperty(index)) {
				const element = queryValues[index];
				index = queryLookup[index];
				if(index) {
					// if the argument isn't the first in the list, add an 'AND' between the queries
					if(!first) {queryString += ' AND';}
					// the next argument won't be the first
					first = false;
					if(Array.isArray(element)) {
						let first2 = true;
						queryString += '(';
						element.forEach(function(item) {
							if(!first2) {queryString += ' OR';}
							first2 = false;
							queryString += (' ' + index + ' = ?');
							// push the query value to the list of arguments
							if(index==='userid') {
								// if the value we need is a user id, pull it from the user object passed from the identify function
								values.push(item.id);
							}
							else {
								values.push(item);
							}
						});
						queryString += ')';
					}
					else {
						// add the query catagory to the string
						queryString += (' ' + index + ' = ?');

						// push the query value to the list of arguments
						if(index==='userid') {
							// if the value we need is a user id, pull it from the user object passed from the identify function
							values.push(element.id);
						}
						else {
							values.push(element);
						}
					}
				}
			}
		}
		queryString += ' ORDER BY planet, userid, mat';
		console.log(queryString);
		console.log(values);

		return new Promise((resolve, reject) => {
			con.query(
				queryString,
				values,
				function(err, result) {
					if(err) reject(err);
					else resolve(result);
				});
		});
	},
	demandQuery(con, queryValues) {
		console.log(queryValues);
		let queryString = 'SELECT * FROM demand WHERE';
		let first = true;
		const values = [];

		for (const property in queryValues) {
			if(queryValues.hasOwnProperty(property)) {
				console.log(`${property}: ${queryValues[property]}`);
			}
		}
		for(let index in queryValues) {
			if(queryValues.hasOwnProperty(index)) {
				const element = queryValues[index];
				index = queryLookup[index];
				if(index) {
					// if the argument isn't the first in the list, add an 'AND' between the queries
					if(!first) {queryString += ' AND';}
					// the next argument won't be the first
					first = false;
					if(Array.isArray(element)) {
						let first2 = true;
						queryString += '(';
						element.forEach(function(item) {
							if(!first2) {queryString += ' OR';}
							first2 = false;
							queryString += (' ' + index + ' = ?');
							// push the query value to the list of arguments
							if(index==='userid') {
								// if the value we need is a user id, pull it from the user object passed from the identify function
								values.push(item.id);
							}
							else {
								values.push(item);
							}
						});
						queryString += ')';
					}
					else {
						// add the query catagory to the string
						queryString += (' ' + index + ' = ?');

						// push the query value to the list of arguments
						if(index==='userid') {
							// if the value we need is a user id, pull it from the user object passed from the identify function
							values.push(element.id);
						}
						else {
							values.push(element);
						}
					}
				}
			}
		}
		/*
		entries.forEach(function([index, element]) {
			console.log(`[${index}] ${element}`);
			index = queryLookup[index];
			if(index) {
				// if the argument isn't the first in the list, add an 'AND' between the queries
				if(!first) {queryString += ' AND'}
				// the next argument won't be the first
				first = false;
				// add the query catagory to the string
				queryString += (' ' + index + ' = ?')
				// push the query value to the list of arguments
				if(index==='userid') {
					// if the value we need is a user id, pull it from the user object passed from the identify function
					values.push(element.id);
				}
				else {
					values.push(element);
				}
			}
		});
		*/
		queryString += ' ORDER BY planet, userid, mat';
		console.log(queryString);
		console.log(values);

		return new Promise((resolve, reject) => {
			con.query(
				queryString,
				values,
				function(err, result) {
					if(err) reject(err);
					else resolve(result);
				});
		});
	},
};