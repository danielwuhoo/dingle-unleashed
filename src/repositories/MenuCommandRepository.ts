import { readdir } from 'fs/promises';
import { singleton } from 'tsyringe';
import { Routes } from 'discord-api-types/v9';
import { REST } from 'discord.js';
import { Config } from '../common/types';
import MenuCommand from '../interactions/MenuCommand.js';

@singleton()
export default class MenuCommandRepository {
    public commands: { [name: string]: MenuCommand };

    public constructor() {
        this.commands = {};
    }

    public async init(): Promise<void> {
        try {
            const files: string[] = await readdir(`${__dirname}/../interactions/menuCommands`);
            this.commands = (await Promise.all(files.map((file) => import(`../interactions/menuCommands/${file}`))))
                .map((command) => command.default)
                .reduce((commands, command) => {
                    // eslint-disable-next-line new-cap
                    const newCommand = new command();
                    return { ...commands, [newCommand.name]: newCommand };
                }, {});
        } catch (err) {
            console.error(err);
        }
    }

    // eslint-disable-next-line class-methods-use-this
    public async registerCommands(config: Config): Promise<void> {
        const rest = new REST({ version: '9' }).setToken(config.token);
        try {
            console.log('Started refreshing application (/) commands.');

            await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
                body: Object.values(this.commands).map((command) => command.toJSON()),
            });

            console.log('Successfully reloaded application (/) commands.');
        } catch (err) {
            console.error(err);
        }
    }

    public getCommand(name: string): MenuCommand {
        return this.commands[name];
    }
}
