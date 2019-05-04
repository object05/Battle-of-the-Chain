"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const elliptic_1 = require("elliptic");
const fs_1 = require("fs");
const _ = require("lodash");
const transaction_1 = require("./transaction");
const transactionVictoryPoints_1 = require("./transactionVictoryPoints");
const EC = new elliptic_1.ec('secp256k1');
const privateKeyLocation = process.env.PRIVATE_KEY || 'node/wallet/private_key';
const getPrivateFromWallet = () => {
    const buffer = fs_1.readFileSync(privateKeyLocation, 'utf8');
    return buffer.toString();
};
exports.getPrivateFromWallet = getPrivateFromWallet;
const getPublicFromWallet = () => {
    const privateKey = getPrivateFromWallet();
    const key = EC.keyFromPrivate(privateKey, 'hex');
    return key.getPublic().encode('hex');
};
exports.getPublicFromWallet = getPublicFromWallet;
const generatePrivateKey = () => {
    const keyPair = EC.genKeyPair();
    const privateKey = keyPair.getPrivate();
    return privateKey.toString(16);
};
exports.generatePrivateKey = generatePrivateKey;
const initWallet = () => {
    // let's not override existing private keys
    if (fs_1.existsSync(privateKeyLocation)) {
        console.log("You already have a private key, so none created");
        return;
    }
    const newPrivateKey = generatePrivateKey();
    fs_1.writeFileSync(privateKeyLocation, newPrivateKey);
    console.log('new wallet with private key created to : %s', privateKeyLocation);
};
exports.initWallet = initWallet;
const deleteWallet = () => {
    if (fs_1.existsSync(privateKeyLocation)) {
        fs_1.unlinkSync(privateKeyLocation);
    }
};
exports.deleteWallet = deleteWallet;
/*
      BALANCE ZA CURRENCY
*/
const getBalance = (address, unspentTxOuts) => {
    console.log("Address: " + address + "Uspent txOuts" + JSON.stringify(unspentTxOuts, null, 2));
    console.log(_(findUnspentTxOuts(address, unspentTxOuts))
        .map((uTxO) => uTxO.amount)
        .sum());
    return _(findUnspentTxOuts(address, unspentTxOuts))
        .map((uTxO) => uTxO.amount)
        .sum();
};
exports.getBalance = getBalance;
/*
      BALANCE ZA VICTORY POINTS
*/
const getBalanceVictoryPoints = (address, unspentTxOuts) => {
    console.log("Address: " + address + "Uspent txOuts" + JSON.stringify(unspentTxOuts, null, 2));
    console.log(_(findUnspentTxOutsVictoryPoints(address, unspentTxOuts))
        .map((uTxO) => uTxO.amount)
        .sum());
    return _(findUnspentTxOutsVictoryPoints(address, unspentTxOuts))
        .map((uTxO) => uTxO.amount)
        .sum();
};
exports.getBalanceVictoryPoints = getBalanceVictoryPoints;
/*
    NEPORABLJENI IZHODI ZA CURRENCY
*/
const findUnspentTxOuts = (ownerAddress, unspentTxOuts) => {
    return _.filter(unspentTxOuts, (uTxO) => uTxO.address === ownerAddress);
};
exports.findUnspentTxOuts = findUnspentTxOuts;
/*
    NEPORABLJENI IZHODI ZA VICTORY POINTS
*/
const findUnspentTxOutsVictoryPoints = (ownerAddress, unspentTxOuts) => {
    return _.filter(unspentTxOuts, (uTxO) => uTxO.address === ownerAddress);
};
exports.findUnspentTxOutsVictoryPoints = findUnspentTxOutsVictoryPoints;
/*
    CURRENCY
    LOOPA ČEZ NEPORABLJENE OUTPUTE TRANSAKCIJ, DOKLER NJIHOV SEŠTEVEK NI VEČJI ALI ENAK
    VSOTI, KI SE JO ŽELI POSLATI
*/
const findTxOutsForAmount = (amount, myUnspentTxOuts) => {
    let currentAmount = 0;
    const includedUnspentTxOuts = [];
    for (const myUnspentTxOut of myUnspentTxOuts) {
        includedUnspentTxOuts.push(myUnspentTxOut);
        currentAmount = currentAmount + myUnspentTxOut.amount;
        if (currentAmount >= amount) {
            const leftOverAmount = currentAmount - amount;
            return { includedUnspentTxOuts, leftOverAmount };
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
const findTxOutsForAmountVictoryPoints = (amount, myUnspentTxOuts) => {
    let currentAmount = 0;
    const includedUnspentTxOuts = [];
    for (const myUnspentTxOut of myUnspentTxOuts) {
        includedUnspentTxOuts.push(myUnspentTxOut);
        currentAmount = currentAmount + myUnspentTxOut.amount;
        if (currentAmount >= amount) {
            const leftOverAmount = currentAmount - amount;
            return { includedUnspentTxOuts, leftOverAmount };
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
const createTxOuts = (receiverAddress, myAddress, amount, leftOverAmount) => {
    const txOut1 = new transaction_1.TxOut(receiverAddress, amount);
    if (leftOverAmount === 0) {
        return [txOut1];
    }
    else {
        const leftOverTx = new transaction_1.TxOut(myAddress, leftOverAmount);
        return [txOut1, leftOverTx];
    }
};
/*
    VICTORY POINTS
    USTVARI txOut ZA PREJEMNIKA KOVANCEV IN EN txOut ZA PREOSTANEK,
    ČE PREOSTANEK NI ENAK 0

*/
const createTxOutsVictoryPoints = (receiverAddress, myAddress, amount, leftOverAmount) => {
    const txOut1 = new transactionVictoryPoints_1.TxOutVictoryPoints(receiverAddress, amount);
    if (leftOverAmount === 0) {
        return [txOut1];
    }
    else {
        const leftOverTx = new transactionVictoryPoints_1.TxOutVictoryPoints(myAddress, leftOverAmount);
        return [txOut1, leftOverTx];
    }
};
/*
    CURRENCY
*/
const filterTxPoolTxs = (unspentTxOuts, transactionPool) => {
    const txIns = _(transactionPool)
        .map((tx) => tx.txIns)
        .flatten()
        .value();
    const removable = [];
    for (const unspentTxOut of unspentTxOuts) {
        const txIn = _.find(txIns, (aTxIn) => {
            return aTxIn.txOutIndex === unspentTxOut.txOutIndex && aTxIn.txOutId === unspentTxOut.txOutId;
        });
        if (txIn === undefined) {
        }
        else {
            removable.push(unspentTxOut);
        }
    }
    return _.without(unspentTxOuts, ...removable);
};
/*
    VICTORY
*/
const filterTxPoolTxsVictoryPoints = (unspentTxOuts, transactionPool) => {
    const txIns = _(transactionPool)
        .map((tx) => tx.txIns)
        .flatten()
        .value();
    const removable = [];
    for (const unspentTxOut of unspentTxOuts) {
        const txIn = _.find(txIns, (aTxIn) => {
            return aTxIn.txOutIndex === unspentTxOut.txOutIndex && aTxIn.txOutId === unspentTxOut.txOutId;
        });
        if (txIn === undefined) {
        }
        else {
            removable.push(unspentTxOut);
        }
    }
    return _.without(unspentTxOuts, ...removable);
};
/*
    CURRENCY
*/
const createTransaction = (receiverAddress, amount, privateKey, unspentTxOuts, txPool) => {
    console.log('txPool: %s', JSON.stringify(txPool));
    const myAddress = transaction_1.getPublicKey(privateKey);
    const myUnspentTxOutsA = unspentTxOuts.filter((uTxO) => uTxO.address === myAddress);
    const myUnspentTxOuts = filterTxPoolTxs(myUnspentTxOutsA, txPool);
    // filter from unspentOutputs such inputs that are referenced in pool
    const { includedUnspentTxOuts, leftOverAmount } = findTxOutsForAmount(amount, myUnspentTxOuts);
    const toUnsignedTxIn = (unspentTxOut) => {
        const txIn = new transaction_1.TxIn();
        txIn.txOutId = unspentTxOut.txOutId;
        txIn.txOutIndex = unspentTxOut.txOutIndex;
        return txIn;
    };
    const unsignedTxIns = includedUnspentTxOuts.map(toUnsignedTxIn);
    const tx = new transaction_1.Transaction();
    tx.txIns = unsignedTxIns;
    tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);
    tx.id = transaction_1.getTransactionId(tx);
    tx.txIns = tx.txIns.map((txIn, index) => {
        txIn.signature = transaction_1.signTxIn(tx, index, privateKey, unspentTxOuts);
        return txIn;
    });
    return tx;
};
exports.createTransaction = createTransaction;
/*
    VICTORY
*/
const createTransactionVictoryPoints = (receiverAddress, amount, privateKey, unspentTxOuts, txPool) => {
    console.log('txPool: %s', JSON.stringify(txPool));
    const myAddress = transaction_1.getPublicKey(privateKey);
    const myUnspentTxOutsA = unspentTxOuts.filter((uTxO) => uTxO.address === myAddress);
    const myUnspentTxOuts = filterTxPoolTxsVictoryPoints(myUnspentTxOutsA, txPool);
    // filter from unspentOutputs such inputs that are referenced in pool
    const { includedUnspentTxOuts, leftOverAmount } = findTxOutsForAmountVictoryPoints(amount, myUnspentTxOuts);
    const toUnsignedTxIn = (unspentTxOut) => {
        const txIn = new transactionVictoryPoints_1.TxInVictoryPoints();
        txIn.txOutId = unspentTxOut.txOutId;
        txIn.txOutIndex = unspentTxOut.txOutIndex;
        return txIn;
    };
    const unsignedTxIns = includedUnspentTxOuts.map(toUnsignedTxIn);
    const tx = new transactionVictoryPoints_1.TransactionVictoryPoints();
    tx.txIns = unsignedTxIns;
    tx.txOuts = createTxOutsVictoryPoints(receiverAddress, myAddress, amount, leftOverAmount);
    tx.id = transactionVictoryPoints_1.getTransactionIdVictoryPoints(tx);
    tx.txIns = tx.txIns.map((txIn, index) => {
        txIn.signature = transactionVictoryPoints_1.signTxInVictoryPoints(tx, index, privateKey, unspentTxOuts);
        return txIn;
    });
    return tx;
};
exports.createTransactionVictoryPoints = createTransactionVictoryPoints;
//# sourceMappingURL=wallet.js.map