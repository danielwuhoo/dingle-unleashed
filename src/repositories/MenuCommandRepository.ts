import { readdir } from 'fs/promises';
import { singleton } from 'tsyringe';
import MenuCommand from '../interactions/MenuCommand';

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
    public async registerCommands(): Promise<void> {
        // TODO: implement for non slash commands
    }

    public getCommand(name: string): MenuCommand {
        return this.commands[name];
    }
}
