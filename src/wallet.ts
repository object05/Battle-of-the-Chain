import {ec} from 'elliptic';
import {existsSync, readFileSync, unlinkSync, writeFileSync} from 'fs';
import * as _ from 'lodash';
import {getPublicKey, getTransactionId, signTxIn, Transaction, TxIn, TxOut, UnspentTxOut} from './transaction';
import {getPublicKeyVictoryPoints, getTransactionIdVictoryPoints, signTxInVictoryPoints, TransactionVictoryPoints,
        TxInVictoryPoints, TxOutVictoryPoints, UnspentTxOutVictoryPoints} from './transactionVictoryPoints';

const EC = new ec('secp256k1');
const privateKeyLocation = process.env.PRIVATE_KEY || 'node/wallet/private_key';

const getPrivateFromWallet = (): string => {
    const buffer = readFileSync(privateKeyLocation, 'utf8');
    return buffer.toString();
};

const getPublicFromWallet = (): string => {
    const privateKey = getPrivateFromWallet();
    const key = EC.keyFromPrivate(privateKey, 'hex');
    return key.getPublic().encode('hex');
};

const generatePrivateKey = (): string => {
    const keyPair = EC.genKeyPair();
    const privateKey = keyPair.getPrivate();
    return privateKey.toString(16);
};

const initWallet = () => {
    // let's not override existing private keys
    if (existsSync(privateKeyLocation)) {
        console.log("You already have a private key, so none created");
        return;
    }
    const newPrivateKey = generatePrivateKey();

    writeFileSync(privateKeyLocation, newPrivateKey);
    console.log('new wallet with private key created to : %s', privateKeyLocation);
};

const deleteWallet = () => {
    if (existsSync(privateKeyLocation)) {
        unlinkSync(privateKeyLocation);
    }
};

/*
      BALANCE ZA CURRENCY
*/
const getBalance = (address: string, unspentTxOuts: UnspentTxOut[]): number => {
    console.log("Address: "+ address+ "Uspent txOuts" + JSON.stringify(unspentTxOuts,null,2));
    console.log(_(findUnspentTxOuts(address, unspentTxOuts))
        .map((uTxO: UnspentTxOut) => uTxO.amount)
        .sum());
    return _(findUnspentTxOuts(address, unspentTxOuts))
        .map((uTxO: UnspentTxOut) => uTxO.amount)
        .sum();
};

/*
      BALANCE ZA VICTORY POINTS
*/
const getBalanceVictoryPoints = (address: string, unspentTxOuts: UnspentTxOutVictoryPoints[]): number => {
  console.log("Address: "+ address+ "Uspent txOuts" + JSON.stringify(unspentTxOuts,null,2));
  console.log(_(findUnspentTxOutsVictoryPoints(address, unspentTxOuts))
      .map((uTxO: UnspentTxOutVictoryPoints) => uTxO.amount)
      .sum());
    return _(findUnspentTxOutsVictoryPoints(address, unspentTxOuts))
        .map((uTxO: UnspentTxOutVictoryPoints) => uTxO.amount)
        .sum();
};

/*
    NEPORABLJENI IZHODI ZA CURRENCY
*/
const findUnspentTxOuts = (ownerAddress: string, unspentTxOuts: UnspentTxOut[]) => {
    return _.filter(unspentTxOuts, (uTxO: UnspentTxOut) => uTxO.address === ownerAddress);
};

/*
    NEPORABLJENI IZHODI ZA VICTORY POINTS
*/
const findUnspentTxOutsVictoryPoints = (ownerAddress: string, unspentTxOuts: UnspentTxOutVictoryPoints[]) => {
    return _.filter(unspentTxOuts, (uTxO: UnspentTxOutVictoryPoints) => uTxO.address === ownerAddress);
};

