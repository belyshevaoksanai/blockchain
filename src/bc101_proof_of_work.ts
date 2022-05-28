import * as crypto from "crypto";

class Block {
  readonly hash: string;
  readonly nounce: number;

  constructor(
    readonly index: number,
    readonly previousHash: string,
    readonly timestamp: number,
    readonly data: string,
  ) {
    const {hash, nounce} = this.mine();
    this.hash = hash;
    this.nounce = nounce;
  }

  calculateHash(nounce: number): string {
    const data = this.index + this.previousHash + this.timestamp + this.data + nounce;
    return crypto
            .createHash('sha256')
            .update(data)
            .digest('hex');
  }

  mine(): {hash: string, nounce: number} {
    let hash: string;
    let nounce = 0;

    do {
      hash = this.calculateHash(nounce++);
    } while(!hash.startsWith('0000'));

    return {hash, nounce}
  }
}

class Blockchain {
  private readonly chain: Block[] = [];

  private get latestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  constructor() {
    this.chain.push(new Block(0, '0', Date.now(), 'Genesis block'));
  }

  addBlock(data: string): void {
    const block = new Block(
      this.latestBlock.index + 1,
      this.latestBlock.hash,
      Date.now(),
      data,
    )
    this.chain.push(block);
  }
}

console.log('Creating the blockchain with the genesis block...');
const blockchain = new Blockchain();

console.log('Mining block #1...');
blockchain.addBlock('First block');

console.log('Mining block #2...');
blockchain.addBlock('Second block');

console.log(JSON.stringify(blockchain, null, 2));