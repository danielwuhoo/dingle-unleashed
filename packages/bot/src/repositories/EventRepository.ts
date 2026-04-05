import { readdir } from 'fs/promises';
import { Event } from '../common/types';

export default class EventRepository {
    public events: Event[];

    public constructor() {
        this.events = [];
    }

    public async init(): Promise<void> {
        try {
            const allFiles: string[] = await readdir(`${__dirname}/../events`);
            const files = allFiles.filter((f) => f.endsWith('.js') || f.endsWith('.ts'));
            this.events = (await Promise.all(files.map((file) => import(`../events/${file}`)))).map(
                (event) => event.default,
            );
        } catch (err) {
            console.error(err);
        }
    }
}
