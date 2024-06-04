const { XrplClient } = require('xrpl-client');
const lib = require('xrpl-accountlib');
const { exit } = require('process');
const path = require('path');
const nodemailer = require('nodemailer');
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
const reputationAccounts = process.env.reputationAccounts.split('\n');
const evr_balance_threshold = parseInt(process.env.evr_balance_threshold, 10);
const evr_refill_amount = parseInt(process.env.evr_refill_amount, 10);

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

  for (let i = 0; i < reputationAccounts.length; i++) {
    const reputationAccount = reputationAccounts[i];
    const sourceAccount = accounts[i];

    if (reputationAccount && sourceAccount) {
      const rep_balance = await GetEvrBalance(reputationAccount);
      const src_balance = await GetEvrBalance(sourceAccount);

      logVerbose("EVR Balance for reputation account " + reputationAccount + " is " + rep_balance);

      if (rep_balance <= evr_balance_threshold) {
        logVerbose("EVR balance is below the threshold for reputation account " + reputationAccount + ", initiating funds transfer from source account " + sourceAccount);

        const sourceData = await client.send({ command: "account_info", account: sourceAccount }).catch(err => {
          throw new Error("Error fetching source account info: " + err.message);
        });

        if (src_balance < evr_refill_amount) {
            consoleLog("Not enough funds in first account to fill other accounts with EVR");
            logVerbose("sourceBalance in EVR " + src_balance);
            logVerbose("evr_refill_amount =  " + evr_refill_amount);
            if (!fs.existsSync(filePath)) {
              await sendMail("Insufficient EVR funds", "We tried to send EVR to " + reputationAccount + " but the balance in " + sourceAccount + " is too low.\r\n\r\nPlease feed your source account.");
              fs.writeFileSync(filePath, "EVR Balance is too low");
            }
          }
          else {
            const tx = {
              TransactionType: 'Payment',
              Account: sourceAccount,
              Amount: {
                "currency": "EVR",
                "value": evr_refill_amount.toString(),
                "issuer": "rEvernodee8dJLaFsujS6q1EiXvZYmHXr8"
              },
              Destination: reputationAccount,
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

          }
      }
    }
  }
};

async function GetEvrBalance(account) {
  logVerbose("getting the EVR balance for " + account);
  let marker = '';
  let balance = 0;

  while (typeof marker === 'string') {
    const lines = await client.send({ command: 'account_lines', account: account, marker: marker === '' ? undefined : marker });

    // test
    if (!lines || !Array.isArray(lines.lines)) {
      consoleLog(`No lines found for account ${account}`);
      break;
    }

    marker = lines.marker === marker ? null : lines.marker;

    lines.lines.forEach(t => {
      if (t.currency === "EVR") {
        logVerbose(JSON.stringify(t));
        balance += parseFloat(t.balance);
        logVerbose("EVR balance for account " + account + " increased by " + t.balance);
      }
    });
  }

  return balance;
}


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
