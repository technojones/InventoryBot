let https = require('https');
const matLookup = require('../commands/materials.json');

	const getMarket = function(ticker) {
	return new Promise((resolve, reject) => {

		const options = {
			hostname: 'rest.fnar.net',
			path: `/exchange/${ticker}`,
			method: 'GET',
			headers: {

			},
		};

		const req = https.request(options, (res) => {
			let str = '';
			// console.log(`STATUS: ${res.statusCode}`);
			// console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
			res.setEncoding('utf8');
			res.on('data', (chunk) => {
				str += chunk;
				// console.log(str);
			});
			res.on('end', () => {
				if (res.statusCode == 204) {
					reject('Ticker could not be found');
				}
				try {
					str = JSON.parse(str);
				}
				catch(e) {
					reject(e);
				}
				resolve(str);
			});
		});

		req.on('error', (e) => {
			console.log(e);
			reject(`problem with request: ${e.message}`);
		});

		// Write data to request body
		req.end();
	});
	};

let roundOff = (num, places) => {
	places ? places : 2;
	const x = Math.pow(10, places);
	return Math.round(num * x) / x;
};

module.exports = {
	getMarket: getMarket,
	getInfo: function(message, arg) {
		let cx = null;
		let ticker = null;
		if(arg.includes('.')) {
			cx = arg.split('.')[1];
			ticker = arg.split('.')[0];
		}
		else {
			ticker = arg;
		}
		if(!matLookup.find(element => element.Ticker.toLowerCase() == ticker.toLowerCase())) {
			message.channel.send('No valid material found.');
		}
		else {
			cx = cx ? cx : 'CI1';
			getMarket(`${ticker}.${cx}`).then(function(marketResults) {
				let messageContents = [];
				let marketDifference = marketResults.Price - marketResults.Previous;
				messageContents.push(`**Market Results for ${marketResults.MaterialTicker}.${marketResults.ExchangeCode}**`);
				messageContents.push('`' + `Price: ${roundOff(marketResults.Price, 2)} (${(marketDifference >= 0) ? '+' : ''}${roundOff(marketDifference, 2)})` + '`');
				messageContents.push('`' + `Price Average: ${roundOff(marketResults.PriceAverage, 2)}` + '`');
				messageContents.push('`' + `Ask: ${roundOff(marketResults.Ask, 2)} (${marketResults.AskCount})${(marketResults.Ask === marketResults.MMSell && marketResults.MMSell) ? ' (MM)' : ''}` + '`');
				messageContents.push('`' + `Bid: ${roundOff(marketResults.Bid, 2)} (${marketResults.BidCount})${(marketResults.Bid === marketResults.MMBuy && marketResults.MMBuy) ? '(MM)' : ''}` + '`');
				message.channel.send(messageContents);
			}).catch(function(error) {
				message.channel.send(error);
			});
		}
	},
};
