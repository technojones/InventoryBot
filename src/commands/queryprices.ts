import { Message } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import Functions from "../classes/functions";
import Prices from "../classes/prices";
import { Corp } from "../entity/Corp";
import { Planet } from "../entity/Planet";
import { Price } from "../entity/Price";
import { User, UserRole } from "../entity/User";
import { queryValue } from "../types/queryValue";

function FIOUserFilter(arr, query) {
	return arr.filter(function(item) {
		return item.userid === query;
	});
}

export default class QueryPrices implements Command {
    permissions: UserRole = UserRole.USER;
    category = 'Pricing';
	name: string= 'queryprices';
	description: string = 'Use this Command to query prices. You can provide any combination of materials, planets, and usernames, and multiple of each if desired. If nothing is specified, it will return all of your price listings.';
	args: boolean = false;
    needCorp: boolean = true;
	aliases: string[] = ['queryp', 'queryprice', 'qp'];
	usage: string ='<planet> and/or <mat> - can search for multiple values. If left blank, will return all of your price data';
	execute: Execute = async (message: Message, args: string[][], connection: Connection, user: User, corp: Corp | null) => {
        const f = new Functions(connection);
        const prc = new Prices();


		const queryValues:queryValue = await f.idArgs(args[0]);
		let databaseResults: Price[];
        const globalPlanet: Planet = {name: 'Global', truncatedName: 'global', id: '*global'};

		if(args[0].length === 0) queryValues.user = [user];
        else if(queryValues.planet) queryValues.planet.push(globalPlanet);

        if(!queryValues.material && !queryValues.planet && !queryValues.user) {
            return message.channel.send('No queryable values found.');
        }

        prc.queryPrices(queryValues, corp)
            .then((result) => {
                databaseResults = result;
                console.log('Inventory lines returned: ' + databaseResults.length);
                // parse a new message with the results
                return new Promise((resolve) => {
                    const messageContents = [];
                    if (databaseResults.length === 0) {
                        // if no results in the database, return a message indicating as such.
                        messageContents.push('No results found for the given input');
                        resolve(messageContents);
                    }
                    else {
                        // if there are results, sort through them
                        let lastGroup;
                        const length = databaseResults.length;
                        databaseResults.forEach(async (item, index) => {
                            // for every item, get the price and terms. This also catagorizes the results by user, adding a header at each new user encountered.
                            const planet = item.planet.name;
                            let groupBy;
                            if(queryValues.planet) {
                                groupBy = 'user';
                            }
                            else {
                                groupBy = 'planet';
                            }

                            if (lastGroup!==item[groupBy].name) {
                                // if the user is different, add the header.
                                messageContents.push('**' + item[groupBy].name + '**');
                            }
                            let thisLine = ('` ' );
                            // then material name and price
                            thisLine += (item.material.ticker + ' at ₡' + item.price);
                            // if the grouping is not by planet, specify the planet.
                            if(groupBy!=='planet') thisLine += (' on ' + planet);
                            // if the grouping is not by user, specify the user
                            if(groupBy!=='user') thisLine += (' from ' + item.user.name);
                            // add the price if it exists
                            thisLine += '`';
                            messageContents.push(thisLine)

                            lastGroup = item[groupBy].name;
                            // if this is the last item in the list, resolve the contents.
                            if (index===(length - 1)) {
                                resolve(messageContents);
                            }

                        });
                    }
                });
            }).then((result) => {
                // send the message containing the results
                message.channel.send(result, { split: true });
            }).catch(function(error) {
                // catch any errors that pop up.
                message.channel.send('Error! ' + error);
                console.log(error);
            });
	};
};