/*
    CURRENCY
    LOOPA ČEZ NEPORABLJENE OUTPUTE TRANSAKCIJ, DOKLER NJIHOV SEŠTEVEK NI VEČJI ALI ENAK
    VSOTI, KI SE JO ŽELI POSLATI
*/
const findTxOutsForAmount = (amount: number, myUnspentTxOuts: UnspentTxOut[]) => {
    let currentAmount = 0;
    const includedUnspentTxOuts = [];
    for (const myUnspentTxOut of myUnspentTxOuts) {
        includedUnspentTxOuts.push(myUnspentTxOut);
        currentAmount = currentAmount + myUnspentTxOut.amount;
        if (currentAmount >= amount) {
            const leftOverAmount = currentAmount - amount;
            return {includedUnspentTxOuts, leftOverAmount};
        }
    }

    const eMsg = 'Cannot create transaction from the available unspent transaction outputs.' +
        ' Required amount:' + amount + '. Available unspentTxOuts:' + JSON.stringify(myUnspentTxOuts);
    throw Error(eMsg);
};

/*
    VICTORY
    LOOPA ČEZ NEPORABLJENE OUTPUTE TRANSAKCIJ, DOKLER NJIHOV SEŠTEVEK NI VEČJI ALI ENAK
    VSOTI, KI SE JO ŽELI POSLATI
*/
const findTxOutsForAmountVictoryPoints = (amount: number, myUnspentTxOuts: UnspentTxOutVictoryPoints[]) => {
    let currentAmount = 0;
    const includedUnspentTxOuts = [];
    for (const myUnspentTxOut of myUnspentTxOuts) {
        includedUnspentTxOuts.push(myUnspentTxOut);
        currentAmount = currentAmount + myUnspentTxOut.amount;
        if (currentAmount >= amount) {
            const leftOverAmount = currentAmount - amount;
            return {includedUnspentTxOuts, leftOverAmount};
        }
    }

    const eMsg = 'Cannot create transaction from the available unspent transaction outputs.' +
        ' Required amount:' + amount + '. Available unspentTxOuts:' + JSON.stringify(myUnspentTxOuts);
    throw Error(eMsg);
};

/*
    CURRENCY
    USTVARI txOut ZA PREJEMNIKA KOVANCEV IN EN txOut ZA PREOSTANEK,
    ČE PREOSTANEK NI ENAK 0

*/
const createTxOuts = (receiverAddress: string, myAddress: string, amount, leftOverAmount: number) => {
    const txOut1: TxOut = new TxOut(receiverAddress, amount);
    if (leftOverAmount === 0) {
        return [txOut1];
    } else {
        const leftOverTx = new TxOut(myAddress, leftOverAmount);
        return [txOut1, leftOverTx];
    }
};

/*
    VICTORY POINTS
    USTVARI txOut ZA PREJEMNIKA KOVANCEV IN EN txOut ZA PREOSTANEK,
    ČE PREOSTANEK NI ENAK 0

*/
const createTxOutsVictoryPoints = (receiverAddress: string, myAddress: string, amount, leftOverAmount: number) => {
    const txOut1: TxOutVictoryPoints = new TxOutVictoryPoints(receiverAddress, amount);
    if (leftOverAmount === 0) {
        return [txOut1];
    } else {
        const leftOverTx = new TxOutVictoryPoints(myAddress, leftOverAmount);
        return [txOut1, leftOverTx];
    }
};

/*
    CURRENCY
*/
const filterTxPoolTxs = (unspentTxOuts: UnspentTxOut[], transactionPool: Transaction[]): UnspentTxOut[] => {
    const txIns: TxIn[] = _(transactionPool)
        .map((tx: Transaction) => tx.txIns)
        .flatten()
        .value();
    const removable: UnspentTxOut[] = [];
    for (const unspentTxOut of unspentTxOuts) {
        const txIn = _.find(txIns, (aTxIn: TxIn) => {
            return aTxIn.txOutIndex === unspentTxOut.txOutIndex && aTxIn.txOutId === unspentTxOut.txOutId;
        });

        if (txIn === undefined) {

        } else {
            removable.push(unspentTxOut);
        }
    }

    return _.without(unspentTxOuts, ...removable);
};

