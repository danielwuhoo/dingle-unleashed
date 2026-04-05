import { readdir } from 'fs/promises';
import ButtonCommand from '../interactions/ButtonCommand';

export default class ButtonCommandRepository {
    public commands: { [name: string]: ButtonCommand };

    public constructor() {
        this.commands = {};
    }

    public async init(): Promise<void> {
        try {
            const allFiles: string[] = await readdir(`${__dirname}/../interactions/buttonCommands`);
            const files = allFiles.filter((f) => f.endsWith('.js') || f.endsWith('.ts'));
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
