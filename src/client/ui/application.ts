import { html, TemplateResult } from '../../../node_modules/lit-html/lit-html.js';
import { Message, MessageTypes } from '../../shared/messages.js';
import { Block, BlockchainNode, Transaction } from '../lib/blockchain-node.js';
import { WebsocketController } from '../lib/websocket-controller.js';
import { BlocksPanel } from './blocks-panel.js';
import { Callback, Renderable } from './common.js';
import { PendingTransactionsPanel } from './pending-transactions-panel.js';
import { TransactionForm } from './transaction-form.js';

export class Application implements Renderable<void> {
  private readonly node: BlockchainNode;
  private readonly server: WebsocketController; // Отвечает за обмен данными с WS

  // UI components:
  // Передает callback каждому компоненту, чтобы те могли обновляться
  private readonly transactionForm = new TransactionForm(this.requestRendering);
  private readonly pendingTransactionsPanel = new PendingTransactionsPanel(this.requestRendering);
  private readonly blocksPanel = new BlocksPanel(this.requestRendering);

  constructor(readonly requestRendering: Callback) {
    // подключается к WS серверу
    this.server = new WebsocketController(this.handleServerMessages);
    // логика с блокчейн-узлами
    this.node = new BlockchainNode();

    // начальное отображение
    this.requestRendering();
    // инициализирует блокчейн
    this.initializeBlockchain();
  }

  private async initializeBlockchain() {
    // запрашивает у всех узлов длиннейшую цепочку
    const blocks = await this.server.requestLongestChain();
    if (blocks.length > 0) {
      this.node.initializeWith(blocks);
    } else {
      await this.node.initializeWithGenesisBlock();
    }

    this.requestRendering();
  }

  render(): TemplateResult {
    return html`
      <main>
        <h1>Blockchain node</h1>
        <aside>${this.statusLine}</aside>
        <section>${this.transactionForm.render(this.node)}</section>
        <section>
          <form @submit="${this.generateBlock}">
            ${this.pendingTransactionsPanel.render(this.node)}
          </form>
        </section>
        <section>${this.blocksPanel.render(this.node.chain)}</section>
      </main>
    `;
  }

  private get statusLine(): TemplateResult {
    return html`
      <p>${
        this.node.chainIsEmpty          ? '⏳ Initializing the blockchain...' :
        this.node.isMining              ? '⏳ Mining a new block...' :
        this.node.noPendingTransactions ? '📩 Add one or more transactions.' :
                                          '✅ Ready to mine a new block.'
      }</p>
    `;
  }

  private readonly generateBlock = async (event: Event): Promise<void> => {
    event.preventDefault();

    // сообщает остальным узлам что начал искать блок
    this.server.requestNewBlock(this.node.pendingTransactions);
    // начинает добывать блок
    const miningProcessIsDone = this.node.mineBlockWith(this.node.pendingTransactions);

    this.requestRendering();

    const newBlock = await miningProcessIsDone;
    // добавляет блок в локальный блокчейн
    this.addBlock(newBlock);
  };

  private async addBlock(block: Block, notifyOthers = true): Promise<void> {
    try {
      await this.node.addBlock(block);
      if (notifyOthers) {
        // анонсировать новый блок-претедент
        this.server.announceNewBlock(block);
      }
    } catch (error) {
      console.log(error.message);
    }

    this.requestRendering();
  }

  // обрабатывает сообщения от WS
  private readonly handleServerMessages = (message: Message) => {
    switch (message.type) {
      case MessageTypes.GetLongestChainRequest: return this.handleGetLongestChainRequest(message);
      case MessageTypes.NewBlockRequest       : return this.handleNewBlockRequest(message);
      case MessageTypes.NewBlockAnnouncement  : return this.handleNewBlockAnnouncement(message);
      default: {
        console.log(`Received message of unknown type: "${message.type}"`);
      }
    }
  }

  // узел отправляет свою длиннейшую цепочку серверу
  private handleGetLongestChainRequest(message: Message): void {
    this.server.send({
      type: MessageTypes.GetLongestChainResponse,
      correlationId: message.correlationId,
      payload: this.node.chain
    });
  }

  private async handleNewBlockRequest(message: Message): Promise<void> {
    const transactions = message.payload as Transaction[];
    const newBlock = await this.node.mineBlockWith(transactions);
    this.addBlock(newBlock);
  }

  private async handleNewBlockAnnouncement(message: Message): Promise<void> {
    const newBlock = message.payload as Block;
    this.addBlock(newBlock, false);
  }
}