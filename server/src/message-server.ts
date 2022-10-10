import * as WebSocket from 'ws';

export abstract class MessageServer<T> {
  constructor(private readonly wsServer: WebSocket.Server) {
    // подписка на сообщения от только что подключившегося клиента
    this.wsServer.on('connection', this.subscribeToMessages);
    // очищает ссылки на отключившихся клиентов
    this.wsServer.on('error', this.cleanupDeadClients);
  }

  protected abstract handleMessage(sender: WebSocket, message: T): void;

  protected readonly subscribeToMessages = (ws: WebSocket): void => {
    // получено сообщение от клиента
    ws.on('message', (data: WebSocket.Data) => {
      if (typeof data === 'string') {
        // передает сообщение  от клиента
        this.handleMessage(ws, JSON.parse(data));
      } else {
        console.log('Received data of unsupported type.');
      }
    });
  };

  private readonly cleanupDeadClients = (): void => {
    this.wsServer.clients.forEach(client => {
      if (this.isDead(client)) {
        this.wsServer.clients.delete(client);
      }
    });
  };

  // производит отсылку по всем узлам
  protected broadcastExcept(currentClient: WebSocket, message: Readonly<T>): void {
    this.wsServer.clients.forEach(client => {
      if (this.isAlive(client) && client !== currentClient) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // отправляет сообщение одному узлу
  protected replyTo(client: WebSocket, message: Readonly<T>): void {
    client.send(JSON.stringify(message));
  }

  protected get clients(): Set<WebSocket> {
    return this.wsServer.clients;
  }

  private isAlive(client: WebSocket): boolean {
    return !this.isDead(client);
  }

  // проверяет не отключен ли конкретный сервер
  private isDead(client: WebSocket): boolean {
    return (
      client.readyState === WebSocket.CLOSING ||
      client.readyState === WebSocket.CLOSED
    );
  }
}
