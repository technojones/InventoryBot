import * as Discord from 'discord.js';

export class YFDiscordClient extends Discord.Client {
    private _commands: Discord.Collection<string, any>;
    public get commands(): Discord.Collection<string, any> {
        return this._commands;
    }
    public set commands(newCommands: Discord.Collection<string, any>) {
        this._commands = newCommands;
    }
}