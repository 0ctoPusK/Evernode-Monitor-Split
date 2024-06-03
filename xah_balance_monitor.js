#!/usr/bin/env node
const { XrplClient } = require('xrpl-client');
const lib = require('xrpl-accountlib');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const xahaud = process.env.xahaud;
const client = new XrplClient(xahaud);
const accounts = process.env.accounts.split('\n');
const xahSourceAccount = process.env.xahSourceAccount;
const xah_balance_threshold = parseInt(process.env.xah_balance_threshold, 10) * 1000000;
const refill_amount = parseInt(process.env.refill_amount, 10) * 1000000;
const secret = process.env.secret;
const keypair = lib.derive.familySeed(secret);

const smtpEmail = process.env.smtpEmail;
const smtpKey = process.env.smtpKey;
const destinationEmail = process.env.destinationEmail || process.env.smtpEmail;

const transporter = nodemailer.createTransport({
    host: "smtp-relay.sendinblue.com",
    port: 587,
    auth: {
        user: smtpEmail,
        pass: smtpKey,
    },
});

const consoleLog = (msg) => {
    console.log(new Date().toISOString() + " " + msg);
};

const sendMail = async (subject, text) => {
    let mailOptions = {
        from: smtpEmail,
        to: destinationEmail,
        subject: subject,
        text: text
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        consoleLog('Email sent: ' + info.response);
    } catch (error) {
        consoleLog('Error sending email: ' + error);
    }
};

const monitor_balance = async () => {
    consoleLog("Monitoring the account XAH balance...");

    try {
        for (const account of accounts) {
            let account_data = await client.send({ command: "account_info", account: account }).catch(err => {
                throw new Error("Error fetching account info for " + account + ": " + err.message);
            });

            consoleLog("Balance for account " + account + " is " + account_data.account_data.Balance);
            if (parseInt(account_data.account_data.Balance) < xah_balance_threshold) {
                const filePath = path.resolve(__dirname, 'balanceLow-' + account + '.txt');
                consoleLog("Account balance for " + account + " is low, initiating funds transfer");

                let sourceData = await client.send({ command: "account_info", account: xahSourceAccount }).catch(err => {
                    throw new Error("Error fetching source account info: " + err.message);
                });

                if (sourceData.account_data.Balance < xah_balance_threshold) {
                    consoleLog("Not enough funds in source account to perform refill");
                    sendMail("Low Balance Alert", "The balance of source account is too low for refill.");
                } else {
                    const tx = {
                        TransactionType: 'Payment',
                        Account: xahSourceAccount,
                        Amount: refill_amount.toString(),
                        Destination: account,
                        DestinationTag: "",
                        Fee: '12',
                        NetworkID: '21337',
                        Sequence: sourceData.account_data.Sequence
                    };

                    const { signedTransaction } = lib.sign(tx, keypair);

                    consoleLog("Sending transaction " + JSON.stringify(tx));
                    await client.send({ command: 'submit', 'tx_blob': signedTransaction }).then(submit => {
                        consoleLog("Transaction result: " + submit.engine_result + " | " + submit.engine_result_message);
                    }).catch(err => {
                        throw new Error("Error submitting transaction: " + err.message);
                    });

                    if (fs.existsSync(filePath)) fs.rmSync(filePath);
                }
            }
        }
    } catch (error) {
        consoleLog("Error processing xah_balance_monitor: " + error.message);
    }
};

const main = async () => {
    await monitor_balance();
    client.close();
    consoleLog('Shutting down...');
};

main();
