const makeWASocket = require("@whiskeysockets/baileys").default;
const { DisconnectReason, useMultiFileAuthState, Browsers, saveCreds } = require("@whiskeysockets/baileys");
const chalk = require('chalk');
const fetch = require('node-fetch');
const qrcode = require("qrcode-terminal");
const pino = require('pino');
const fs = require("fs");
const axios = require('axios');
const cheerio = require('cheerio');
const { getMatchDetailsAndMessages, startIntervalLogging, stopIntervalLogging } = require('./cricketMatchUpdater');

const prefix = ".";
let previousWicketCount = null;
let remoteJid = null;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const version = [3, 2022, 9];
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        browser: Browsers.macOS('Desktop'),
        auth: state,
        version: version
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (connection === 'open') {
            sock.sendPresenceUpdate("unavailable");
            // connection opened
        }

        if (connection === 'close' && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != "undefined") {
            // connection closed, reconnecting setup...
            connectToWhatsApp();
        }
    });

            sock.ev.on('messages.upsert', async ({ messages }) => {
                //sock.sendPresenceUpdate('unavailable');

                        remoteJid = messages[0].key.remoteJid; // Save remoteJid when message is received
                
                        if (messages.length > 0 && messages[0].message) {
                            const messageContent = messages[0].message.conversation;
                            if (messages.length > 0) {
                                const senderRemoteJid = messages[0].key.remoteJid;
                
                                const groupMessageContent = messages
                                    .map((message) => {
                                        // Check if the message is an instance of ExtendedTextMessage
                                        if (message.message.extendedTextMessage) {
                                            // If it is, extract the text property
                                            return message.message.extendedTextMessage.text;
                                        } else {
                                            // Otherwise, return an empty string or handle the case accordingly
                                            return "";
                                        }
                                    })
                                    .filter((content) => content.trim() !== "");
                
                                const grpmsg = groupMessageContent.join("\n");
                                   messages.forEach(async (msg) => {

                             if (messageContent === prefix + "alive" || grpmsg === prefix + "alive") {
                                        sock.sendMessage(remoteJid, { text: 'I am alive Now!' });
                
                                    }else if (messageContent === prefix + "wid" || grpmsg === prefix + "wid") {
                                        sock.sendMessage(remoteJid, { text: remoteJid });
                
                                    } else if (grpmsg.startsWith(prefix + "cricket")) {

                                        const command = messageContent.split(" ")[1]; // Extract command from message

            if (command === "stop") {
                stopIntervalLogging(); // Stop the interval logging
                sock.sendMessage(remoteJid, { text: '❌ *LIVE UPDATES STOPPED.* ❌' });
                return;
            }

                                        const url = grpmsg.split(" ")[1]; // Extract URL from message
                                        const grpwid = grpmsg.split(" ")[2] // Extract grpwid from message
                                        try {
                                            const { formattedMessage, importantMessage } = await getMatchDetailsAndMessages(url);
                            
                                            if (importantMessage === null){
                                                stopIntervalLogging(); // Stop the interval logging
                                                sock.sendMessage(grpwid, {text: "❌ *MATCH HAS NOT BEEN STARTED YET* ❌"});
                                                return;
                                            }

                                            if (formattedMessage) {
                                                sock.sendMessage(grpwid, { text: formattedMessage });
                                            }
                            
                                            console.log(`Starting interval logging for URL: ${url}`);
                                            console.log(`Initial important message: ${importantMessage}`);

                                            if (importantMessage === "Match Has Not Started") {
                                                console.log(chalk.red("SENDING MATCH HAS NOT STARTED MESSAGE"));
                                                sock.sendMessage(grpwid, { text: `❌ *MATCH HAS NOT BEEN STARTED YET* ❌` });
                                                return;
                                            }
                            
                                            // Start interval logging
                                            let intervalId = setInterval(async () => {
                                                try {
                                                    const { formattedMessage, importantMessage } = await getMatchDetailsAndMessages(url);
                                                    

                                                    console.log(`Interval check - Important Message: ${importantMessage}`);

                                                   // Part 1: Handle "Match Started"
                        if (importantMessage === "Match Started") {
                            console.log(`Sending message: ${formattedMessage}`);
                            sock.sendMessage(grpwid, { text: formattedMessage });
                        }

                        // Part 2: Handle "Wicket Update Detected"
                        if (importantMessage === "Wicket Update Detected") {
                            console.log(`Sending message: ${formattedMessage}`);
                            sock.sendMessage(grpwid, { text: `⭕ *WICKET* ⭕\n` + formattedMessage });
                        }

                        // Part 3: Handle "5 Minutes Update"
                        if (importantMessage === "Five Minutes Update") {
                            console.log(`Sending message: ${formattedMessage}`);
                            sock.sendMessage(grpwid, { text: formattedMessage });
                        }
                            
                                                    if (importantMessage === "Match Has Not Started") {
                                                        console.log(chalk.red("SENDING MATCH HAS NOT STARTED MESSAGE"));
                                                        sock.sendMessage(grpwid, { text: `❌ *MATCH HAS NOT BEEN STARTED YET* ❌` });
                                                        clearInterval(intervalId); // Stop checking if the match has not started
                                                        return;
                                                    }
                            
                                                    if (importantMessage === "Match Ended") {
                                                        sock.sendMessage(grpwid, {text: formattedMessage});
                                                        sock.sendMessage(grpwid, { text: `❌ *MATCH HAS BEEN ENDED* ❌` });
                                                        clearInterval(intervalId); // Stop checking if the match has ended
                                                        return;
                                                    }
                            
                                                    
                                                } catch (error) {
                                                    console.error(`Error during interval check: ${error}`);
                                                }
                                            }, 10000); // Check every 10 seconds

                                            // Save the intervalId for stopping later
                startIntervalLogging(url, intervalId);
                            
                                        } catch (error) {
                                            console.error(`Error fetching match details: ${error}`);
                                        }
                                        
                                    } else if (messageContent.startsWith(prefix + "cricket")) {
                                        const command = messageContent.split(" ")[1]; // Extract command from message

            if (command === "stop") {
                stopIntervalLogging(); // Stop the interval logging
                sock.sendMessage(remoteJid, { text: '❌ *LIVE UPDATES STOPPED.* ❌' });
                return;
            }

                                        const url = messageContent.split(" ")[1]; // Extract URL from message
                                        const grpwid = messageContent.split(" ")[2] // Extract grpwid from message

                                        try {
                                            const { formattedMessage, importantMessage } = await getMatchDetailsAndMessages(url);
                            
                                            if (importantMessage === null){
                                                stopIntervalLogging(); // Stop the interval logging
                                                sock.sendMessage(grpwid, {text: "❌ *MATCH HAS NOT BEEN STARTED YET* ❌"});
                                                return;
                                            }

                                            if (formattedMessage) {
                                                sock.sendMessage(grpwid, { text: formattedMessage });
                                            }
                            
                                            console.log(`Starting interval logging for URL: ${url}`);
                                            console.log(`Initial important message: ${importantMessage}`);

                                            if (importantMessage === "Match Has Not Started") {
                                                console.log(chalk.red("SENDING MATCH HAS NOT STARTED MESSAGE"));
                                                sock.sendMessage(grpwid, { text: `❌ *MATCH HAS NOT BEEN STARTED YET* ❌` });
                                                return;
                                            }
                            
                                            // Start interval logging
                                            let intervalId = setInterval(async () => {
                                                try {
                                                    const { formattedMessage, importantMessage } = await getMatchDetailsAndMessages(url);
                                                   
                                                    console.log(`Interval check - Important Message: ${importantMessage}`);

                                                    // Part 1: Handle "Match Started"
                        if (importantMessage === "Match Started") {
                            console.log(`Sending message: ${formattedMessage}`);
                            sock.sendMessage(grpwid, { text: formattedMessage });
                        }

                        // Part 2: Handle "Wicket Update Detected"
                        if (importantMessage === "Wicket Update Detected") {
                            console.log(`Sending message: ${formattedMessage}`);
                            sock.sendMessage(grpwid, { text: `⭕ *WICKET* ⭕\n` + formattedMessage });
                        }

                        // Part 3: Handle "5 Minutes Update"
                        if (importantMessage === "Five Minutes Update") {
                            console.log(`Sending message: ${formattedMessage}`);
                            sock.sendMessage(grpwid, { text: formattedMessage });
                        }
                            
                                                    if (importantMessage === "Match Has Not Started") {
                                                        console.log(chalk.red("SENDING MATCH HAS NOT STARTED MESSAGE"));
                                                        sock.sendMessage(grpwid, { text: `❌ *MATCH HAS NOT BEEN STARTED YET* ❌` });
                                                        clearInterval(intervalId); // Stop checking if the match has not started
                                                        return;
                                                    }
                            
                                                    if (importantMessage === "Match Ended") {
                                                        sock.sendMessage(grpwid, {text: formattedMessage});
                                                        sock.sendMessage(grpwid, { text: `❌ *MATCH HAS BEEN ENDED* ❌` });
                                                        clearInterval(intervalId); // Stop checking if the match has ended
                                                        return;
                                                    }
                            
                                                } catch (error) {
                                                    console.error(`Error during interval check: ${error}`);
                                                }
                                            }, 10000); // Check every 10 seconds

                                            // Save the intervalId for stopping later
                startIntervalLogging(url, intervalId);
                            
                                        } catch (error) {
                                            console.error(`Error fetching match details: ${error}`);
                                        }                                    }
                                });
                            }
                        }
                    });                
}

connectToWhatsApp();
