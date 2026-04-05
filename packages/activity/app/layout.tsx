import '@mantine/core/styles.css';
import Providers from '@/lib/providers';
import { ColorSchemeScript } from '@mantine/core';
import { Libre_Franklin } from 'next/font/google';

const libreFranklin = Libre_Franklin({
    subsets: ['latin'],
    variable: '--font-libre-franklin',
});

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Dingle Activity',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning className={libreFranklin.variable}>
            <head>
                <ColorSchemeScript defaultColorScheme="dark" />
            </head>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
