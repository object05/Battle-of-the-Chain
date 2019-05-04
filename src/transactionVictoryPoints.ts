import * as CryptoJS from 'crypto-js';
import * as ecdsa from 'elliptic';
import * as _ from 'lodash';

const ec = new ecdsa.ec('secp256k1'); //ECDSA algoritem za kriptografijo z eliptičnimi krivuljami

/*
        ZA "COINBASE TRANSACTION"
        VEDNO JE PRVA TRANSAKCIJA V BLOCKU, KATERO VKLJUČI MINER BLOCKA
        --> ČE NAJDEŠ BLOCK, DOBIŠ 50 KOVANCEV

*/
const COINBASE_AMOUNT_VICTORY_POINTS: number = 50;

/*
        RAZRED ZA NEPORABLJENE TRANSAKCIJE
        INPUT TRANSAKCIJE SE MORA VEDNO NANAŠATI NA NEPORABLJEN IZHOD TRANSAKCIJE.

        POSLEDICA --> KO IMAŠ V LASTI NEKAJ KOVANCEV V BLOCKCHAINU, IMAŠ DEJANSKO LIST
        NEPORABLJENIH IZHODOV TRANSAKCIJ KATERIH JAVNI KLJUČ SE UJEMA S TVOJIM PRIVATNIM

        LIST SE V TEM PRIMERU POSODABLJA KO SE TRANSAKCIJE SPROCESIRAJO IN DODAJO V BLOCKCHAIN
*/
class UnspentTxOutVictoryPoints {
    public readonly txOutId: string;
    public readonly txOutIndex: number;
    public readonly address: string;
    public readonly amount: number;

    constructor(txOutId: string, txOutIndex: number, address: string, amount: number) {
        this.txOutId = txOutId;
        this.txOutIndex = txOutIndex;
        this.address = address;
        this.amount = amount;
    }
}

/*
        RAZRED ZA VHOD TRANSAKCIJE
        (IZ KJE PRIHAJAJO KOVANCI)

        "Odklene" kovance s pomočjo podpisa
*/
class TxInVictoryPoints {
    public txOutId: string;
    public txOutIndex: number;
    public signature: string;
}

/*
        RAZRED ZA IZHOD TRANSAKCIJE
        (KAM GREJO KOVANCI)

        "Zaklene kovance"
*/
class TxOutVictoryPoints {
    public address: string; //ECDSA Public Key
    public amount: number; //Število kovancev

    constructor(address: string, amount: number) {
        this.address = address;
        this.amount = amount;
    }
}

/*
        RAZRED ZA TRANSAKCIJO
*/
class TransactionVictoryPoints {

    public id: string;

    public txIns: TxInVictoryPoints[];
    public txOuts: TxOutVictoryPoints[];
}

/*
        ID TRANSAKCIJE JE IZRAČUNAN IZ HASHA VSEBINE TRANSAKCIJE
        (brez podpisa txId-jev, ker se ta doda kasneje v transakciji)
*/
const getTransactionIdVictoryPoints = (transaction: TransactionVictoryPoints): string => {
    const txInContent: string = transaction.txIns
        .map((txIn: TxInVictoryPoints) => txIn.txOutId + txIn.txOutIndex)
        .reduce((a, b) => a + b, '');

    const txOutContent: string = transaction.txOuts
        .map((txOut: TxOutVictoryPoints) => txOut.address + txOut.amount)
        .reduce((a, b) => a + b, '');

    return CryptoJS.SHA256(txInContent + txOutContent).toString();
};

