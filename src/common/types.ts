export interface Config {
    token: string;
    googleAPIKey: string;
    clientId: string;
    guildId: string;
    channelId: string;
    messageId: string;
}

export interface Event {
    name: string;
    callback: (...args: unknown[]) => void;
}
