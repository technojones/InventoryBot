let https = require('https');

module.exports = {
	getStorage: function(token, callback) {

		const options = {
			hostname: 'rest.fnar.net',
			path: '/storage/technojones',
			method: 'GET',
			headers: {
				'Authorization': token,
			},
		};

		const req = https.request(options, (res) => {
			let str = '';
			// console.log(`STATUS: ${res.statusCode}`);
			// console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
			res.setEncoding('utf8');
			res.on('data', (chunk) => {
				str += chunk;
			});
			res.on('end', () => {
				str = JSON.parse(str);
				callback(str);
			});
		});

		req.on('error', (e) => {
			console.log(e);
			callback(`problem with request: ${e.message}`);
		});

		// Write data to request body
		req.end();
	},
	getSites: function(token, callback) {

		const options = {
			hostname: 'rest.fnar.net',
			path: '/sites/technojones',
			method: 'GET',
			headers: {
				'Authorization': token,
			},
		};

		const req = https.request(options, (res) => {
			let str = '';
			// console.log(`STATUS: ${res.statusCode}`);
			// console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
			res.setEncoding('utf8');
			res.on('data', (chunk) => {
				str += chunk;
			});
			res.on('end', () => {
				str = JSON.parse(str);
				callback(str);
			});
		});

		req.on('error', (e) => {
			console.log(e);
			callback(`problem with request: ${e.message}`);
		});

		// Write data to request body
		req.end();
	},
	requestP: function(token, path) {
		return new Promise((resolve, reject) => {
			const options = {
				hostname: 'rest.fnar.net',
				path: path,
				method: 'GET',
				headers: {
					'Authorization': token,
				},
			};

			const req = https.request(options, (res) => {
				let str = '';
				// console.log(`STATUS: ${res.statusCode}`);
				// console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
				res.setEncoding('utf8');
				res.on('data', (chunk) => {
					str += chunk;
				});
				res.on('end', () => {
					// console.log(str);
					if(res.statusCode == 200) {
						let str2;
						try {
							str2 = JSON.parse(str);
						}
						catch (error) {
							console.log(error);
							console.log(options);
							// console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
							console.log(`STATUS: ${res.statusCode}`);
							// console.log(str);
							return reject(error);
						}
						resolve(str2);
					}
					else if(res.statusCode == 204) {
						console.log(options);
						console.log(`STATUS: ${res.statusCode}`);
						return reject('204: User may not have storage data.');
					}
					else if(res.statusCode == 502) {
						return reject('502: Bad Gateway. Server may be down, try again later');
					}
					else if(res.statusCode == 401) {
						return reject('401: Authentication error. Please double check that storage and site permissions are set');
					}
				});
			});

			req.on('error', (e) => {
				console.log(e);
				reject(`problem with request: ${e.message}`);
			});

			// Write data to request body
			req.end();
		});
	},
};
