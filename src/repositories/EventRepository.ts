import { readdir } from 'fs/promises';
import { dirname } from 'path';
import { singleton } from 'tsyringe';
import { fileURLToPath } from 'url';
import { Event } from '../common/types';

@singleton()
export default class EventRepository {
    public events: Event[];

    public constructor() {
        this.events = [];
    }

    public async init(): Promise<void> {
        try {
            const files: string[] = await readdir(`${dirname(fileURLToPath(import.meta.url))}/../events`);
            this.events = (await Promise.all(files.map((file) => import(`../events/${file}`)))).map(
                (event) => event.default,
            );
        } catch (err) {
            console.error(err);
        }
    }
}
