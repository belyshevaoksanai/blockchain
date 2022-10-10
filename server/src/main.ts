import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import { BlockchainServer } from './blockchain-server';

const PORT = 3000;
const app = express();

//запуск http-сервера
const httpServer: http.Server = app.listen(PORT, () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Listening on http://localhost:${PORT}`);
  }
});

// запуск веб сокета
const wsServer = new WebSocket.Server({ server: httpServer });
// запуск блокчейен сервера
new BlockchainServer(wsServer);