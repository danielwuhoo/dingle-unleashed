import { readdir } from 'fs/promises';
import { dirname } from 'path';
import { singleton } from 'tsyringe';
import { fileURLToPath } from 'url';
import ButtonCommand from '../interactions/ButtonCommand';

@singleton()
export default class ButtonCommandRepository {
    public commands: { [name: string]: ButtonCommand };

    public constructor() {
        this.commands = {};
    }

    public async init(): Promise<void> {
        try {
            const files: string[] = await readdir(
                `${dirname(fileURLToPath(import.meta.url))}/../interactions/buttonCommands`,
            );
            this.commands = (await Promise.all(files.map((file) => import(`../interactions/buttonCommands/${file}`))))
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

    public getCommand(name: string): ButtonCommand {
        return this.commands[name];
    }
}
