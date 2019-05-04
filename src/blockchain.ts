import * as CryptoJS from 'crypto-js';
import * as _ from 'lodash';
import {broadcastLatest, broadCastTransactionPool, broadCastTransactionPoolVictoryPoints} from './p2p';
import {
    getCoinbaseTransaction, isValidAddress, processTransactions, Transaction, UnspentTxOut
} from './transaction';
import {
    getCoinbaseTransactionVictoryPoints, isValidAddressVictoryPoints, processTransactionsVictoryPoints, TransactionVictoryPoints, UnspentTxOutVictoryPoints
} from './transactionVictoryPoints';
import {addToTransactionPool, getTransactionPool, updateTransactionPool} from './transactionPool';
import {addToTransactionPoolVictoryPoints, getTransactionPoolVictoryPoints, updateTransactionPoolVictoryPoints} from './transactionPoolVictoryPoints';
import {hexToBinary} from './util';
import {createTransaction, findUnspentTxOuts, getBalance, getPrivateFromWallet, getPublicFromWallet,
  createTransactionVictoryPoints, findUnspentTxOutsVictoryPoints, getBalanceVictoryPoints} from './wallet';

// RAZRED ZA BLOCK V BLOCKCHAINU
class Block {

    public index: number;
    public hash: string;
    public previousHash: string;
    public timestamp: number;
    public data: Transaction[];
    public dataVictory: TransactionVictoryPoints[];
    public difficulty: number;
    public nonce: number;

    constructor(index: number, hash: string, previousHash: string,
                timestamp: number, data: Transaction[], dataVictory: TransactionVictoryPoints[], difficulty: number, nonce: number) {
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.dataVictory = dataVictory;
        this.hash = hash;
        this.difficulty = difficulty;
        this.nonce = nonce;
    }
}

const genesisTransaction = {
    'txIns': [{'signature': '', 'txOutId': '', 'txOutIndex': 0}],
    'txOuts': [{
        'address': '04bfcab8722991ae774db48f934ca79cfb7dd991229153b9f732ba5334aafcd8e7266e47076996b55a14bf9913ee3145ce0cfc1372ada8ada74bd287450313534a',
        'amount': 50
    }],
    'id': 'e655f6a5f26dc9b4cac6e46f52336428287759cf81ef5ff10854f69d68f43fa3'
};

const genesisTransactionVictoryPoints = {
    'txIns': [{'signature': '', 'txOutId': '', 'txOutIndex': 0}],
    'txOuts': [{
        'address': '04bfcab8722991ae774db48f934ca79cfb7dd991229153b9f732ba5334aafcd8e7266e47076996b55a14bf9913ee3145ce0cfc1372ada8ada74bd287450313534a',
        'amount': 50
    }],
    'id': 'e655f6a5f26dc9b4cac6e46f52336428287759cf81ef5ff10854f69d68f43fa3'
};
//USTAVARI ZAČETNI BLOCK (GENESIS)
const genesisBlock: Block = new Block(
    0, '91a73664bc84c0baa1fc75ea6e4aa6d1d20c5df664c724e3159aefc2e1186627', '', 1465154705, [genesisTransaction],[genesisTransactionVictoryPoints], 0, 0
);

//USTVARI BLOCKCHAIN
let blockchain: Block[] = [genesisBlock];

// the unspent txOut of genesis block is set to unspentTxOuts on startup
let unspentTxOuts: UnspentTxOut[] = processTransactions(blockchain[0].data, [], 0);
const getUnspentTxOuts = (): UnspentTxOut[] => _.cloneDeep(unspentTxOuts);
console.log(blockchain[0].data);
let unspentTxOutsVictoryPoints: UnspentTxOutVictoryPoints[] = processTransactionsVictoryPoints(blockchain[0].dataVictory,[],0);
console.log(blockchain[0].dataVictory);
const getUnspentTxOutsVictoryPoints = (): UnspentTxOutVictoryPoints[] => _.cloneDeep(unspentTxOutsVictoryPoints);

const getBlockchain = (): Block[] => blockchain;

