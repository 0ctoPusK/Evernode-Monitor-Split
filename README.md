# Evernode-Monitor-Split

This nodejs script (requires v20.11.1) will help you in the monitoring of your evernodes hosts. 


If you have many nodes, using this script you will have to check only one account instead of all of them.

It has been divided into three scripts:

1. evr_withdrawal.js
2. heartbeat_monitor.js
3. xah_balance_monitor.js

The hub accounts can be one of your evernode accounts or another one of your choice. 

The EVR destinaton account can be an exchange.

The EVR balance monitor for reputation accounts will be added soon.

## 1. Withdraw EVRs (evr_withdrawal.js)

This script cycles through your accounts, gets their EVR balance and sends all of the EVR balance to your first EVR account. 
This script uses a single signing address, that requires the same Regular Key is set on all accounts.
 
To set the Regular Key for a node, open the Linux terminal and run the following command: 

```
evernode regkey set rWalletAddressThatYouOwnThatCanSignTransactions
```

Setting the same regular key on a Xahau account list will let you sign the transaction for all of them using the same secret (doc: https://docs.xahau.network/technical/protocol-reference/transactions/transaction-types/setregularkey )

## 2. Monitor the heartbeat (heartbeat_monitor.js)

This script cycles through your accounts and checks whether each account sent a heartbeat transaction in the last N (configurable) minutes. In case no heartbeat is found an alert email is sent to the configured email address. The alert email is repeated after N (configurable) minutes in case the down is not solved. A restore email is sent as soon as the issue is solved.

## 3. Send XAH to the account if balance is too low (xah_balance_monitor.js)

As a minimum numer of XAH is required to run an evernode host, this script sends N (configurable) XAH from the first account when the balance is below a certain threshold (configurable). In case the first account balance is too low to send XAH, an alert email is sent to the configured email. This means you will only have to check the first account XAH balance and you can ignore the others that are automatically filled when needed.

This script DOES manage the reputation accounts XAH balance.

This script DOESN'T manage the reputation accounts EVR balance.

## 4. Monitor the reputation account for EVR (evr_reputation_monitor.js)

This script does monitor the EVR balance for the reputation accounts. you don't need to always send your EVRs to a source account and then to the reputation accounts which causes twice transaction fees.

This just literally lets you send the EVR which you paid when the opt-in process back to the reputation account.  

## SMTP server

In order to send emails from the script you need an SMTP server. Follow these instruction to setup your free account in BREVO: https://www.programonaut.com/how-to-send-an-email-in-node-js-using-an-smtp-step-by-step/. 

## Install & run

First you need to ensure you have the latest version of node.js in your server (https://github.com/nodesource/distributions)

Then you can download and configure the script:

```
git clone https://github.com/0ctoPusK/Evernode-Monitor-Split/

cd Evernode-Monitor-Split

cp .env.sample .env 

sudo nano .env
```

Set the variables in the .env file (all variables are described in the file) and then run the scripts:

```
npm install

node evr_withdrawal.js
node xah_balance_monitor.js
node heartbeat_monitor.js
```

You can now setup scheduled tasks that run the scripts regularly using Cron.
The example below runs the transfer scripts every 30 minutes, every day, every hour and logs the results to a file called log1.log, log2.log, log3.log

crontab -e

0,30 * * * * /usr/bin/node /root/Evernode-Monitor-Split/evr_withdrawal.js >> /root/Evernode-Monitor-Split/log1.log

0 0 * * * /usr/bin/node /root/Evernode-Monitor-Split/xah_balance_monitor.js >> /root/Evernode-Monitor-Split/log2.log

0 * * * * /usr/bin/node /root/Evernode-Monitor-Split/heartbeat_monitor.js >> /root/Evernode-Monitor-Split/log3.log

Cron documentation: https://www.cherryservers.com/blog/how-to-use-cron-to-automate-linux-jobs-on-ubuntu-20-04

## Update to last version

In order to update the script to the last version without losing your configuration, first go in Evernode-Monitor-Split folder:

```
cd Evernode-Monitor-Split
```

then give execute permission to the script:

```
chmod +x update.sh
```

and finally execute the script update.sh:

```
sudo ./update.sh
```

Here's the one line version of the command sequence:

```
cd Evernode-Monitor-Split && chmod +x update.sh && sudo ./update.sh
```


## Use at your own risk. Double check your addresses before running the script!
