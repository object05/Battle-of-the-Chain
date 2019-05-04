"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const transactionVictoryPoints_1 = require("./transactionVictoryPoints");
let transactionPoolVictoryPoints = [];
const getTransactionPoolVictoryPoints = () => {
    return _.cloneDeep(transactionPoolVictoryPoints);
};
exports.getTransactionPoolVictoryPoints = getTransactionPoolVictoryPoints;
const addToTransactionPoolVictoryPoints = (tx, unspentTxOuts) => {
    if (!transactionVictoryPoints_1.validateTransactionVictoryPoints(tx, unspentTxOuts)) {
        throw Error('Trying to add invalid tx to pool');
    }
    if (!isValidTxForPoolVictoryPoints(tx, transactionPoolVictoryPoints)) {
        throw Error('Trying to add invalid tx to pool');
    }
    console.log('adding to txPool: %s', JSON.stringify(tx));
    transactionPoolVictoryPoints.push(tx);
};
exports.addToTransactionPoolVictoryPoints = addToTransactionPoolVictoryPoints;
const hasTxInVictoryPoints = (txIn, unspentTxOuts) => {
    const foundTxIn = unspentTxOuts.find((uTxO) => {
        return uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex;
    });
    return foundTxIn !== undefined;
};
const updateTransactionPoolVictoryPoints = (unspentTxOuts) => {
    const invalidTxs = [];
    for (const tx of transactionPoolVictoryPoints) {
        for (const txIn of tx.txIns) {
            if (!hasTxInVictoryPoints(txIn, unspentTxOuts)) {
                invalidTxs.push(tx);
                break;
            }
        }
    }
    if (invalidTxs.length > 0) {
        console.log('removing the following transactions from txPool: %s', JSON.stringify(invalidTxs));
        transactionPoolVictoryPoints = _.without(transactionPoolVictoryPoints, ...invalidTxs);
    }
};
exports.updateTransactionPoolVictoryPoints = updateTransactionPoolVictoryPoints;
const getTxPoolInsVictoryPoints = (aTransactionPool) => {
    return _(aTransactionPool)
        .map((tx) => tx.txIns)
        .flatten()
        .value();
};
const isValidTxForPoolVictoryPoints = (tx, aTtransactionPool) => {
    const txPoolIns = getTxPoolInsVictoryPoints(aTtransactionPool);
    const containsTxIn = (txIns, txIn) => {
        return _.find(txPoolIns, ((txPoolIn) => {
            return txIn.txOutIndex === txPoolIn.txOutIndex && txIn.txOutId === txPoolIn.txOutId;
        }));
    };
    for (const txIn of tx.txIns) {
        if (containsTxIn(txPoolIns, txIn)) {
            console.log('txIn already found in the txPool');
            return false;
        }
    }
    return true;
};
//# sourceMappingURL=transactionPoolVictoryPoints.js.map