/*
    KLIČE FUNKCIJO, KI PREVERI ALI JE STRUKTURA TRANSAKCIJE VELJAVNA IN
    PREVERI VELJAVNOST PARAMETROV
*/
const validateTransactionVictoryPoints = (transaction: TransactionVictoryPoints, aUnspentTxOuts: UnspentTxOutVictoryPoints[]): boolean => {

    if(!isValidTransactionVictoryPointsStructure(transaction)) {
        return false;
    }
    /*
            PREVERI ALI JE ID TRANSAKCIJE PRAVILNO IZRAČUNAN
    */
    if (getTransactionIdVictoryPoints(transaction) !== transaction.id) {
        console.log('invalid tx id: ' + transaction.id);
        return false;
    }
    /*
            PREVERI ALI SO PODPISI V txIn -ih VELJAVNI IN
            DA REFERENCIRANI IZHODI ŠE NISO PORABLJENI
    */
    const hasValidTxIns: boolean = transaction.txIns
        .map((txIn) => validateTxInVictoryPoints(txIn, transaction, aUnspentTxOuts))
        .reduce((a, b) => a && b, true);

    if (!hasValidTxIns) {
        console.log('some of the txIns are invalid in tx: ' + transaction.id);
        return false;
    }

    /*
            PREVERI ALI JE VSOTA KOVANCEV V IZHODIH IN VHODIH ENAKA
            (MORA BITI)
    */
    const totalTxInValues: number = transaction.txIns
        .map((txIn) => getTxInAmountVictoryPoints(txIn, aUnspentTxOuts))
        .reduce((a, b) => (a + b), 0);

    const totalTxOutValues: number = transaction.txOuts
        .map((txOut) => txOut.amount)
        .reduce((a, b) => (a + b), 0);

    if (totalTxOutValues !== totalTxInValues) {
        console.log('totalTxOutValues !== totalTxInValues in tx: ' + transaction.id);
        return false;
    }

    return true;
};

/*
        PREVERI ALI SO TRANSAKCIJE V BLOCKU VELJAVNE
*/
const validateBlockTransactionsVictoryPoints = (aTransactions: TransactionVictoryPoints[], aUnspentTxOuts: UnspentTxOutVictoryPoints[], blockIndex: number): boolean => {
    const coinbaseTx = aTransactions[0];
    if (!validateCoinbaseTxVictoryPoints(coinbaseTx, blockIndex)) {
        console.log('invalid coinbase transaction: ' + JSON.stringify(coinbaseTx));
        return false;
    }

    /*
            PREVERI ALI OBSTAJAJO DUPLIKATI txIn,
            VSAK JE LAHKO VKLJUČEN LE ENKRAT
    */
    const txIns: TxInVictoryPoints[] = _(aTransactions)
        .map((tx) => tx.txIns)
        .flatten()
        .value();

    if (hasDuplicatesVictoryPoints(txIns)) {
        return false;
    }

    /*
            VALIDIRAJ VSE TRANSAKCIJE RAZEN COINBASE
    */
    const normalTransactions: TransactionVictoryPoints[] = aTransactions.slice(1);
    return normalTransactions.map((tx) => validateTransactionVictoryPoints(tx, aUnspentTxOuts))
        .reduce((a, b) => (a && b), true);

};


/*
        PREVERI ALI OBSTAJAJO DUPLIKATI txIn
*/
const hasDuplicatesVictoryPoints = (txIns: TxInVictoryPoints[]): boolean => {
    const groups = _.countBy(txIns, (txIn: TxInVictoryPoints) => txIn.txOutId + txIn.txOutIndex);
    return _(groups)
        .map((value, key) => {
            if (value > 1) {
                console.log('duplicate txIn: ' + key);
                return true;
            } else {
                return false;
            }
        })
        .includes(true);
};

