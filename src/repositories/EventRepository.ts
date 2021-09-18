import { readdir } from 'fs/promises';
import { singleton } from 'tsyringe';
import { Event } from '../common/types';

@singleton()
export default class EventRepository {
    public events: Event[];

    public constructor() {
        this.events = [];
    }

    public async init(): Promise<void> {
        try {
            const files: string[] = await readdir(`${__dirname}/../events`);
            this.events = (await Promise.all(files.map((file) => import(`../events/${file}`)))).map(
                (event) => event.default,
            );
        } catch (err) {
            console.error(err);
        }
    }
}
