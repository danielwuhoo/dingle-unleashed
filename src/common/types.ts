export interface Config {
    token: string;
    clientId: string;
    guildId: string;
}

export interface Event {
    name: string;
    callback: (...args: unknown[]) => void;
}