console.log("UnspentTxOuts on startup" +JSON.stringify(getUnspentTxOuts(),null,2));
console.log("unspentTxOutsVictoryPoints on startup" +JSON.stringify(getUnspentTxOutsVictoryPoints(),null,2));



// and txPool should be only updated at the same time
const setUnspentTxOuts = (newUnspentTxOut: UnspentTxOut[]) => {
    console.log('replacing unspentTxouts with: %s', JSON.stringify(newUnspentTxOut,null,2));
    unspentTxOuts = newUnspentTxOut;
};

const setUnspentTxOutsVictoryPoints = (newUnspentTxOut: UnspentTxOutVictoryPoints[]) => {
    console.log('replacing unspentTxouts with: %s', JSON.stringify(newUnspentTxOut,null,2));
    unspentTxOutsVictoryPoints = newUnspentTxOut;
};



const getLatestBlock = (): Block => blockchain[blockchain.length - 1];

/*
        KONSTANTA KI DOLOČA NA KOLIKO ČASA SE LAHKO USTVARI NOV BLOCK:
        10 SEKUND
*/
const BLOCK_GENERATION_INTERVAL: number = 10;

/*
        KONSTANTA KI DOLOČA NA KOLIKO ČASA SE PRILAGODI TEŽAVNOST:
        10 BLOCKOV
*/
const DIFFICULTY_ADJUSTMENT_INTERVAL: number = 10;

/*
      PRIDOBI TEŽAVNOST, ČE JE POTREBNO KLIČE FUNKCIJO ZA PRILAGADOTIVE TEŽAVNOSTI
*/
const getDifficulty = (aBlockchain: Block[]): number => {
    const latestBlock: Block = aBlockchain[blockchain.length - 1];
    if (latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0) {
        return getAdjustedDifficulty(latestBlock, aBlockchain);
    } else {
        return latestBlock.difficulty;
    }
};

const getAdjustedDifficulty = (latestBlock: Block, aBlockchain: Block[]) => {
    const prevAdjustmentBlock: Block = aBlockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
    const timeExpected: number = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
    const timeTaken: number = latestBlock.timestamp - prevAdjustmentBlock.timestamp;
    if (timeTaken < timeExpected / 2) {
        return prevAdjustmentBlock.difficulty + 1;
    } else if (timeTaken > timeExpected * 2) {
        return prevAdjustmentBlock.difficulty - 1;
    } else {
        return prevAdjustmentBlock.difficulty;
    }
};

const getCurrentTimestamp = (): number => Math.round(new Date().getTime() / 1000);


const generateRawNextBlock = (blockData: Transaction[], blockDataVictory: TransactionVictoryPoints[]) => {
    const previousBlock: Block = getLatestBlock();
    const difficulty: number = getDifficulty(getBlockchain());
    const nextIndex: number = previousBlock.index + 1;
    const nextTimestamp: number = getCurrentTimestamp();
    const newBlock: Block = findBlock(nextIndex, previousBlock.hash, nextTimestamp, blockData, blockDataVictory, difficulty);
    if (addBlockToChain(newBlock)) {
        broadcastLatest();
        return newBlock;
    } else {
        return null;
    }

};

// gets the unspent transaction outputs owned by the wallet
const getMyUnspentTransactionOutputs = () => {
    return findUnspentTxOuts(getPublicFromWallet(), getUnspentTxOuts());
};

const getMyUnspentTransactionOutputsVictoryPoints = () => {
    return findUnspentTxOutsVictoryPoints(getPublicFromWallet(), getUnspentTxOutsVictoryPoints());
};

