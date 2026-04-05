import { DiscordSDK, DiscordSDKMock } from '@discord/embedded-app-sdk';

export function isRunningInDiscord(): boolean {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.has('frame_id');
}

export function createDiscordSdk(clientId: string): DiscordSDK | DiscordSDKMock {
    if (isRunningInDiscord()) {
        return new DiscordSDK(clientId);
    }

    const mock = new DiscordSDKMock(clientId, null, null, null);
    mock._updateCommandMocks({
        authorize: async () => ({ code: 'mock_code' }),
        authenticate: async () => ({
            access_token: 'mock_token',
            user: {
                username: 'MockUser',
                discriminator: '0',
                id: '123456789',
                public_flags: 0,
                global_name: 'Mock User',
            },
            scopes: ['identify', 'guilds'],
            expires: new Date(Date.now() + 3600000).toISOString(),
            application: {
                id: clientId,
                description: '',
                name: 'Dingle Activity',
            },
        }),
    });
    return mock;
}
