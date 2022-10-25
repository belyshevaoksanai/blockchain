import { sha256 } from "./cryptography";

export interface Transaction {
  readonly sender: string;
  readonly recipient: string;
  readonly amount: number;
}

export interface Block {
  readonly hash: string;
  readonly nonce: number;
  readonly previousHash: string;
  readonly timestamp: number;
  readonly transactions: Transaction[];
}

export type WithoutHash<T> = Omit<T, 'hash'>;
export type WithoutHashWithoutNonce<T> = Omit<T, 'hash' | 'nonce'>;

const HASH_REQUIREMENT = '0000';

export class BlockchainNode {
  private _isMining = false;
  private _chain: Block[] = [];
  private _pendingTransaction: Transaction[] = [];

  get isMining(): boolean {
    return this._isMining;
  }

  get chainIsEmpty(): boolean {
    return this._chain.length === 0;
  }

  get chain(): Block[] {
    return [...this._chain];
  }

  get pendingTransactions(): Transaction[] {
    return [...this._pendingTransaction];
  }

  get noPendingTransactions(): boolean {
    return this.pendingTransactions.length === 0;
  }

  get latestBlock(): Block {
    return this._chain[this.chain.length - 1];
  }

  initializeWith(blocks: Block[]): void {
    this._chain = [...blocks];
  }

  async initializeWithGenesisBlock(): Promise<void> {
    const genesisBlock = await this.mineBlock({
      previousHash: '0',
      timestamp: Date.now(),
      transactions: [],
    });
    this._chain.push(genesisBlock);
  }

  async mineBlock(block: WithoutHashWithoutNonce<Block>): Promise<Block> {
    this._isMining = true;
    let hash = '';
    let nonce = 0;

    do {
      hash = await this.calculateHash({...block, nonce: ++nonce});
    } while (!hash.startsWith(HASH_REQUIREMENT));

    this._isMining = false;
    this._pendingTransaction = [];
    return {...block, hash, nonce};
  }

  async mineBlockWith(transactions: Transaction[]): Promise<Block> {
    const block = {previousHash: this.latestBlock.hash, timestamp: Date.now(), transactions};
    return this.mineBlock(block);
  }

  addTransaction(transaction: Transaction): void {
    this._pendingTransaction.push(transaction);
  }

  async addBlock(newBlock: Block): Promise<void> {
    const errorMessagePrefix = `⚠️ Block "${newBlock.hash.substr(0, 8)}" is rejected`;

    const previousBlockIndex = this._chain.findIndex(b => b.hash === newBlock.previousHash);
    if (previousBlockIndex < 0) {
      throw new Error(`${errorMessagePrefix}  - there is no block in the chain with the specified previous hash "${newBlock.previousHash.substr(0, 8)}".`)
    }

    const tail = this._chain.slice(previousBlockIndex + 1);
    if (tail.length >= 1) {
      throw new Error(`${errorMessagePrefix} - the longer tail of the current node takes precedence over the new block.`);
    }

    const newBlockHash = await this.calculateHash(newBlock);
    const prevBlockHash = this._chain[previousBlockIndex].hash;
    const newBlockValid = (
      newBlockHash.startsWith(HASH_REQUIREMENT) &&
      newBlock.previousHash === prevBlockHash &&
      newBlock.hash === newBlockHash
    );

    if (!newBlockValid) {
      throw new Error(`${errorMessagePrefix}  - hash verification has failed.`)
    }

    this._chain = [...this._chain, newBlock];
  }

  private async calculateHash(block: WithoutHash<Block>): Promise<string> {
    const data = block.previousHash + block.timestamp + JSON.stringify(block.transactions) + block.nonce;
    return sha256(data);
  }
}

export function randomDelay(maxMilleseconds: number = 100): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), Math.floor(Math.random() * Math.floor(maxMilleseconds)))
  })
}