/*
        PREVERI ALI JE COINBASE TRANSAKCIJA VELJAVNA
*/
const validateCoinbaseTxVictoryPoints = (transaction: TransactionVictoryPoints, blockIndex: number): boolean => {
    if (transaction == null) {
        console.log('the first transaction in the block must be coinbase transaction');
        return false;
    }
    if (getTransactionIdVictoryPoints(transaction) !== transaction.id) {
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
    if (transaction.txOuts[0].amount !== COINBASE_AMOUNT_VICTORY_POINTS) {
        console.log('invalid coinbase amount in coinbase transaction');
        return false;
    }
    return true;
};

/*
        PREVERI ALI JE txIn VELAVEN
*/
const validateTxInVictoryPoints = (txIn: TxInVictoryPoints, transaction: TransactionVictoryPoints, aUnspentTxOuts: UnspentTxOutVictoryPoints[]): boolean => {
    const referencedUTxOut: UnspentTxOutVictoryPoints =
        aUnspentTxOuts.find((uTxO) => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex);
    if (referencedUTxOut == null) {
        console.log('referenced txOut not found: ' + JSON.stringify(txIn));
        return false;
    }
    const address = referencedUTxOut.address;

    const key = ec.keyFromPublic(address, 'hex');
    const validSignature: boolean = key.verify(transaction.id, txIn.signature);
    if (!validSignature) {
        console.log('invalid txIn signature: %s txId: %s address: %s', txIn.signature, transaction.id, referencedUTxOut.address);
        return false;
    }
    return true;
};


const getTxInAmountVictoryPoints = (txIn: TxInVictoryPoints, aUnspentTxOuts: UnspentTxOutVictoryPoints[]): number => {
    return findUnspentTxOutVictoryPoints(txIn.txOutId, txIn.txOutIndex, aUnspentTxOuts).amount;
};

const findUnspentTxOutVictoryPoints = (transactionId: string, index: number, aUnspentTxOuts: UnspentTxOutVictoryPoints[]): UnspentTxOutVictoryPoints => {
    return aUnspentTxOuts.find((uTxO) => uTxO.txOutId === transactionId && uTxO.txOutIndex === index);
};

const getCoinbaseTransactionVictoryPoints = (address: string, blockIndex: number): TransactionVictoryPoints => {
    const t = new TransactionVictoryPoints();
    const txIn: TxInVictoryPoints = new TxInVictoryPoints();
    txIn.signature = '';
    txIn.txOutId = '';
    txIn.txOutIndex = blockIndex;

    t.txIns = [txIn];
    t.txOuts = [new TxOutVictoryPoints(address, COINBASE_AMOUNT_VICTORY_POINTS)];
    console.log("GET COINBASE TRANSACTION VICTORY POINTS"+ JSON.stringify(t, null,2));
    t.id = getTransactionIdVictoryPoints(t);
    return t;
};

/*
      TRANSAKCIJE SO JAVNE, KAR POMENI DA LAHKO VSAK DOSTOPA DO NJIH ŠE PREDEN SO DODANE V BLOCKCHAINU
      KO SE PODPIŠE INPUT TRANSAKCIJE, BO PODPISAN SAMO ID TRANSAKCIJE.
      ČE SE KAKRŠNIKOLI PODATKI SPREMENIJO, SE MORA SPREMENIT TUDI ID TRANSAKCIJE, KAR POVZROČI DA JE
      TRANSAKCIJA NEVELJAVNA
*/
const signTxInVictoryPoints = (transaction: TransactionVictoryPoints, txInIndex: number,
                  privateKey: string, aUnspentTxOuts: UnspentTxOutVictoryPoints[]): string => {
    const txIn: TxInVictoryPoints = transaction.txIns[txInIndex];

    const dataToSign = transaction.id;
    const referencedUnspentTxOut: UnspentTxOutVictoryPoints = findUnspentTxOutVictoryPoints(txIn.txOutId, txIn.txOutIndex, aUnspentTxOuts);
    if (referencedUnspentTxOut == null) {
        console.log('could not find referenced txOut');
        throw Error();
    }
    const referencedAddress = referencedUnspentTxOut.address;

    if (getPublicKeyVictoryPoints(privateKey) !== referencedAddress) {
        console.log('trying to sign an input with private' +
            ' key that does not match the address that is referenced in txIn');
        throw Error();
    }
    const key = ec.keyFromPrivate(privateKey, 'hex');
    const signature: string = toHexString(key.sign(dataToSign).toDER());

    return signature;
};

/*
      POSODOBITEV NEPOTRJENIH TRANSAKCIJ
*/
const updateUnspentTxOutsVictoryPoints = (aTransactions: TransactionVictoryPoints[], aUnspentTxOuts: UnspentTxOutVictoryPoints[]): UnspentTxOutVictoryPoints[] => {
    /*
            PRIDOBI VSE NOVE NEPOTRJENE TRANSAKCIJE
    */
    const newUnspentTxOuts: UnspentTxOutVictoryPoints[] = aTransactions
        .map((t) => {
            return t.txOuts.map((txOut, index) => new UnspentTxOutVictoryPoints(t.id, index, txOut.address, txOut.amount));
        })
        .reduce((a, b) => a.concat(b), []);
    /*
            KATERI IZHODI TRANSAKCIJ SE PORABIJO Z NOVIMI TRANSAKCIJAMI
    */
    const consumedTxOuts: UnspentTxOutVictoryPoints[] = aTransactions
        .map((t) => t.txIns)
        .reduce((a, b) => a.concat(b), [])
        .map((txIn) => new UnspentTxOutVictoryPoints(txIn.txOutId, txIn.txOutIndex, '', 0));

    /*
            NOVE PREOSTALE NEPOTRJENE TRANSAKCIJE
    */
    const resultingUnspentTxOuts = aUnspentTxOuts
        .filter(((uTxO) => !findUnspentTxOutVictoryPoints(uTxO.txOutId, uTxO.txOutIndex, consumedTxOuts)))
        .concat(newUnspentTxOuts);

    console.log("resultingUnspentTxOuts: "+ JSON.stringify(resultingUnspentTxOuts, null, 2));

    return resultingUnspentTxOuts;   //TU SE ZAMENJA KOT JE TREBA (VRAČA PRAVILEN REZULTAT)
};

const processTransactionsVictoryPoints = (aTransactions: TransactionVictoryPoints[], aUnspentTxOuts: UnspentTxOutVictoryPoints[], blockIndex: number) => {

    if (!validateBlockTransactionsVictoryPoints(aTransactions, aUnspentTxOuts, blockIndex)) {
        console.log('invalid block transactions');
        return null;
    }
    return updateUnspentTxOutsVictoryPoints(aTransactions, aUnspentTxOuts);
};

const toHexString = (byteArray): string => {
    return Array.from(byteArray, (byte: any) => {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
};

const getPublicKeyVictoryPoints = (aPrivateKey: string): string => {
    return ec.keyFromPrivate(aPrivateKey, 'hex').getPublic().encode('hex');
};

const isValidTxInStructureVictoryPoints = (txIn: TxInVictoryPoints): boolean => {
    if (txIn == null) {
        console.log('txIn is null');
        return false;
    } else if (typeof txIn.signature !== 'string') {
        console.log('invalid signature type in txIn');
        return false;
    } else if (typeof txIn.txOutId !== 'string') {
        console.log('invalid txOutId type in txIn');
        return false;
    } else if (typeof  txIn.txOutIndex !== 'number') {
        console.log('invalid txOutIndex type in txIn');
        return false;
    } else {
        return true;
    }
};

const isValidTxOutStructureVictoryPoints = (txOut: TxOutVictoryPoints): boolean => {
    if (txOut == null) {
        console.log('txOut is null');
        return false;
    } else if (typeof txOut.address !== 'string') {
        console.log('invalid address type in txOut');
        return false;
    } else if (!isValidAddressVictoryPoints(txOut.address)) {
        console.log('invalid TxOut address');
        return false;
    } else if (typeof txOut.amount !== 'number') {
        console.log('invalid amount type in txOut');
        return false;
    } else {
        return true;
    }
};

/*
        PREVERI ALI JE STRUKTURA TRANSAKCIJE VELJAVNA
*/
const isValidTransactionVictoryPointsStructure = (transaction: TransactionVictoryPoints) => {
    if (typeof transaction.id !== 'string') {
        console.log('transactionId missing');
        return false;
    }
    if (!(transaction.txIns instanceof Array)) {
        console.log('invalid txIns type in transaction');
        return false;
    }
    if (!transaction.txIns
            .map(isValidTxInStructureVictoryPoints)
            .reduce((a, b) => (a && b), true)) {
        return false;
    }

    if (!(transaction.txOuts instanceof Array)) {
        console.log('invalid txIns type in transaction');
        return false;
    }

    if (!transaction.txOuts
            .map(isValidTxOutStructureVictoryPoints)
            .reduce((a, b) => (a && b), true)) {
        return false;
    }
    return true;
};

// valid address is a valid ecdsa public key in the 04 + X-coordinate + Y-coordinate format
const isValidAddressVictoryPoints = (address: string): boolean => {
    if (address.length !== 130) {
        console.log(address);
        console.log('invalid public key length');
        return false;
    } else if (address.match('^[a-fA-F0-9]+$') === null) {
        console.log('public key must contain only hex characters');
        return false;
    } else if (!address.startsWith('04')) {
        console.log('public key must start with 04');
        return false;
    }
    return true;
};

export {
    processTransactionsVictoryPoints, signTxInVictoryPoints, getTransactionIdVictoryPoints, isValidAddressVictoryPoints, validateTransactionVictoryPoints,
    UnspentTxOutVictoryPoints, TxInVictoryPoints, TxOutVictoryPoints, getCoinbaseTransactionVictoryPoints, getPublicKeyVictoryPoints, hasDuplicatesVictoryPoints,
    TransactionVictoryPoints
};
