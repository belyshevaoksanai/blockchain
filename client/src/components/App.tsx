import React, { useCallback, useEffect } from "react";
import { useState } from "react";
import { Block, BlockchainNode, Transaction } from "../lib/blockchain-node";
import { Message, MessageTypes } from "../lib/messages";
import { WebsocketController } from "../lib/websocket-controller";
import { BlocksPanel } from "./BlocksPanel";
import { PendingTransactionPanel } from "./PendingTransactionPanel";
import { TransactionForm } from "./TransactionForm";

const server = new WebsocketController();
const node = new BlockchainNode();

export const App: React.FC = () => {
  const [status, setStatus] = useState<string>('');

  const handleLongestChainRequest = useCallback((message: Message) => {
    server.send({
      type: MessageTypes.GetLongestChainResponse,
      correlationId: message.correlationId,
      payload: node.chain,
    })
  }, []);

  const handleNewBlockRequest = useCallback(async (message: Message) => {
    const transactions = message.payload as Transaction[];
    const miningProcessIsDone = node.mineBlockWith(transactions);

    setStatus(getStatus(node));

    const newBlock = await miningProcessIsDone;
    addBlock(newBlock);
  }, []);

  const handleNewBlockAnnouncement = useCallback((message: Message) => {
    const newBlock = message.payload as Block;
    addBlock(newBlock, false);
  }, []);

  const handleServerMessages = useCallback((message: Message) => {
    switch(message.type) {
      case MessageTypes.GetLongestChainRequest: return handleLongestChainRequest(message);
      case MessageTypes.NewBlockAnnouncement: return handleNewBlockAnnouncement(message);
      case MessageTypes.NewBlockRequest: return handleNewBlockRequest(message);
      default: {
        console.log(`Received message of unknown type: "${message.type}"`);
      }
    }
  }, [
    handleLongestChainRequest,
    handleNewBlockAnnouncement,
    handleNewBlockRequest,
  ]);

  useEffect(() => {
    async function initializeBlockchainNode() {
      await server.connect(handleServerMessages);
      const blocks = await server.requestLongestChain();
      if (blocks.length > 0) {
        node.initializeWith(blocks);
      } else {
        await node.initializeWithGenesisBlock();
      }

      setStatus(getStatus(node));
    }

    initializeBlockchainNode();
    
    return () => server.disconnect();
  }, [handleServerMessages]);

  useEffect(() => {
    setStatus(getStatus(node));
  }, []);

  const addTransaction = (transaction: Transaction) => {
    node.addTransaction(transaction);
    setStatus(getStatus(node));
  }

  async function generateBlock() {
    server.requestNewBlock(node.pendingTransactions);
    const miningProcessIsDone = node.mineBlockWith(node.pendingTransactions);

    setStatus(getStatus(node));

    const newBlock = await miningProcessIsDone;
    addBlock(newBlock);
  }

  async function addBlock(block: Block, notifyOthers = true) {
    try {
      await node.addBlock(block);
      if (notifyOthers) {
        server.announceNewBlock(block);
      }
    } catch (error: any) {
      console.log(error.message);
    }

    setStatus(getStatus(node));
  }

  return (
    <main>
      <h1>Blockchain node</h1>
      <aside><p>{status}</p></aside>
      <section>
        <TransactionForm
          onAddTransaction={addTransaction}
          disabled={node.isMining || node.chainIsEmpty}
        />
      </section>
      <section>
        <PendingTransactionPanel
          formattedTransactions={formatTransactions(node.pendingTransactions)}
          onGenerateBlock={generateBlock}
          disabled={node.isMining || node.noPendingTransactions}
        />
      </section>
      <section>
        <BlocksPanel
          blocks={node.chain}
        />
      </section>
    </main>
  )
}

function formatTransactions(transactions: Transaction[]): string {
  return transactions.map(t =>`${t.sender} → ${t.recipient}: $${t.amount}`).join('\n');
}

function getStatus(node: BlockchainNode): string {
  return node.chainIsEmpty          ? '⏳ Initializing the blockchain...' :
         node.isMining              ? '⏳ Mining a new block...' :
         node.noPendingTransactions ? '📩 Add one or more transactions.' :
                                      `✅ Ready to mine a new block (transactions: ${node.pendingTransactions.length}).`;
}