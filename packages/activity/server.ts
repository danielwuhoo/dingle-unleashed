import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './lib/socket-server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = createServer((req, res) => {
        handle(req, res);
    });

    const io = new Server(server, {
        path: '/api/socketio',
        cors: { origin: '*' },
        transports: ['websocket', 'polling'],
    });

    setupSocketHandlers(io);

    server.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
