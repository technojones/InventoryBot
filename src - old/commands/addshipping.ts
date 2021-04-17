module.exports = {
	name: 'addshipping',
	description: 'Command to add a user to the database',
	args: true,
    aliases: ['as'],
	usage: '<3 Letter Company ID> <User Name> <Discord mention> <Is FIO User? [true/yes/fio will add to FIO list]>',
    execute(message, args, con) {
        const users = require('../users.js');
        const functions = require('../functions.js');

        let userID = users.searchUsers(message.author.id);
			if(userID) {
				userID = userID.id;
			}
			else {
				return message.channel.send('**ERROR!** could not find user');
			}

        console.log('Adding Shipping Entry')
        let to;
        let from;
        const queryValues: any = {};
        args.forEach(function(value) {
			const identified = functions.id(value);
			if(identified) {
				queryValues[identified.type] = identified.value;
			}
            else if(value.includes('->')) {
                const split = value.split('->');
                split[0] = functions.id(split[0]);
                split[1] = functions.id(split[1]);
                if(split[1] && split[0]) {
                    if((split[0].type!=='planet') || (split[1].type!=='planet')) {
                        return message.channel.send('Improperly formatted planets found')
                    }
                    else {
                        from = split[0].value;
                        to = split[1].value;
                    }
                }
            }
		});
        const messageContents = [];
        const ts = Date.now();
        con.query(
            'INSERT INTO shipping(userid, ship_to, ship_from, mat, quantity, timestamp) VALUES (?, ?, ?, ?, ?, ?)', [
                userID,
                to,
                from,
                queryValues.material,
                queryValues.number,
                ts,
            ], function(err) {
                if(err) {
                    return message.channel.send('Database Error: ' + err.sqlMessage)
                }
                messageContents.push('Added Shipping Availability:');
                messageContents.push('Material: ' + queryValues.material);
                messageContents.push('Quantity: ' + queryValues.number);
                messageContents.push('From: ' + functions.planetName(from));
                messageContents.push('To: ' + functions.planetName(to));
                message.channel.send(messageContents);
            });
    },
};