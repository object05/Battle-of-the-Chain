import * as _ from 'lodash';
import {TransactionVictoryPoints, TxInVictoryPoints, UnspentTxOutVictoryPoints, validateTransactionVictoryPoints} from './transactionVictoryPoints';

let transactionPoolVictoryPoints: TransactionVictoryPoints[] = [];

const getTransactionPoolVictoryPoints = () => {
    return _.cloneDeep(transactionPoolVictoryPoints);
};

const addToTransactionPoolVictoryPoints = (tx: TransactionVictoryPoints, unspentTxOuts: UnspentTxOutVictoryPoints[]) => {

    if (!validateTransactionVictoryPoints(tx, unspentTxOuts)) {
        throw Error('Trying to add invalid tx to pool');
    }

    if (!isValidTxForPoolVictoryPoints(tx, transactionPoolVictoryPoints)) {
        throw Error('Trying to add invalid tx to pool');
    }
    console.log('adding to txPool: %s', JSON.stringify(tx));
    transactionPoolVictoryPoints.push(tx);
};

const hasTxInVictoryPoints = (txIn: TxInVictoryPoints, unspentTxOuts: UnspentTxOutVictoryPoints[]): boolean => {
    const foundTxIn = unspentTxOuts.find((uTxO: UnspentTxOutVictoryPoints) => {
        return uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex;
    });
    return foundTxIn !== undefined;
};

const updateTransactionPoolVictoryPoints = (unspentTxOuts: UnspentTxOutVictoryPoints[]) => {
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

const getTxPoolInsVictoryPoints = (aTransactionPool: TransactionVictoryPoints[]): TxInVictoryPoints[] => {
    return _(aTransactionPool)
        .map((tx) => tx.txIns)
        .flatten()
        .value();
};

const isValidTxForPoolVictoryPoints = (tx: TransactionVictoryPoints, aTtransactionPool: TransactionVictoryPoints[]): boolean => {
    const txPoolIns: TxInVictoryPoints[] = getTxPoolInsVictoryPoints(aTtransactionPool);

    const containsTxIn = (txIns: TxInVictoryPoints[], txIn: TxInVictoryPoints) => {
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

export {addToTransactionPoolVictoryPoints, getTransactionPoolVictoryPoints, updateTransactionPoolVictoryPoints};
