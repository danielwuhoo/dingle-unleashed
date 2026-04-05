import type { NextConfig } from 'next';
import path from 'path';
import fs from 'fs';

const isDocker = process.env.DOCKER_BUILD === '1';
const monorepoRoot = path.resolve(__dirname, '../../');

const nextConfig: NextConfig = {
    output: 'standalone',
    ...(!isDocker && {
        outputFileTracingRoot: monorepoRoot,
        turbopack: { root: monorepoRoot },
    }),
};

// Use mkcert certs if available (for local dev HTTPS)
if (fs.existsSync('./localhost-key.pem')) {
    process.env.SSL_CRT_FILE = './localhost.pem';
    process.env.SSL_KEY_FILE = './localhost-key.pem';
}

export default nextConfig;
