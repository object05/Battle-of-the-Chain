"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bodyParser = require("body-parser");
const express = require("express");
const blockchain_1 = require("./blockchain");
const p2p_1 = require("./p2p");
const transactionPool_1 = require("./transactionPool");
const transactionPoolVictoryPoints_1 = require("./transactionPoolVictoryPoints");
const wallet_1 = require("./wallet");
const _ = require("lodash");
const httpPort = parseInt(process.env.HTTP_PORT) || 3001;
const p2pPort = parseInt(process.env.P2P_PORT) || 6001;
const isAuthorized = () => {
    if (httpPort == 3001 || httpPort == 3002 || httpPort == 3003) {
        return true;
    }
    return false;
};
exports.isAuthorized = isAuthorized;
const isMaster = () => {
    if (httpPort == 3001) {
        return true;
    }
    return false;
};
exports.isMaster = isMaster;
const getMyPort = () => {
    return httpPort;
};
exports.getMyPort = getMyPort;
const initHttpServer = (myHttpPort) => {
    const app = express();
    app.use(bodyParser.json());
    app.use((err, req, res, next) => {
        if (err) {
            res.status(400).send(err.message);
        }
    });
    app.get('/blocks', (req, res) => {
        res.send(JSON.stringify(blockchain_1.getBlockchain(), null, 2));
    });
    app.get('/transaction/:id', (req, res) => {
        const tx = _(blockchain_1.getBlockchain())
            .map((blocks) => blocks.data)
            .flatten()
            .find({ 'id': req.params.id });
        res.send(tx);
    });
    app.get('/address/:address', (req, res) => {
        const unspentTxOuts = _.filter(blockchain_1.getUnspentTxOuts(), (uTxO) => uTxO.address === req.params.address);
        res.send({ 'unspentTxOuts': unspentTxOuts });
    });
    /*
        CURRENCY
    */
    app.get('/unspentTransactionOutputs', (req, res) => {
        res.send(blockchain_1.getUnspentTxOuts());
    });
    /*
        VICTORY
    */
    app.get('/unspentTransactionOutputsVictoryPoints', (req, res) => {
        res.send(blockchain_1.getUnspentTxOutsVictoryPoints());
    });
    /*
        CURRENCY
    */
    app.get('/myUnspentTransactionOutputs', (req, res) => {
        res.send(blockchain_1.getMyUnspentTransactionOutputs());
    });
    /*
        VICTORY
    */
    app.get('/myUnspentTransactionOutputsVictory', (req, res) => {
        res.send(blockchain_1.getMyUnspentTransactionOutputsVictoryPoints());
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
        const newBlock = blockchain_1.generateRawNextBlock(req.body.data, req.body.dataVictory);
        if (newBlock === null) {
            res.status(400).send('could not generate block');
        }
        else {
            res.send(JSON.stringify(newBlock, null, 2));
        }
    });
    app.post('/mineBlock', (req, res) => {
        const newBlock = blockchain_1.generateNextBlock();
        if (newBlock === null) {
            res.status(400).send('could not generate block');
        }
        else {
            res.send(JSON.stringify(newBlock, null, 2)); //JSON.stringify(obj, null, 2);  res.send(newBlock);
        }
    });
    /*
      CURRENCY
    */
    app.get('/balance', (req, res) => {
        const balance = blockchain_1.getAccountBalance();
        res.send({ 'balance': balance });
    });
    /*
      VICTORY
    */
    app.get('/balanceVictoryPoints', (req, res) => {
        const balance = blockchain_1.getAccountBalanceVictoryPoints();
        res.send({ 'balance': balance });
    });
    app.get('/address', (req, res) => {
        const address = wallet_1.getPublicFromWallet();
        res.send({ 'address': address });
    });
    app.post('/mineTransaction', (req, res) => {
        const address = req.body.address;
        const amount = req.body.amount;
        try {
            const resp = blockchain_1.generatenextBlockWithTransaction(address, amount);
            res.send(resp);
        }
        catch (e) {
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
            const resp = blockchain_1.sendTransaction(address, amount);
            res.send(resp);
        }
        catch (e) {
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
            const resp = blockchain_1.sendTransactionVictoryPoints(address, amount);
            res.send(resp);
        }
        catch (e) {
            console.log(e.message);
            res.status(400).send(e.message);
        }
    });
    /*
        CURRENCY
    */
    app.get('/transactionPool', (req, res) => {
        res.send(transactionPool_1.getTransactionPool());
    });
    /*
        VICTORY
    */
    app.get('/transactionPoolVictoryPoints', (req, res) => {
        res.send(transactionPoolVictoryPoints_1.getTransactionPoolVictoryPoints());
    });
    app.get('/peers', (req, res) => {
        res.send(p2p_1.getSockets().map((s) => s._socket.remoteAddress + ':' + s._socket.remotePort + '\n'));
    });
    app.post('/addPeer', (req, res) => {
        p2p_1.connectToPeers(req.body.peer);
        res.send();
    });
    app.post('/stop', (req, res) => {
        res.send({ 'msg': 'stopping server' });
        process.exit();
    });
    app.listen(myHttpPort, () => {
        console.log('Listening http on port: ' + myHttpPort + '\n');
    });
};
initHttpServer(httpPort);
p2p_1.initP2PServer(p2pPort);
wallet_1.initWallet();
//# sourceMappingURL=main.js.map