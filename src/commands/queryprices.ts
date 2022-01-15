import { Message, Util } from "discord.js";
import { Connection } from "typeorm";
import { Command, Execute } from "../classes/Command";
import Functions from "../classes/functions";
import Prices from "../classes/prices";
import { Corp } from "../entity/Corp";
import { Planet } from "../entity/Planet";
import { Price } from "../entity/Price";
import { User, UserRole } from "../entity/User";
import { queryValue } from "../types/queryValue";

import winston = require("winston");
import { PlanetNickname } from "../entity/PlanetNickname";

const logger = winston.loggers.get('logger')

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


		const queryValues:queryValue = await f.idArgs(args[0], corp);
		let databaseResults: Price[];
        const globalPlanet: Planet = {name: 'Global', truncatedName: 'global', id: '*global'};

		if(args[0].length === 0) queryValues.user = [user];
        else if(queryValues.planet) queryValues.planet.push(globalPlanet);

        if(!queryValues.material && !queryValues.planet && !queryValues.user) {
            return message.channel.send('No queryable values found.');
        }
		const nicknames = connection.manager.getRepository(PlanetNickname).find({where: {corp}});
        prc.queryPrices(queryValues, corp)
            .then((result) => {
                databaseResults = result;
                // parse a new message with the results
                return new Promise<string[]>(async (resolve) => {
                    const messageContents: string[] = [];
                    if (databaseResults.length === 0) {
                        // if no results in the database, return a message indicating as such.
                        messageContents.push('No results found for the given input');
                        resolve(messageContents);
                    }
                    else {
                        // if there are results, sort through them
                        let lastGroup;
                        const length = databaseResults.length;
						const resolvedNicknames = await nicknames;
                        databaseResults.forEach(async (item, index) => {
                            // for every item, get the price and terms. This also catagorizes the results by user, adding a header at each new user encountered.
                            let planet = item.planet.name;

							// find nicknames for planets that are not named
							if(planet.match(/^\w{2}[-]\d{3}\w/)) {
								const foundNickname = resolvedNicknames.find(i => i.planet.id === planet);
								if(foundNickname) {
									planet = foundNickname.nickname;
									planet += `(${item.planet.id})`;
									item.planet.name = planet;
								}
							}

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
                            thisLine += (item.material.ticker.padStart(3, ' ') + ' at ₡' + String(item.price).padEnd(5, ' '));
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
                const splitMessage = Util.splitMessage(result.join('\n'));

				splitMessage.forEach(m => {
					message.channel.send(m);
				});
            }).catch(function(error) {
                // catch any errors that pop up.
                message.channel.send('Error! ' + error);
                logger.error('Prices promise error', {messageID: message.id, messageGuild: message.channel.type !== "DM" ? message.guild.id : "DM", user, args, error});
            });
	};
};