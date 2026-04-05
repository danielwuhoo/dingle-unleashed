interface EndgameContent {
    gifs: string[];
    text: string;
}

const endgameByGuesses: Record<number, EndgameContent> = {
    1: {
        gifs: [
            'https://media.tenor.com/X2K3hDrBP7sAAAAi/banned-cute.gif',
        ],
        text: 'ur banned',
    },
    2: {
        gifs: [
            'https://media.tenor.com/eQzEw3z2heYAAAAC/cheating-spongebob.gif',
        ],
        text: 'cheater??',
    },
    3: {
        gifs: [
            'http://c.tenor.com/EV-OQL03ieIAAAAd/tenor.gif',
        ],
        text: 'sus',
    },
    4: {
        gifs: [
            'https://media.tenor.com/WyxtAFPzvVMAAAAC/spongebob-square-pants.gif',
        ],
        text: 'u can do better',
    },
    5: {
        gifs: [
            'https://media.tenor.com/8qNp2x8nzmAAAAAC/spongebob-squarepants.gif',
        ],
        text: 'fake word??',
    },
    6: {
        gifs: [
            'https://media.tenor.com/htJ79Uy3OCEAAAAC/that-is-messed-up.gif',
        ],
        text: 'even yaman did better than u',
    },
};

const lostContent: EndgameContent = {
    gifs: [
        'https://media.tenor.com/4TcADzhc4kkAAAAC/patrick-star-patrick.gif',
    ],
    text: '💀💀💀',
};

function pickRandom(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function getEndgameContent(guesses: number, won: boolean): { gif: string; text: string } {
    if (!won) {
        return { gif: pickRandom(lostContent.gifs), text: lostContent.text };
    }
    const content = endgameByGuesses[guesses];
    if (!content) {
        return { gif: pickRandom(lostContent.gifs), text: 'Wow' };
    }
    return { gif: pickRandom(content.gifs), text: content.text };
}
