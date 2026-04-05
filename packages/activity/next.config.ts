import type { NextConfig } from 'next';
import path from 'path';
import fs from 'fs';

const nextConfig: NextConfig = {
    output: 'standalone',
    outputFileTracingRoot: path.resolve(__dirname, '../../'),
    turbopack: {
        root: path.resolve(__dirname, '../../'),
    },
};

// Use mkcert certs if available (for local dev HTTPS)
if (fs.existsSync('./localhost-key.pem')) {
    process.env.SSL_CRT_FILE = './localhost.pem';
    process.env.SSL_KEY_FILE = './localhost-key.pem';
}

export default nextConfig;
