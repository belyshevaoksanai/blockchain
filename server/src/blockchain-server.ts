import * as WebSocket from 'ws';
import { Message, MessageTypes, UUID } from './messages';
import { MessageServer } from './message-server';

// ответы от узлов блокчейна
type Replies = Map<WebSocket, Message>;

export class BlockchainServer extends MessageServer<Message> {
    // коллекция клиентских сообщений ожидающих ответа
    private readonly receivedMessagesAwaitingResponse = new Map<UUID, WebSocket>();

    // коллекция ответов от клиента
    private readonly sentMessagesAwaitingReply = new Map<UUID, Replies>();

    // обработчик для всех видов сообщений
    protected handleMessage(sender: WebSocket, message: Message): void {
        switch (message.type) {
            case MessageTypes.GetLongestChainRequest : return this.handleGetLongestChainRequest(sender, message);
            case MessageTypes.GetLongestChainResponse: return this.handleGetLongestChainResponse(sender, message);
            case MessageTypes.NewBlockRequest        : return this.handleAddTransactionsRequest(sender, message);
            case MessageTypes.NewBlockAnnouncement   : return this.handleNewBlockAnnouncement(sender, message);
            default: {
                console.log(`Received message of unknown type: "${message.type}"`);
            }
        }
    }

    private handleGetLongestChainRequest(requestor: WebSocket, message: Message): void {
        if (this.clientIsNotAlone) {
            // сохраняет запрос клиента
            this.receivedMessagesAwaitingResponse.set(message.correlationId, requestor);
            this.sentMessagesAwaitingReply.set(message.correlationId, new Map());
            // отсылает всем узлам, запрашивая их длиннейшие цепочки
            this.broadcastExcept(requestor, message);
        } else {
            // в блокчейне с одним узлом нет длиннейшей цепочки
            this.replyTo(requestor, {
                type: MessageTypes.GetLongestChainResponse,
                correlationId: message.correlationId,
                payload: []
            });
        }
    }

    private handleGetLongestChainResponse(sender: WebSocket, message: Message): void {
      // находит клиента, запросившего длиннейшую цепочку
        if (this.receivedMessagesAwaitingResponse.has(message.correlationId)) {
            const requestor = this.receivedMessagesAwaitingResponse.get(message.correlationId);

            // если получены все ответы
            if (this.everyoneReplied(sender, message)) {
                const allReplies = this.sentMessagesAwaitingReply.get(message.correlationId).values();
                const longestChain = Array.from(allReplies).reduce(this.selectTheLongestChain);
                // передает длиннейшую цепочку
                this.replyTo(requestor, longestChain);
            }
        }
    }

    private handleAddTransactionsRequest(requestor: WebSocket, message: Message): void {
        this.broadcastExcept(requestor, message);
    }

    private handleNewBlockAnnouncement(requestor: WebSocket, message: Message): void {
        this.broadcastExcept(requestor, message);
    }

    // Проверяет все ли ответиили на запрос
    private everyoneReplied(sender: WebSocket, message: Message): boolean {
        const repliedClients = this.sentMessagesAwaitingReply
            .get(message.correlationId)
            .set(sender, message);

        const awaitingForClients = Array.from(this.clients).filter(c => !repliedClients.has(c));

        return awaitingForClients.length === 1;
    }


    // Выбор длиннейшей цепочки
    private selectTheLongestChain(currentlyLongest: Message, current: Message, index: number) {
        return index > 0 && current.payload.length > currentlyLongest.payload.length ? current : currentlyLongest;
    }

    // Проверяет один узел или больше
    private get clientIsNotAlone(): boolean {
        return this.clients.size > 1;
    }
}
