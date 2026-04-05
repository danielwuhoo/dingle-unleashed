import { createTheme, MantineColorsTuple } from '@mantine/core';
import { generateColors } from '@mantine/colors-generator';

// Catppuccin Macchiato accent colors
const macchiato = {
    rosewater: '#f4dbd6',
    flamingo: '#f0c6c6',
    pink: '#f5bde6',
    mauve: '#c6a0f6',
    red: '#ed8796',
    maroon: '#ee99a0',
    peach: '#f5a97f',
    yellow: '#eed49f',
    green: '#a6da95',
    teal: '#8bd5ca',
    sky: '#91d7e3',
    sapphire: '#7dc4e4',
    blue: '#8aadf4',
    lavender: '#b7bdf8',
};

const colors: Record<string, MantineColorsTuple> = {};
for (const [name, hex] of Object.entries(macchiato)) {
    colors[name] = generateColors(hex);
}

// Override Mantine's dark array with Macchiato surface/base colors
colors.dark = [
    '#cad3f5', // 0 - text
    '#b8c0e0', // 1 - subtext1
    '#a5adcb', // 2 - subtext0
    '#939ab7', // 3 - overlay2
    '#8087a2', // 4 - overlay1
    '#6e738d', // 5 - overlay0
    '#5b6078', // 6 - surface2
    '#363a4f', // 7 - surface0
    '#24273a', // 8 - base
    '#181926', // 9 - crust
];

export const theme = createTheme({
    primaryColor: 'mauve',
    fontFamily: 'var(--font-libre-franklin), sans-serif',
    headings: { fontFamily: 'var(--font-arvo), serif' },
    colors,
});
