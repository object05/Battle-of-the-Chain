"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CryptoJS = require("crypto-js");
const ecdsa = require("elliptic");
const _ = require("lodash");
const ec = new ecdsa.ec('secp256k1'); //ECDSA algoritem za kriptografijo z eliptičnimi krivuljami
/*
        ZA "COINBASE TRANSACTION"
        VEDNO JE PRVA TRANSAKCIJA V BLOCKU, KATERO VKLJUČI MINER BLOCKA
        --> ČE NAJDEŠ BLOCK, DOBIŠ 50 KOVANCEV

*/
const COINBASE_AMOUNT = 50;
/*
        RAZRED ZA NEPORABLJENE TRANSAKCIJE
        INPUT TRANSAKCIJE SE MORA VEDNO NANAŠATI NA NEPORABLJEN IZHOD TRANSAKCIJE.

        POSLEDICA --> KO IMAŠ V LASTI NEKAJ KOVANCEV V BLOCKCHAINU, IMAŠ DEJANSKO LIST
        NEPORABLJENIH IZHODOV TRANSAKCIJ KATERIH JAVNI KLJUČ SE UJEMA S TVOJIM PRIVATNIM

        LIST SE V TEM PRIMERU POSODABLJA KO SE TRANSAKCIJE SPROCESIRAJO IN DODAJO V BLOCKCHAIN
*/
class UnspentTxOut {
    constructor(txOutId, txOutIndex, address, amount) {
        this.txOutId = txOutId;
        this.txOutIndex = txOutIndex;
        this.address = address;
        this.amount = amount;
    }
}
exports.UnspentTxOut = UnspentTxOut;
/*
        RAZRED ZA VHOD TRANSAKCIJE
        (IZ KJE PRIHAJAJO KOVANCI)

        "Odklene" kovance s pomočjo podpisa
*/
class TxIn {
}
exports.TxIn = TxIn;
/*
        RAZRED ZA IZHOD TRANSAKCIJE
        (KAM GREJO KOVANCI)

        "Zaklene kovance"
*/
class TxOut {
    constructor(address, amount) {
        this.address = address;
        this.amount = amount;
    }
}
exports.TxOut = TxOut;
/*
        RAZRED ZA TRANSAKCIJO
*/
class Transaction {
}
exports.Transaction = Transaction;
/*
        ID TRANSAKCIJE JE IZRAČUNAN IZ HASHA VSEBINE TRANSAKCIJE
        (brez podpisa txId-jev, ker se ta doda kasneje v transakciji)
*/
const getTransactionId = (transaction) => {
    const txInContent = transaction.txIns
        .map((txIn) => txIn.txOutId + txIn.txOutIndex)
        .reduce((a, b) => a + b, '');
    const txOutContent = transaction.txOuts
        .map((txOut) => txOut.address + txOut.amount)
        .reduce((a, b) => a + b, '');
    return CryptoJS.SHA256(txInContent + txOutContent).toString();
};
exports.getTransactionId = getTransactionId;
/*
    KLIČE FUNKCIJO, KI PREVERI ALI JE STRUKTURA TRANSAKCIJE VELJAVNA IN
    PREVERI VELJAVNOST PARAMETROV
*/
const validateTransaction = (transaction, aUnspentTxOuts) => {
    if (!isValidTransactionStructure(transaction)) {
        return false;
    }
    /*
            PREVERI ALI JE ID TRANSAKCIJE PRAVILNO IZRAČUNAN
    */
    if (getTransactionId(transaction) !== transaction.id) {
        console.log('invalid tx id: ' + transaction.id);
        return false;
    }
    /*
            PREVERI ALI SO PODPISI V txIn -ih VELJAVNI IN
            DA REFERENCIRANI IZHODI ŠE NISO PORABLJENI
    */
    const hasValidTxIns = transaction.txIns
        .map((txIn) => validateTxIn(txIn, transaction, aUnspentTxOuts))
        .reduce((a, b) => a && b, true);
    if (!hasValidTxIns) {
        console.log('some of the txIns are invalid in tx: ' + transaction.id);
        return false;
    }
    /*
            PREVERI ALI JE VSOTA KOVANCEV V IZHODIH IN VHODIH ENAKA
            (MORA BITI)
    */
    const totalTxInValues = transaction.txIns
        .map((txIn) => getTxInAmount(txIn, aUnspentTxOuts))
        .reduce((a, b) => (a + b), 0);
    const totalTxOutValues = transaction.txOuts
        .map((txOut) => txOut.amount)
        .reduce((a, b) => (a + b), 0);
    if (totalTxOutValues !== totalTxInValues) {
        console.log('totalTxOutValues !== totalTxInValues in tx: ' + transaction.id);
        return false;
    }
    return true;
};
exports.validateTransaction = validateTransaction;
/*
        PREVERI ALI SO TRANSAKCIJE V BLOCKU VELJAVNE
*/
const validateBlockTransactions = (aTransactions, aUnspentTxOuts, blockIndex) => {
    const coinbaseTx = aTransactions[0];
    if (!validateCoinbaseTx(coinbaseTx, blockIndex)) {
        console.log('invalid coinbase transaction: ' + JSON.stringify(coinbaseTx));
        return false;
    }
    /*
            PREVERI ALI OBSTAJAJO DUPLIKATI txIn,
            VSAK JE LAHKO VKLJUČEN LE ENKRAT
    */
    const txIns = _(aTransactions)
        .map((tx) => tx.txIns)
        .flatten()
        .value();
    if (hasDuplicates(txIns)) {
        return false;
    }
    /*
            VALIDIRAJ VSE TRANSAKCIJE RAZEN COINBASE
    */
    const normalTransactions = aTransactions.slice(1);
    return normalTransactions.map((tx) => validateTransaction(tx, aUnspentTxOuts))
        .reduce((a, b) => (a && b), true);
};
/*
        PREVERI ALI OBSTAJAJO DUPLIKATI txIn
*/
const hasDuplicates = (txIns) => {
    const groups = _.countBy(txIns, (txIn) => txIn.txOutId + txIn.txOutIndex);
    return _(groups)
        .map((value, key) => {
        if (value > 1) {
            console.log('duplicate txIn: ' + key);
            return true;
        }
        else {
            return false;
        }
    })
        .includes(true);
};
exports.hasDuplicates = hasDuplicates;
/*
        PREVERI ALI JE COINBASE TRANSAKCIJA VELJAVNA
*/
const validateCoinbaseTx = (transaction, blockIndex) => {
    if (transaction == null) {
        console.log('the first transaction in the block must be coinbase transaction');
        return false;
    }
    if (getTransactionId(transaction) !== transaction.id) {
        console.log('invalid coinbase tx id: ' + transaction.id);
        return false;
    }
    if (transaction.txIns.length !== 1) {
        console.log('one txIn must be specified in the coinbase transaction');
        return;
    }
    if (transaction.txIns[0].txOutIndex !== blockIndex) {
        console.log('the txIn signature in coinbase tx must be the block height');
        return false;
    }
    if (transaction.txOuts.length !== 1) {
        console.log('invalid number of txOuts in coinbase transaction');
        return false;
    }
    if (transaction.txOuts[0].amount !== COINBASE_AMOUNT) {
        console.log('invalid coinbase amount in coinbase transaction');
        return false;
    }
    return true;
};
/*
        PREVERI ALI JE txIn VELAVEN
*/
const validateTxIn = (txIn, transaction, aUnspentTxOuts) => {
    const referencedUTxOut = aUnspentTxOuts.find((uTxO) => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex);
    if (referencedUTxOut == null) {
        console.log('referenced txOut not found: ' + JSON.stringify(txIn));
        return false;
    }
    const address = referencedUTxOut.address;
    const key = ec.keyFromPublic(address, 'hex');
    const validSignature = key.verify(transaction.id, txIn.signature);
    if (!validSignature) {
        console.log('invalid txIn signature: %s txId: %s address: %s', txIn.signature, transaction.id, referencedUTxOut.address);
        return false;
    }
    return true;
};
const getTxInAmount = (txIn, aUnspentTxOuts) => {
    return findUnspentTxOut(txIn.txOutId, txIn.txOutIndex, aUnspentTxOuts).amount;
};
const findUnspentTxOut = (transactionId, index, aUnspentTxOuts) => {
    return aUnspentTxOuts.find((uTxO) => uTxO.txOutId === transactionId && uTxO.txOutIndex === index);
};
const getCoinbaseTransaction = (address, blockIndex) => {
    const t = new Transaction();
    const txIn = new TxIn();
    txIn.signature = '';
    txIn.txOutId = '';
    txIn.txOutIndex = blockIndex;
    t.txIns = [txIn];
    t.txOuts = [new TxOut(address, COINBASE_AMOUNT)];
    t.id = getTransactionId(t);
    return t;
};
exports.getCoinbaseTransaction = getCoinbaseTransaction;
/*
      TRANSAKCIJE SO JAVNE, KAR POMENI DA LAHKO VSAK DOSTOPA DO NJIH ŠE PREDEN SO DODANE V BLOCKCHAINU
      KO SE PODPIŠE INPUT TRANSAKCIJE, BO PODPISAN SAMO ID TRANSAKCIJE.
      ČE SE KAKRŠNIKOLI PODATKI SPREMENIJO, SE MORA SPREMENIT TUDI ID TRANSAKCIJE, KAR POVZROČI DA JE
      TRANSAKCIJA NEVELJAVNA
*/
const signTxIn = (transaction, txInIndex, privateKey, aUnspentTxOuts) => {
    const txIn = transaction.txIns[txInIndex];
    const dataToSign = transaction.id;
    const referencedUnspentTxOut = findUnspentTxOut(txIn.txOutId, txIn.txOutIndex, aUnspentTxOuts);
    if (referencedUnspentTxOut == null) {
        console.log('could not find referenced txOut');
        throw Error();
    }
    const referencedAddress = referencedUnspentTxOut.address;
    if (getPublicKey(privateKey) !== referencedAddress) {
        console.log('trying to sign an input with private' +
            ' key that does not match the address that is referenced in txIn');
        throw Error();
    }
    const key = ec.keyFromPrivate(privateKey, 'hex');
    const signature = toHexString(key.sign(dataToSign).toDER());
    return signature;
};
exports.signTxIn = signTxIn;
/*
      POSODOBITEV NEPOTRJENIH TRANSAKCIJ
*/
const updateUnspentTxOuts = (aTransactions, aUnspentTxOuts) => {
    /*
            PRIDOBI VSE NOVE NEPOTRJENE TRANSAKCIJE
    */
    const newUnspentTxOuts = aTransactions
        .map((t) => {
        return t.txOuts.map((txOut, index) => new UnspentTxOut(t.id, index, txOut.address, txOut.amount));
    })
        .reduce((a, b) => a.concat(b), []);
    /*
            KATERI IZHODI TRANSAKCIJ SE PORABIJO Z NOVIMI TRANSAKCIJAMI
    */
    const consumedTxOuts = aTransactions
        .map((t) => t.txIns)
        .reduce((a, b) => a.concat(b), [])
        .map((txIn) => new UnspentTxOut(txIn.txOutId, txIn.txOutIndex, '', 0));
    /*
            NOVE PREOSTALE NEPOTRJENE TRANSAKCIJE
    */
    const resultingUnspentTxOuts = aUnspentTxOuts
        .filter(((uTxO) => !findUnspentTxOut(uTxO.txOutId, uTxO.txOutIndex, consumedTxOuts)))
        .concat(newUnspentTxOuts);
    return resultingUnspentTxOuts;
};
const processTransactions = (aTransactions, aUnspentTxOuts, blockIndex) => {
    if (!validateBlockTransactions(aTransactions, aUnspentTxOuts, blockIndex)) {
        console.log('invalid block transactions');
        return null;
    }
    return updateUnspentTxOuts(aTransactions, aUnspentTxOuts);
};
exports.processTransactions = processTransactions;
const toHexString = (byteArray) => {
    return Array.from(byteArray, (byte) => {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
};
const getPublicKey = (aPrivateKey) => {
    return ec.keyFromPrivate(aPrivateKey, 'hex').getPublic().encode('hex');
};
exports.getPublicKey = getPublicKey;
const isValidTxInStructure = (txIn) => {
    if (txIn == null) {
        console.log('txIn is null');
        return false;
    }
    else if (typeof txIn.signature !== 'string') {
        console.log('invalid signature type in txIn');
        return false;
    }
    else if (typeof txIn.txOutId !== 'string') {
        console.log('invalid txOutId type in txIn');
        return false;
    }
    else if (typeof txIn.txOutIndex !== 'number') {
        console.log('invalid txOutIndex type in txIn');
        return false;
    }
    else {
        return true;
    }
};
const isValidTxOutStructure = (txOut) => {
    if (txOut == null) {
        console.log('txOut is null');
        return false;
    }
    else if (typeof txOut.address !== 'string') {
        console.log('invalid address type in txOut');
        return false;
    }
    else if (!isValidAddress(txOut.address)) {
        console.log('invalid TxOut address');
        return false;
    }
    else if (typeof txOut.amount !== 'number') {
        console.log('invalid amount type in txOut');
        return false;
    }
    else {
        return true;
    }
};
/*
        PREVERI ALI JE STRUKTURA TRANSAKCIJE VELJAVNA
*/
const isValidTransactionStructure = (transaction) => {
    if (typeof transaction.id !== 'string') {
        console.log('transactionId missing');
        return false;
    }
    if (!(transaction.txIns instanceof Array)) {
        console.log('invalid txIns type in transaction');
        return false;
    }
    if (!transaction.txIns
        .map(isValidTxInStructure)
        .reduce((a, b) => (a && b), true)) {
        return false;
    }
    if (!(transaction.txOuts instanceof Array)) {
        console.log('invalid txIns type in transaction');
        return false;
    }
    if (!transaction.txOuts
        .map(isValidTxOutStructure)
        .reduce((a, b) => (a && b), true)) {
        return false;
    }
    return true;
};
// valid address is a valid ecdsa public key in the 04 + X-coordinate + Y-coordinate format
const isValidAddress = (address) => {
    if (address.length !== 130) {
        console.log(address);
        console.log('invalid public key length');
        return false;
    }
    else if (address.match('^[a-fA-F0-9]+$') === null) {
        console.log('public key must contain only hex characters');
        return false;
    }
    else if (!address.startsWith('04')) {
        console.log('public key must start with 04');
        return false;
    }
    return true;
};
exports.isValidAddress = isValidAddress;
//# sourceMappingURL=transaction.js.map