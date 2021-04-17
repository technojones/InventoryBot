let users = [];
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
							let this_user = {};
							this_user['id'] = item.idusers;
							this_user['user'] = item.user;
							this_user['discord'] = item.discord;
							this_user['discordID'] = item.discordID;
							this_user['companyID'] = item.companyID;
							this_user['fioUsername'] = item.fioUsername;
							users[item.idusers] = this_user;
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
						let this_user = {};
						this_user['id'] = item.idusers;
						this_user['user'] = item.user;
						this_user['discord'] = item.discord;
						this_user['discordID'] = item.discordID;
						this_user['companyID'] = item.companyID;
						this_user['fioUsername'] = item.fioUsername;
						users.push(this_user);
					});
					callback(users);
				}
			});
	},
	searchUsers(discordID) {
		let result = null;
		users.forEach(function(item) {
			if (parseInt(item['discordID'])===discordID) {
				result = item;
			}
		});
		return result;
	},
	searchUsername(username) {
		let result = null;
		users.forEach(function(item) {
			if (item['user'].toLowerCase() === username.toLowerCase()) {
				result = item;
			}
		});
		return result;
	},
	searchFIOUsername(username) {
		let result = null;
		users.forEach(function(item) {
			if (item['fioUsername'] === username) {
				result = item;
			}
		});
		return result;
	},
	isFIOUser(userid) {
		return users[userid]['fioUsername']!==null;
	},
	returnFIO() {
		let result = [];
		users.forEach(function(item) {
			if(item.fioUsername!==null) {
				result.push(item.fioUsername);
			}
		});
		return result;
	},
	FIO_ids() {
		let result = [];
		users.forEach(function(item) {
			if(item.fioUsername!==null) {
				result.push(item.id);
			}
		});
		return result;
	},
	nonFIO_ids() {
		let result = [];
		users.forEach(function(item) {
			if(item.fioUsername===null) {
				result.push(item.id);
			}
		});
		return result;
	},
};