/*
    VICTORY
*/
const filterTxPoolTxsVictoryPoints = (unspentTxOuts: UnspentTxOutVictoryPoints[], transactionPool: TransactionVictoryPoints[]): UnspentTxOutVictoryPoints[] => {
    const txIns: TxInVictoryPoints[] = _(transactionPool)
        .map((tx: TransactionVictoryPoints) => tx.txIns)
        .flatten()
        .value();
    const removable: UnspentTxOutVictoryPoints[] = [];
    for (const unspentTxOut of unspentTxOuts) {
        const txIn = _.find(txIns, (aTxIn: TxInVictoryPoints) => {
            return aTxIn.txOutIndex === unspentTxOut.txOutIndex && aTxIn.txOutId === unspentTxOut.txOutId;
        });

        if (txIn === undefined) {

        } else {
            removable.push(unspentTxOut);
        }
    }

    return _.without(unspentTxOuts, ...removable);
};

/*
    CURRENCY
*/
const createTransaction = (receiverAddress: string, amount: number, privateKey: string,
                           unspentTxOuts: UnspentTxOut[], txPool: Transaction[]): Transaction => {

    console.log('txPool: %s', JSON.stringify(txPool));
    const myAddress: string = getPublicKey(privateKey);
    const myUnspentTxOutsA = unspentTxOuts.filter((uTxO: UnspentTxOut) => uTxO.address === myAddress);

    const myUnspentTxOuts = filterTxPoolTxs(myUnspentTxOutsA, txPool);

    // filter from unspentOutputs such inputs that are referenced in pool
    const {includedUnspentTxOuts, leftOverAmount} = findTxOutsForAmount(amount, myUnspentTxOuts);

    const toUnsignedTxIn = (unspentTxOut: UnspentTxOut) => {
        const txIn: TxIn = new TxIn();
        txIn.txOutId = unspentTxOut.txOutId;
        txIn.txOutIndex = unspentTxOut.txOutIndex;
        return txIn;
    };

    const unsignedTxIns: TxIn[] = includedUnspentTxOuts.map(toUnsignedTxIn);

    const tx: Transaction = new Transaction();
    tx.txIns = unsignedTxIns;
    tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);
    tx.id = getTransactionId(tx);

    tx.txIns = tx.txIns.map((txIn: TxIn, index: number) => {
        txIn.signature = signTxIn(tx, index, privateKey, unspentTxOuts);
        return txIn;
    });

    return tx;
};

/*
    VICTORY
*/
const createTransactionVictoryPoints = (receiverAddress: string, amount: number, privateKey: string,
                           unspentTxOuts: UnspentTxOutVictoryPoints[], txPool: TransactionVictoryPoints[]): TransactionVictoryPoints => {

    console.log('txPool: %s', JSON.stringify(txPool));
    const myAddress: string = getPublicKey(privateKey);
    const myUnspentTxOutsA = unspentTxOuts.filter((uTxO: UnspentTxOutVictoryPoints) => uTxO.address === myAddress);

    const myUnspentTxOuts = filterTxPoolTxsVictoryPoints(myUnspentTxOutsA, txPool);

    // filter from unspentOutputs such inputs that are referenced in pool
    const {includedUnspentTxOuts, leftOverAmount} = findTxOutsForAmountVictoryPoints(amount, myUnspentTxOuts);

    const toUnsignedTxIn = (unspentTxOut: UnspentTxOutVictoryPoints) => {
        const txIn: TxInVictoryPoints = new TxInVictoryPoints();
        txIn.txOutId = unspentTxOut.txOutId;
        txIn.txOutIndex = unspentTxOut.txOutIndex;
        return txIn;
    };

    const unsignedTxIns: TxInVictoryPoints[] = includedUnspentTxOuts.map(toUnsignedTxIn);

    const tx: TransactionVictoryPoints = new TransactionVictoryPoints();
    tx.txIns = unsignedTxIns;
    tx.txOuts = createTxOutsVictoryPoints(receiverAddress, myAddress, amount, leftOverAmount);
    tx.id = getTransactionIdVictoryPoints(tx);

    tx.txIns = tx.txIns.map((txIn: TxInVictoryPoints, index: number) => {
        txIn.signature = signTxInVictoryPoints(tx, index, privateKey, unspentTxOuts);
        return txIn;
    });

    return tx;
};

export {createTransaction, getPublicFromWallet,
    getPrivateFromWallet, getBalance, generatePrivateKey, initWallet, deleteWallet, findUnspentTxOuts,
    createTransactionVictoryPoints, getBalanceVictoryPoints,findUnspentTxOutsVictoryPoints};
