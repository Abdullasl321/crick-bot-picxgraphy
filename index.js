const makeWASocket = require("@whiskeysockets/baileys").default;
const { DisconnectReason, useMultiFileAuthState, Browsers, MessageType, proto } = require("@whiskeysockets/baileys");
const chalk = require('chalk');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const fetch = require('node-fetch');
const { getMatchDetailsAndMessages, startIntervalLogging, stopIntervalLogging } = require('./cricketMatchUpdater');

//====================================================================
const clierror = chalk.red;
const clisuccess = chalk.green;
const clitreasure = chalk.yellow;
const clitasknote = chalk.blue;
//====================================================================

let connectionOpen = false;
let connectionClosed = false;
let credSaved = false;
let credSavedError = false;
let checkConnUpdates = false;
let checkConnUpdatesErr = false;
let previousWicketCount = null;
let remoteJid = null;

const prefix = ".";


async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('session');

    const version = [3, 2022, 9];
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        browser: Browsers.macOS('Desktop'),
        auth: state,
        version: version
    });    

    sock.ev.on('creds.update', async () => {
        try {
            await saveCreds();
            credSaved = true;
            const timeString = new Date().toLocaleTimeString();
            console.log(clisuccess(`[${timeString}] Creds Saved Successfully.`));
        } catch (err) {
            credSavedError = true;
            const timeString = new Date().toLocaleTimeString();
            console.log(clierror(`[${timeString}] Creds Didn't Save. Retrying...`));
            connectToWhatsApp();
        }
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        checkConnUpdates = true;
        const timeString = new Date().toLocaleTimeString();
        if (connection === 'open') {
            connectionOpen = true;
            console.log(clisuccess(`[${timeString}] Bot Connected Successfully.`));
            sock.sendPresenceUpdate("unavailable");
        } else if (connection === 'close') {
            connectionClosed = true;
            if (lastDisconnect?.error) {
                console.log(clierror(`[${timeString}] Connection lost! Reconnecting...`));
                connectToWhatsApp();
            }
        }
        console.log(clitreasure(`[${timeString}] Checking the Connection...`));
    });

    // Function to check if a message matches any key in the textMessages object
    function getMessageResponse(message) {
        return textMessages[message];
    }

    sock.ev.on('messages.upsert', async ({ messages }) => {
        remoteJid = messages[0].key.remoteJid;
    
        if (messages.length > 0 && messages[0].message) {
            const timeString = new Date().toLocaleTimeString();
            const messageContent = messages[0].message.conversation || '';
            const groupMessageContent = messages
                .filter(msg => msg && msg.message && msg.message.extendedTextMessage)
                .map(msg => msg.message.extendedTextMessage.text)
                .filter(content => content.trim() !== "")
                .join("\n");
    
            messages.forEach(async msg => {
                let reply;
                if (groupMessageContent || messageContent) {
                    console.log(clitasknote(`[${timeString}] Message Recieved.`))

                    const grpmsg = groupMessageContent;

                    if (messageContent === prefix + "alive" || grpmsg === prefix + "alive") {
                        sock.sendMessage(remoteJid, { text: 'I am alive Now!' });

                    }else if (messageContent === prefix + "wid" || grpmsg === prefix + "wid") {
                        sock.sendMessage(remoteJid, { text: remoteJid });

                    } else if (grpmsg.startsWith(prefix + "cricket")) {

                        const command = grpmsg.split(" ")[1]; // Extract command from message
                    
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
                                sock.sendMessage(grpwid, {
                                    contextInfo: {
                                        externalAdReply: {
                                            showAdAttribution: true,
                                            title: "🔴 LIVE CRICKET UPDATES 🔴",
                                            body: "SPORT WORLD - PICXGRAPHY UNIQUE WORLD",
                                            previewType: "PHOTO",
                                            thumbnail: fs.readFileSync('images/logo.png'),
                                            sourceUrl: url
                                        },
                                        
                                    }, 
                                    text: formattedMessage
                                });
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
            sock.sendMessage(grpwid, {
                contextInfo: {
                    externalAdReply: {
                        showAdAttribution: true,
                        title: "🔴 LIVE CRICKET UPDATES 🔴",
                        body: "SPORT WORLD - PICXGRAPHY UNIQUE WORLD",
                        previewType: "PHOTO",
                        thumbnail: fs.readFileSync('images/logo.png'),
                        sourceUrl: url
                    },
                    
                }, 
                text: formattedMessage
            });
        }

        // Part 2: Handle "Wicket Update Detected"
        if (importantMessage === "Wicket Update Detected") {
            console.log(`Sending message: ${formattedMessage}`);
            sock.sendMessage(grpwid, {
                contextInfo: {
                    externalAdReply: {
                        showAdAttribution: true,
                        title: "🔴 LIVE CRICKET UPDATES 🔴",
                        body: "SPORT WORLD - PICXGRAPHY UNIQUE WORLD",
                        previewType: "PHOTO",
                        thumbnail: fs.readFileSync('images/logo.png'),
                        sourceUrl: url
                    },
                    
                }, 
                text: `      ⭕ *WICKET* ⭕\n` + formattedMessage
            });
        }

        // Part 3: Handle "5 Minutes Update"
        if (importantMessage === "Five Minutes Update") {
            console.log(`Sending message: ${formattedMessage}`);
            sock.sendMessage(grpwid, {
                contextInfo: {
                    externalAdReply: {
                        showAdAttribution: true,
                        title: "🔴 LIVE CRICKET UPDATES 🔴",
                        body: "SPORT WORLD - PICXGRAPHY UNIQUE WORLD",
                        previewType: "PHOTO",
                        thumbnail: fs.readFileSync('images/logo.png'),
                        sourceUrl: url
                    },
                    
                }, 
                text: formattedMessage
            });
        }
            
                                    if (importantMessage === "Match Has Not Started") {
                                        console.log(chalk.red("SENDING MATCH HAS NOT STARTED MESSAGE"));
                                        sock.sendMessage(grpwid, { text: `❌ *MATCH HAS NOT BEEN STARTED YET* ❌` });
                                        clearInterval(intervalId); // Stop checking if the match has not started
                                        return;
                                    }
            
                                    if (importantMessage === "Match Ended") {
                                        sock.sendMessage(grpwid, {
                                            contextInfo: {
                                                externalAdReply: {
                                                    showAdAttribution: true,
                                                    title: "🔴 LIVE CRICKET UPDATES 🔴",
                                                    body: "SPORT WORLD - PICXGRAPHY UNIQUE WORLD",
                                                    previewType: "PHOTO",
                                                    thumbnail: fs.readFileSync('images/logo.png'),
                                                    sourceUrl: url
                                                },
                                                
                                            }, 
                                            text: formattedMessage
                                        });
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
                            const { formattedMessage, importantMessage } = getMatchDetailsAndMessages(url);
            
                            if (importantMessage === null){
                                stopIntervalLogging(); // Stop the interval logging
                                sock.sendMessage(grpwid, {text: "❌ *MATCH HAS NOT BEEN STARTED YET* ❌"});
                                return;
                            }

                            if (formattedMessage) {
                                sock.sendMessage(grpwid, {
                                    contextInfo: {
                                        externalAdReply: {
                                            showAdAttribution: true,
                                            title: "🔴 LIVE CRICKET UPDATES 🔴",
                                            body: "SPORT WORLD - PICXGRAPHY UNIQUE WORLD",
                                            previewType: "PHOTO",
                                            thumbnail: fs.readFileSync('images/logo.png'),
                                            sourceUrl: url
                                        },
                                        
                                    }, 
                                    text: formattedMessage
                                });
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
            sock.sendMessage(grpwid, {
                contextInfo: {
                    externalAdReply: {
                        showAdAttribution: true,
                        title: "🔴 LIVE CRICKET UPDATES 🔴",
                        body: "SPORT WORLD - PICXGRAPHY UNIQUE WORLD",
                        previewType: "PHOTO",
                        thumbnail: fs.readFileSync('images/logo.png'),
                        sourceUrl: url
                    },
                    
                }, 
                text: formattedMessage
            });
        }

        // Part 2: Handle "Wicket Update Detected"
        if (importantMessage === "Wicket Update Detected") {
            console.log(`Sending message: ${formattedMessage}`);
            sock.sendMessage(grpwid, {
                contextInfo: {
                    externalAdReply: {
                        showAdAttribution: true,
                        title: "🔴 LIVE CRICKET UPDATES 🔴",
                        body: "SPORT WORLD - PICXGRAPHY UNIQUE WORLD",
                        previewType: "PHOTO",
                        thumbnail: fs.readFileSync('images/logo.png'),
                        sourceUrl: url
                    },
                    
                }, 
                text: `     ⭕ *WICKET* ⭕\n` + formattedMessage
            });
        }

        // Part 3: Handle "5 Minutes Update"
        if (importantMessage === "Five Minutes Update") {
            console.log(`Sending message: ${formattedMessage}`);
            sock.sendMessage(grpwid, {
                contextInfo: {
                    externalAdReply: {
                        showAdAttribution: true,
                        title: "🔴 LIVE CRICKET UPDATES 🔴",
                        body: "SPORT WORLD - PICXGRAPHY UNIQUE WORLD",
                        previewType: "PHOTO",
                        thumbnail: fs.readFileSync('images/logo.png'),
                        sourceUrl: url
                    },
                    
                }, 
                text: formattedMessage
            });
        }
            
                                    if (importantMessage === "Match Has Not Started") {
                                        console.log(chalk.red("SENDING MATCH HAS NOT STARTED MESSAGE"));
                                        sock.sendMessage(grpwid, { text: `❌ *MATCH HAS NOT BEEN STARTED YET* ❌` });
                                        clearInterval(intervalId); // Stop checking if the match has not started
                                        return;
                                    }
            
                                    if (importantMessage === "Match Ended") {
                                        sock.sendMessage(grpwid, {
                                            contextInfo: {
                                                externalAdReply: {
                                                    showAdAttribution: true,
                                                    title: "🔴 LIVE CRICKET UPDATES 🔴",
                                                    body: "SPORT WORLD - PICXGRAPHY UNIQUE WORLD",
                                                    previewType: "PHOTO",
                                                    thumbnail: fs.readFileSync('images/logo.png'),
                                                    sourceUrl: url
                                                },
                                                
                                            }, 
                                            text: formattedMessage
                                        });
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
                }
            })
        }

        });
                    
                    
    


    sock.ev.on('connection.update', (update) => {
        const timeString = new Date().toLocaleTimeString();
        if (update.lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
            console.log(clierror(`[${timeString}] Device logged out. Please scan the QR code again.`));
        } else if (update.lastDisconnect?.error) {
            console.log(clierror(`[${timeString}] Connection error occurred. Reconnecting...`));
            connectToWhatsApp();
        }
    });

    sock.ev.on('error', (err) => {
        checkConnUpdatesErr = true;
        const timeString = new Date().toLocaleTimeString();
        console.log(clierror(`[${timeString}] Connection Error! Reconnecting...`));
        connectToWhatsApp();
    });
}

connectToWhatsApp();
