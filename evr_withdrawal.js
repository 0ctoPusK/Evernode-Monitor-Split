const { XrplClient } = require('xrpl-client');
const lib = require('xrpl-accountlib');
const { exit } = require('process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const verboseLog = process.env.verboseLog == "true";

const consoleLog = (msg) => {
  console.log(new Date().toISOString() + " " + msg);
};

const logVerbose = (msg) => {
  if (verboseLog) {
    consoleLog(msg);
  }
};

const accounts = process.env.accounts.split('\n');
const evrDestinationAccount = process.env.evrDestinationAccount;
const evrDestinationAccountTag = process.env.evrDestinationAccountTag;
const minimum_evr_transfer = process.env.minimum_evr_transfer * 1;

var secret = "";
var keypair;
if (process.env.secret) {
  secret = process.env.secret;
  keypair = lib.derive.familySeed(secret);
}

const xahaud = process.env.xahaud;
const client = new XrplClient(xahaud);

const transfer_funds = async () => {
  consoleLog("Starting the funds transfer batch...");

  for (const account of accounts) {
    if (account != "") {
      logVerbose("start the transferring process on account " + account);
      if (account != evrDestinationAccount) {
        logVerbose("getting account data on account " + account);
        const { account_data } = await client.send({ command: "account_info", account });

        let marker = '';
        const l = [];
        var balance = 0;
        while (typeof marker === 'string') {
          const lines = await client.send({ command: 'account_lines', account, marker: marker === '' ? undefined : marker });

          marker = lines?.marker === marker ? null : lines?.marker;
          lines.lines.forEach(t => {
          if (t.currency == "EVR" && t.account == trustlineAddress) {
            logVerbose(JSON.stringify(t))
            balance = parseFloat(balance) + parseFloat(t.balance);
          }
        })
        }

        if (balance <= minimum_evr_transfer) {
          logVerbose('# EVR Balance is below the minimum required to send the funds for account ' + account);
          continue;
        }

        const tx = {
          TransactionType: 'Payment',
          Account: account,
          Amount: {
            "currency": "EVR",
            "value": balance,
            "issuer": "rEvernodee8dJLaFsujS6q1EiXvZYmHXr8"
          },
          Destination: evrDestinationAccount,
          DestinationTag: evrDestinationAccountTag,
          Fee: '12',
          NetworkID: '21337',
          Sequence: account_data.Sequence
        };
        logVerbose("signing the transaction on account " + account);
        const { signedTransaction } = lib.sign(tx, keypair);
        logVerbose(JSON.stringify(tx));

        consoleLog("sending the EVR payment transaction on account " + account);
        const submit = await client.send({ command: 'submit', 'tx_blob': signedTransaction });
        consoleLog("Payment sent, result = " + submit.engine_result);
      }
    }
  }
};

const validate = () => {
  if (!accounts || accounts.length == 0 || accounts[0] == "") {
    consoleLog("no accounts set in .env file.");
    return false;
  }
  if (!secret) {
    consoleLog("secret not set in .env file.");
    return false;
  }
  return true;
};

const main = async () => {
  var valid = validate();
  if (valid) {
    await transfer_funds();
  }
  client.close();
  consoleLog('Shutting down...');
  setTimeout(function () {
    exit();
  }, 10000);
};

main();
