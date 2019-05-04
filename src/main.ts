import * as  bodyParser from 'body-parser';
import * as express from 'express';

import {
    Block, generateNextBlock, generatenextBlockWithTransaction, generateRawNextBlock, getAccountBalance,
    getBlockchain, getMyUnspentTransactionOutputs, getUnspentTxOuts, sendTransaction,
    getUnspentTxOutsVictoryPoints, getMyUnspentTransactionOutputsVictoryPoints, sendTransactionVictoryPoints,
    getAccountBalanceVictoryPoints
} from './blockchain';
import {connectToPeers, getSockets, initP2PServer} from './p2p';
import {UnspentTxOut} from './transaction';
import {getTransactionPool} from './transactionPool';
import {getTransactionPoolVictoryPoints} from './transactionPoolVictoryPoints';
import {getPublicFromWallet, initWallet} from './wallet';
import * as _ from 'lodash';

const httpPort: number = parseInt(process.env.HTTP_PORT) || 3001;
const p2pPort: number = parseInt(process.env.P2P_PORT) || 6001;


const isAuthorized = () =>{
    if(httpPort == 3001 || httpPort == 3002 || httpPort == 3003){
        return true;
    }
    return false;
};

const isMaster = () =>{
    if(httpPort == 3001){
        return true;
    }
    return false;
};

const getMyPort = () => {
    return httpPort;
};

const initHttpServer = (myHttpPort: number) => {
    const app = express();
    app.use(bodyParser.json());

    app.use((err, req, res, next) => {
        if (err) {
            res.status(400).send(err.message);
        }
    });

    app.get('/blocks', (req, res) => {
        res.send(JSON.stringify(getBlockchain(), null, 2));
    });

    app.get('/transaction/:id', (req, res) => {
        const tx = _(getBlockchain())
            .map((blocks) => blocks.data)
            .flatten()
            .find({'id': req.params.id});
        res.send(tx);
    });

    app.get('/address/:address', (req, res) => {
        const unspentTxOuts: UnspentTxOut[] =
            _.filter(getUnspentTxOuts(), (uTxO) => uTxO.address === req.params.address);
        res.send({'unspentTxOuts': unspentTxOuts});
    });

    /*
        CURRENCY
    */
    app.get('/unspentTransactionOutputs', (req, res) => {
        res.send(getUnspentTxOuts());
    });

    /*
        VICTORY
    */
    app.get('/unspentTransactionOutputsVictoryPoints', (req, res) => {
        res.send(getUnspentTxOutsVictoryPoints());
    });


    /*
        CURRENCY
    */
    app.get('/myUnspentTransactionOutputs', (req, res) => {
        res.send(getMyUnspentTransactionOutputs());
    });

    /*
        VICTORY
    */
    app.get('/myUnspentTransactionOutputsVictory', (req, res) => {
        res.send(getMyUnspentTransactionOutputsVictoryPoints());
    });

    app.post('/mineRawBlock', (req, res) => {
        if (req.body.data == null) {
            res.send('data parameter is missing');
            return;
        }
        if (req.body.dataVictory == null) {
            res.send('dataVictory parameter is missing');
            return;
        }
        const newBlock: Block = generateRawNextBlock(req.body.data, req.body.dataVictory);
        if (newBlock === null) {
            res.status(400).send('could not generate block');
        } else {
            res.send(JSON.stringify(newBlock, null, 2));
        }
    });

    app.post('/mineBlock', (req, res) => {
        const newBlock: Block = generateNextBlock();
        if (newBlock === null) {
            res.status(400).send('could not generate block');
        } else {
            res.send(JSON.stringify(newBlock, null, 2)); //JSON.stringify(obj, null, 2);  res.send(newBlock);
        }
    });

    /*
      CURRENCY
    */
    app.get('/balance', (req, res) => {
        const balance: number = getAccountBalance();
        res.send({'balance': balance});
    });

    /*
      VICTORY
    */
    app.get('/balanceVictoryPoints', (req, res) => {
        const balance: number = getAccountBalanceVictoryPoints();
        res.send({'balance': balance});
    });

    app.get('/address', (req, res) => {
        const address: string = getPublicFromWallet();
        res.send({'address': address});
    });

    app.post('/mineTransaction', (req, res) => {
        const address = req.body.address;
        const amount = req.body.amount;
        try {
            const resp = generatenextBlockWithTransaction(address, amount);
            res.send(resp);
        } catch (e) {
            console.log(e.message);
            res.status(400).send(e.message);
        }
    });

    /*
      CURRENCY
    */
    app.post('/sendTransaction', (req, res) => {
        try {
            const address = req.body.address;
            const amount = req.body.amount;

            if (address === undefined || amount === undefined) {
                throw Error('invalid address or amount');
            }
            const resp = sendTransaction(address, amount);
            res.send(resp);
        } catch (e) {
            console.log(e.message);
            res.status(400).send(e.message);
        }
    });

    /*
      VICTORY
    */
    app.post('/sendTransactionVictoryPoints', (req, res) => {
        try {
            const address = req.body.address;
            const amount = req.body.amount;

            if (address === undefined || amount === undefined) {
                throw Error('invalid address or amount');
            }
            const resp = sendTransactionVictoryPoints(address, amount);
            res.send(resp);
        } catch (e) {
            console.log(e.message);
            res.status(400).send(e.message);
        }
    });

    /*
        CURRENCY
    */
    app.get('/transactionPool', (req, res) => {
        res.send(getTransactionPool());
    });

    /*
        VICTORY
    */
    app.get('/transactionPoolVictoryPoints', (req, res) => {
        res.send(getTransactionPoolVictoryPoints());
    });

    app.get('/peers', (req, res) => {
        res.send(getSockets().map((s: any) => s._socket.remoteAddress + ':' + s._socket.remotePort + '\n'));
    });
    app.post('/addPeer', (req, res) => {
        connectToPeers(req.body.peer);
        res.send();
    });

    app.post('/stop', (req, res) => {
        res.send({'msg' : 'stopping server'});
        process.exit();
    });

    app.listen(myHttpPort, () => {
        console.log('Listening http on port: ' + myHttpPort + '\n');
    });
};

initHttpServer(httpPort);
initP2PServer(p2pPort);


initWallet();

export {isAuthorized, isMaster, getMyPort};