//USTVARI NASLEDNJI BLOCK S PREMOŽENJEM(VALUTO)
const generateNextBlock = () => {
    console.log("Inside generateNextBlock");
    const coinbaseTx: Transaction = getCoinbaseTransaction(getPublicFromWallet(), getLatestBlock().index + 1);
    console.log("COINBASE TX" + JSON.stringify(coinbaseTx, null, 2));
    const blockData: Transaction[] = [coinbaseTx].concat(getTransactionPool());
    console.log("blockData" + JSON.stringify(blockData, null, 2));
    const coinbaseTxVictoryPoints: TransactionVictoryPoints = getCoinbaseTransactionVictoryPoints(getPublicFromWallet(), getLatestBlock().index + 1);
    console.log("COINBASE TX VICTORY" + JSON.stringify(coinbaseTxVictoryPoints, null, 2));
    const blockDataVictoryPoints: TransactionVictoryPoints[] = [coinbaseTxVictoryPoints].concat(getTransactionPoolVictoryPoints());
    console.log("blockDataVictory" + JSON.stringify(blockDataVictoryPoints, null, 2));
    console.log("transactionPoolVictoryPoints:" + JSON.stringify(getTransactionPoolVictoryPoints(), null, 2));
        console.log("transactionPool:" + JSON.stringify(getTransactionPool(), null, 2));
    return generateRawNextBlock(blockData, blockDataVictoryPoints);
};

//USTVARI NASLEDNJI BLOCK S TRANSAKCIJO
//MOGOČE JE POTREBNO LOČITI NA DVE FUNKCIJI (ENA ZA VICTORY, ENA ZA CURRENCY)
const generatenextBlockWithTransaction = (receiverAddress: string, amount: number) => {
    if (!isValidAddress(receiverAddress)) {
        throw Error('invalid address');
    }
    if (typeof amount !== 'number') {
        throw Error('invalid amount');
    }
    const coinbaseTx: Transaction = getCoinbaseTransaction(getPublicFromWallet(), getLatestBlock().index + 1);
    const tx: Transaction = createTransaction(receiverAddress, amount, getPrivateFromWallet(), getUnspentTxOuts(), getTransactionPool());
    const blockData: Transaction[] = [coinbaseTx, tx];
    const coinbaseTxVictoryPoints: TransactionVictoryPoints = getCoinbaseTransactionVictoryPoints(getPublicFromWallet(), getLatestBlock().index + 1);
    const txVictoryPoints: TransactionVictoryPoints = createTransactionVictoryPoints(receiverAddress, amount, getPrivateFromWallet(), getUnspentTxOuts(), getTransactionPool());
    const blockDataVictoryPoints: TransactionVictoryPoints[] = [coinbaseTxVictoryPoints, tx];
    return generateRawNextBlock(blockData, blockDataVictoryPoints);
};

/*
        POIŠČE VELJAVEN BLOCK
        povečuje nonce, dokler ne pride do ustreznega hasha glede na difficulty
*/
const findBlock = (index: number, previousHash: string, timestamp: number, data: Transaction[], dataVictory: TransactionVictoryPoints[], difficulty: number): Block => {
    let nonce = 0;
    while (true) {
        const hash: string = calculateHash(index, previousHash, timestamp, data, dataVictory, difficulty, nonce);
        if (hashMatchesDifficulty(hash, difficulty)) {
            return new Block(index, hash, previousHash, timestamp, data, dataVictory, difficulty, nonce);
        }
        nonce++;
    }
};

const getAccountBalance = (): number => {
    return getBalance(getPublicFromWallet(), getUnspentTxOuts());
};

const getAccountBalanceVictoryPoints = (): number => {
    return getBalanceVictoryPoints(getPublicFromWallet(), getUnspentTxOutsVictoryPoints());
};

const sendTransaction = (address: string, amount: number): Transaction => {
    const tx: Transaction = createTransaction(address, amount, getPrivateFromWallet(), getUnspentTxOuts(), getTransactionPool());
    addToTransactionPool(tx, getUnspentTxOuts());
    broadCastTransactionPool();
    return tx;
};

const sendTransactionVictoryPoints = (address: string, amount: number): TransactionVictoryPoints => {
    const tx: TransactionVictoryPoints = createTransactionVictoryPoints(address, amount, getPrivateFromWallet(), getUnspentTxOutsVictoryPoints(), getTransactionPoolVictoryPoints());
    addToTransactionPoolVictoryPoints(tx, getUnspentTxOutsVictoryPoints());
    broadCastTransactionPoolVictoryPoints();
    return tx;
};

