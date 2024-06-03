#!/bin/bash

# in order to update the script to the last version without losing your configuration,
# first go in Evernode-Monitor-Split folder:
#
# cd Evernode-Monitor-Split
#
# and then give execute permission to the script:
#
# chmod +x update.sh
#
# now you can execute the script:
#
# sudo ./update.sh


echo  "move to parent folder"
cd ..

echo "backup .env file"
cp Evernode-Monitor-Split/.env .env

echo "remove Evernode-Monitor-Split folder"
rm Evernode-Monitor-Split -r -f

echo "clone the github repo"
git clone https://github.com/genesis-one-seven/evernode_monitor/

echo "restore .env file"
cp  .env Evernode-Monitor-Split/.env

echo "delete backup .env file"
rm  .env

echo "go back to script folder"
cd Evernode-Monitor-Split

echo "install dependencies"
npm install
