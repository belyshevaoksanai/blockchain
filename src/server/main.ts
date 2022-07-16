import * as express from 'express';
import * as http from 'http';
import * as path from 'path';
import * as WebSocket from 'ws';
import { BlockchainServer } from './blockchain-server';

const PORT = 3000;
const app = express();
// расположение кода, используемое клиентом
app.use('/',             express.static(path.join(__dirname, '../../public')));
// расположение кода, используемое node_modules
app.use('/node_modules', express.static(path.join(__dirname, '../../node_modules')));

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