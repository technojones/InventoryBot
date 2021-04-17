const yellowFinId = '704907707634941982';
let yellowFin;
let roles = {
	'1\uFE0F\u20E3': 'Agriculture',
	'2\uFE0F\u20E3': 'Chemistry',
	'3\uFE0F\u20E3': 'Construction',
	'4\uFE0F\u20E3': 'Electronics',
	'5\uFE0F\u20E3': 'Food Industries',
	'6\uFE0F\u20E3': 'Fuel Refining',
	'7\uFE0F\u20E3': 'Manufacturing',
	'8\uFE0F\u20E3': 'Metallurgy',
	'9\uFE0F\u20E3': 'Resource Extraction',
	'0\uFE0F\u20E3': 'Clear All',
};

module.exports = {
	name: 'roles',
	description: 'Role Manager',
	args: false,
	usage: '',
	execute(message, args, con, client) {
		console.log(roles);
		const roleMessage = [];
		Object.entries(roles).forEach(function(item) {
			roleMessage.push(item[0] + ' ' + item[1]);
			// console.log();
			// console.log(value);
		});
		roleMessage.unshift('React to provide the appropiate role');
		message.channel.send(roleMessage)
			.then(function(sentMessage) {
				Object.keys(roles).forEach(function(key) {
					sentMessage.react(key);
				});
			});
		client.guilds.fetch(yellowFinId)
			.then(function(guild) {
				yellowFin = guild;
				return guild.roles.fetch();
			})
			.then(function(discordRoles) {
				console.log(`There are ${discordRoles.cache.size} roles.`);
				discordRoles.cache.forEach(element => {
					// console.log(element.name + element.id);
				});
				return yellowFin.members.fetch(message.author.id);
			})
			.then(function(user) {
				//  console.log(user);
				user.roles.add('809490514743001128')
					.catch(function(error) { console.log(error); });
			})
			.catch(console.error);

	},
};