import { AudioResource } from '@discordjs/voice';

export default abstract class Track {
    readonly query: string;

    public title: string;

    public thumbnailUrl: string;

    public duration: number;

    public isInitialized: boolean;

    readonly onStart: () => void;

    readonly onFinish: () => void;

    readonly onError: (error: Error) => void;

    constructor(query: string) {
        this.query = query;
    }

    abstract createAudioResource(): Promise<AudioResource<Track>>;

    abstract init(): Promise<void>;
}
