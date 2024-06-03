const { XrplClient } = require('xrpl-client');
const fs = require('fs');
const path = require('path');
const { createTransport } = require('nodemailer');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const client = new XrplClient(process.env.xahaud);
const accounts = process.env.accounts.split('\n');
const heartbeatAccount = process.env.heartbeatAccount;

const minutes_from_last_heartbeat_alert_threshold = parseInt(process.env.minutes_from_last_heartbeat_alert_threshold);
const smtpEmail = process.env.smtpEmail;
const destinationEmail = process.env.destinationEmail || smtpEmail;

const transporter = createTransport({
    host: "smtp-relay.sendinblue.com",
    port: 587,
    auth: {
        user: smtpEmail,
        pass: process.env.smtpKey,
    },
});

async function checkAccountHeartBeat(account) {
    const filePath = path.resolve(__dirname, account + '.txt');
    const fileExists = fs.existsSync(filePath);
    let lastTransactionDate = fileExists ? new Date(fs.readFileSync(filePath, 'utf8')) : null;

    const response = await client.send({
        command: "account_tx",
        account: account,
        limit: 1
    });

    const latestTransaction = response.transactions[0];
    if (!latestTransaction || !latestTransaction.tx) {
        console.log("No transaction or tx object found for account", account);
        //console.log("API Response:", response);
        return;
    }

    const transactionTimestamp = latestTransaction.tx.date + 946684800; // Ripple Epoch
    const transactionDate = new Date(transactionTimestamp * 1000);
    // Format the date to KST using Intl.DateTimeFormat, you can replace KST with your local time zone.
    const formatter = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    if (isNaN(transactionDate.getTime())) {
        console.log("Invalid transaction date computed for account", account, "- Timestamp:", transactionTimestamp);
        return;
    }

    const minutesSinceLastTransaction = (new Date() - transactionDate) / 60000;


    if (lastTransactionDate && transactionDate.getTime() === lastTransactionDate.getTime()) {
        console.log(`No new transactions since the last check for ${account}.`);
        return;
    }

    if (minutesSinceLastTransaction > minutes_from_last_heartbeat_alert_threshold) {
        console.log(`Heartbeat failed for ${account}. Last transaction at ${formatter.format(transactionDate)}.`);
        await sendFailureNotification(account);
        fs.writeFileSync(filePath, transactionDate.toString());
    } else {
        console.log(`Heartbeat healthy for ${account}. Last transaction at ${formatter.format(transactionDate)}.`);
        if (fileExists) {
            fs.unlinkSync(filePath);
        }
    }
}


async function sendFailureNotification(account) {
    const subject = `Heartbeat Failure for Account ${account}`;
    const text = `Heartbeat check failed. No recent transactions for account ${account}.`;
    await sendMail(subject, text);
}

async function sendMail(subject, text) {
    const mailOptions = {
        from: smtpEmail,
        to: destinationEmail,
        subject: subject,
        text: text
    };

    await transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}

async function monitor_heartbeat() {
    console.log("Checking heartbeats for all accounts...");
    for (const account of accounts) {
        await checkAccountHeartBeat(account);
    }
}

async function main() {
    await monitor_heartbeat();
    client.close();
    console.log('Heartbeat monitoring completed.');
}

main();