const calculateHashForBlock = (block: Block): string =>
    calculateHash(block.index, block.previousHash, block.timestamp, block.data, block.dataVictory, block.difficulty, block.nonce);

const calculateHash = (index: number, previousHash: string, timestamp: number, data: Transaction[],dataVictory: TransactionVictoryPoints[],
                       difficulty: number, nonce: number): string =>
    CryptoJS.SHA256(index + previousHash + timestamp + data + dataVictory+ difficulty + nonce).toString();

const isValidBlockStructure = (block: Block): boolean => {
    return typeof block.index === 'number'
        && typeof block.hash === 'string'
        && typeof block.previousHash === 'string'
        && typeof block.timestamp === 'number'
        && typeof block.data === 'object'
        && typeof block.dataVictory === 'object';
};

const isValidNewBlock = (newBlock: Block, previousBlock: Block): boolean => {
    if (!isValidBlockStructure(newBlock)) {
        console.log('invalid block structure: %s', JSON.stringify(newBlock));
        return false;
    }
    if (previousBlock.index + 1 !== newBlock.index) {
        console.log('invalid index');
        return false;
    } else if (previousBlock.hash !== newBlock.previousHash) {
        console.log('invalid previoushash');
        return false;
    } else if (!isValidTimestamp(newBlock, previousBlock)) {
        console.log('invalid timestamp');
        return false;
    } else if (!hasValidHash(newBlock)) {
        return false;
    }
    return true;
};

/*
        IZRAČUNA SKUPNO TEŽAVNOST ZA BLOCKCHAIN
*/
const getAccumulatedDifficulty = (aBlockchain: Block[]): number => {
    return aBlockchain
        .map((block) => block.difficulty)
        .map((difficulty) => Math.pow(2, difficulty))
        .reduce((a, b) => a + b);
};

/*
        PREVERI ALI JE TIMESTAMP VELJAVEN
*/
const isValidTimestamp = (newBlock: Block, previousBlock: Block): boolean => {
    return ( previousBlock.timestamp - 60 < newBlock.timestamp )
        && newBlock.timestamp - 60 < getCurrentTimestamp();
};

const hasValidHash = (block: Block): boolean => {

    if (!hashMatchesBlockContent(block)) {
        console.log('invalid hash, got:' + block.hash);
        return false;
    }

    if (!hashMatchesDifficulty(block.hash, block.difficulty)) {
        console.log('block difficulty not satisfied. Expected: ' + block.difficulty + 'got: ' + block.hash);
    }
    return true;
};

const hashMatchesBlockContent = (block: Block): boolean => {
    const blockHash: string = calculateHashForBlock(block);
    return blockHash === block.hash;
};

/*
        PREVERI ALI SE HASH UJEMA GLEDA NA TEŽAVNOST
        TEŽAVNOST: število 0 na začetku
        PRIMER: dif=5 --> 00000.....
*/
const hashMatchesDifficulty = (hash: string, difficulty: number): boolean => {
    const hashInBinary: string = hexToBinary(hash);
    const requiredPrefix: string = '0'.repeat(difficulty);
    return hashInBinary.startsWith(requiredPrefix);
};

/*
    PREVERI ALI JE PODAN BLOCKCHAIN VELJAVEN,
    ČE JA: VRNE NEPORABLJENE txOuts
 */
