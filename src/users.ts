import * as types from './types';
const users: types.User[] = [];

module.exports = {
	users,
	updateUsers(con) {
		return new Promise<void>((resolve) => {
			con.query(
				'SELECT * FROM users',
				function(err, userResult) {
					if (err) {
						return null;
					}
					else {
						userResult.forEach(function(item) {
							const thisUser: types.User = {
								"id": item.idusers,
								"user": item.user,
								"discord": item.discord,
								"discordID": item.discord_id,
								"companyID": item.company_id,
								"fioUsername": item.fio_username,
							};
							users[item.idusers] = thisUser;
						});
						resolve();
					}
				});
		});
	},
	updateAndReturnUsers(con, callback) {
		con.query(
			'SELECT * FROM users',
			function(err, userResult) {
				if (err) {
					return null;
				}
				else {
					userResult.forEach(function(item) {
						const thisUser: types.User = {
							"id": item.idusers,
							"user": item.user,
							"discord": item.discord,
							"discordID": item.discord_id,
							"companyID": item.company_id,
							"fioUsername": item.fio_username,
						};
						users[item.idusers] = thisUser;
					});
					callback(users);
				}
			});
	},
	searchUsers(discordID: number): types.User | null {
		let result: types.User | null = null;
		users.forEach(function(item) {
			if (item.discordID === discordID) {
				result = item;
			}
		});
		return result;
	},
	searchUsername (username: string): types.User | null {
		let result: types.User | null = null;
		users.forEach(function(item) {
			if (item.user.toLowerCase() === username.toLowerCase()) {
				result = item;
			}
		});
		return result;
	},
	searchFIOUsername(username: string):types.User | null {
		let result: types.User | null = null;
		users.forEach(function(item) {
			if (item.fioUsername === username) {
				result = item;
			}
		});
		return result;
	},
	isFIOUser(userid):boolean {
		return users[userid].fioUsername !== null;
	},
	returnFIO(): types.User[] {
		const result = [];
		users.forEach(function(item) {
			if(item.fioUsername !== null) {
				result.push(item.fioUsername);
			}
		});
		return result;
	},
	FIO_ids():number[] {
		const result = [];
		users.forEach(function(item) {
			if(item.fioUsername!==null) {
				result.push(item.id);
			}
		});
		return result;
	},
	nonFIO_ids():number[] {
		const result = [];
		users.forEach(function(item) {
			if(item.fioUsername === null) {
				result.push(item.id);
			}
		});
		return result;
	},
};