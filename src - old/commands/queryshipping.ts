module.exports = {
	name: 'queryshipping',
	description: 'Command to add a user to the database',
	args: true,
    aliases: ['qs'],
	usage: '<3 Letter Company ID> <User Name> <Discord mention> <Is FIO User? [true/yes/fio will add to FIO list]>',
    execute(message, args, con) {
        const functions = require('../functions.js');

        let to;
        let from;
        const queryValues = [];

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
                        to = split[0].value;
                        from = split[1].value;
                    }
                }
            }
            else if (value.includes(':')) {
                const split = value.split(':');
                if(split[0]==='to') {
                    to = split[1];
                }
                else if (split[0]==='from') {
                    from = split[1];
                }
            }
		});

        let queryString;
        let queryArray;

        if(to && from) {
            queryString = 'SELECT * FROM shipping WHERE ship_to = ? AND ship_from = ? ORDER BY timestamp';
            queryArray = [to, from];
        }
        else if (to) {
            queryString = 'SELECT * FROM shipping WHERE ship_to = ? ORDER BY timestamp';
            queryArray = [to];
        }
        else if (from) {
            queryString = 'SELECT * FROM shipping WHERE ship_from = ? ORDER BY timestamp';
            queryArray = [from];
        }
        else {
            return message.channel.send('To/from fields not found');
        }
        con.query(
            queryString,
            queryArray,
            function(err, result) {
                if(err) console.log(err);
                else console.log(JSON.stringify(result));
            });

    },
};