const isValidChain = (blockchainToValidate: Block[]): any => {
    console.log('isValidChain:');
    console.log(JSON.stringify(blockchainToValidate));
    const isValidGenesis = (block: Block): boolean => {
        return JSON.stringify(block) === JSON.stringify(genesisBlock);
    };

    if (!isValidGenesis(blockchainToValidate[0])) {
        return null;
    }
    /*
      VALIDIRA VSAK BLOCK V VERIGI. BLOCK JE VELJAVEN ČE JE VELJAVNA NJEGOVA STRUKTURA
      IN SO TRANSAKCIJE VELJAVNE
     */
    let aUnspentTxOuts: UnspentTxOut[] = [];

    for (let i = 0; i < blockchainToValidate.length; i++) {
        const currentBlock: Block = blockchainToValidate[i];
        if (i !== 0 && !isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1])) {
            return null;
        }

        aUnspentTxOuts = processTransactions(currentBlock.data, aUnspentTxOuts, currentBlock.index);
        if (aUnspentTxOuts === null) {
            console.log('invalid transactions in blockchain');
            return null;
        }
    }

    let aUnspentTxOutsVictoryPoints: UnspentTxOutVictoryPoints[] = [];

    for (let i = 0; i < blockchainToValidate.length; i++) {
        const currentBlock: Block = blockchainToValidate[i];
        if (i !== 0 && !isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1])) {
            return null;
        }

        aUnspentTxOutsVictoryPoints = processTransactionsVictoryPoints(currentBlock.dataVictory, aUnspentTxOutsVictoryPoints, currentBlock.index);
        console.log("aUnspentTxOutsVictoryPoints: " + JSON.stringify(aUnspentTxOutsVictoryPoints,null,2));
        if (aUnspentTxOutsVictoryPoints === null) {
            console.log('invalid transactions in blockchain');
            return null;
        }
    }
    let tupleUnspent = [aUnspentTxOuts, aUnspentTxOutsVictoryPoints];
    return tupleUnspent;
};

/*
          DODAJ BLOCK V VERIGO
*/
const addBlockToChain = (newBlock: Block): boolean => {
    if (isValidNewBlock(newBlock, getLatestBlock())) {
        const retVal: UnspentTxOut[] = processTransactions(newBlock.data, getUnspentTxOuts(), newBlock.index);
        const retValVictoryPoints: UnspentTxOut[] = processTransactionsVictoryPoints(newBlock.dataVictory, getUnspentTxOutsVictoryPoints(), newBlock.index);

        if (retVal === null || retValVictoryPoints == null) {
            console.log('block is not valid in terms of transactions');
            return false;
        } else {
            blockchain.push(newBlock);
            setUnspentTxOuts(retVal);
            updateTransactionPool(unspentTxOuts);
            setUnspentTxOutsVictoryPoints(retValVictoryPoints);
            updateTransactionPoolVictoryPoints(unspentTxOutsVictoryPoints);
            return true;
        }
    }
    return false;
};

/*
        ZAMENJAJ VERIGO ZA TISTO Z VIŠJO SKUPNO TEŽAVNOSTJO
*/
const replaceChain = (newBlocks: Block[]) => {
    const tupleUnspent = isValidChain(newBlocks);
    const aUnspentTxOuts = tupleUnspent[0];
    const aUnspentTxOutsVictoryPoints = tupleUnspent[1];
    const validChain: boolean = aUnspentTxOuts !== null && aUnspentTxOutsVictoryPoints !== null;
    if (validChain && getAccumulatedDifficulty(newBlocks) > getAccumulatedDifficulty(getBlockchain())) {
        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
        blockchain = newBlocks;
        setUnspentTxOuts(aUnspentTxOuts);
        updateTransactionPool(unspentTxOuts);
        setUnspentTxOutsVictoryPoints(aUnspentTxOutsVictoryPoints);
        updateTransactionPoolVictoryPoints(unspentTxOutsVictoryPoints);
        broadcastLatest();
    } else {
        console.log('Received blockchain invalid');
    }
};

const handleReceivedTransaction = (transaction: Transaction) => {
    addToTransactionPool(transaction, getUnspentTxOuts());
};

const handleReceivedTransactionVictoryPoints = (transaction: Transaction) => {
    addToTransactionPoolVictoryPoints(transaction, getUnspentTxOuts());
};

export {
    Block, getBlockchain, getUnspentTxOuts, getLatestBlock, sendTransaction,
    generateRawNextBlock, generateNextBlock, generatenextBlockWithTransaction,
    handleReceivedTransaction, getMyUnspentTransactionOutputs,
    getAccountBalance, isValidBlockStructure, replaceChain, addBlockToChain,
    getUnspentTxOutsVictoryPoints, getMyUnspentTransactionOutputsVictoryPoints, sendTransactionVictoryPoints, getAccountBalanceVictoryPoints,
    handleReceivedTransactionVictoryPoints
};
