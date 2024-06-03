const { default: chalk } = require('chalk');
const { getMatchDetails } = require('./cricketMatchDetails');
let previousMatchDetails = null;
let previousWicketCount = null;
let lastWicketUpdateTime = Date.now();
let matchStarted = false; // Flag to track if match has started
let matchEnded = false; // Flag to track if match has ended
let intervalId; // Define intervalId outside of startCheckingUpdates

const formatMatchMessage = (matchDetails) => {
    const teamNames = Object.keys(matchDetails.teamScores);
    const team1 = teamNames[0] || 'Team 1';
    const team2 = teamNames[1] || 'Team 2';
    const team1Score = matchDetails.teamScores[team1] || 'N/A';
    const team2Score = matchDetails.teamScores[team2] || 'N/A';

    // Function to match country names to emojis
const matchCountryToEmoji = (countryName) => {
    const countryEmojis = {
        Australia: '🇦🇺',
        Bangladesh: '🇧🇩',
        England: '🏴',
        India: '🇮🇳',
        'New Zealand': '🇳🇿',
        Pakistan: '🇵🇰',
        'South Africa': '🇿🇦',
        'Sri Lanka': '🇱🇰',
        'West Indies': '🌴',
        Afghanistan: '🇦🇫',
        Ireland: '🇮🇪',
        Zimbabwe: '🇿🇼',
        Scotland: '🏴',
        Netherlands: '🇳🇱',
        UAE: '🇦🇪',
        Nepal: '🇳🇵',
        Oman: '🇴🇲',
        'Papua New Guinea': '🇵🇬',
        Canada: '🇨🇦',
        Kenya: '🇰🇪',
        Namibia: '🇳🇦'
    };
    return countryEmojis[countryName] || '🏏'; // Default emoji if country name not found
};


    const team1Emoji = matchCountryToEmoji(team1);
    const team2Emoji = matchCountryToEmoji(team2);

    console.log(chalk.yellow("LIVE UPDATES REQUESTED!"));
    const monospace = "```";
    return `      ${monospace}🏏 LIVE UPDATES 🏏${monospace}\n\n*${team1Emoji} ${team1}* vs *${team2Emoji} ${team2}*\n\n> 🏏 *Batting*: ${matchDetails.battingTeam}\n\n> ${team1Emoji} *${team1}*: ${team1Score}\n> ${team2Emoji} *${team2}*: ${team2Score}\n\n> ✨ *OV|T*: ${matchDetails.battingTeamOversAndTarget}\n\n💠 *${matchDetails.matchStatus}*\n\n© ⚽ *SPORTS WORLD*🏏\nhttps://chat.whatsapp.com/C2T0r1c2vLj8RdC3CII2Ky`;
};

const extractWicketCount = (teamScore) => {
    const match = teamScore.match(/\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
};

const getImportantMessage = (matchDetails) => {
    if (!matchStarted && matchDetails.matchIsStarted) {
        matchStarted = true;
        console.log(chalk.green("MATCH STARTED"));
        return "Match Started";
    }

    if (!matchStarted) {
        console.log(chalk.red("MATCH HAS NOT STARTED"));
        return "Match Has Not Started";
    }

    if (matchDetails.matchIsEnd) {
        matchEnded = true; // Set matchEnded flag to true
        clearInterval(intervalId); // Clear the interval
        return "Match Ended";
    }

    const currentWicketCount = extractWicketCount(matchDetails.teamScores[matchDetails.battingTeam]);
    const currentTime = Date.now();
    const oneMinute = 5 * 60 * 1000;

    if (previousMatchDetails) {
        if (currentWicketCount !== null && previousWicketCount !== null && currentWicketCount > previousWicketCount) {
            lastWicketUpdateTime = currentTime;
            previousMatchDetails = matchDetails; // Update previousMatchDetails here
            previousWicketCount = currentWicketCount; // Update previousWicketCount here
            return "Wicket Update Detected";
        } else if (currentTime - lastWicketUpdateTime >= oneMinute) {
            lastWicketUpdateTime = currentTime;
            previousMatchDetails = matchDetails; // Update previousMatchDetails here
            previousWicketCount = currentWicketCount; // Update previousWicketCount here
            return "Five Minutes Update";
        }
    } else {
        lastWicketUpdateTime = currentTime;
        previousMatchDetails = matchDetails; // Update previousMatchDetails here
        previousWicketCount = currentWicketCount; // Update previousWicketCount here
        return "Initial fetch";
    }

    previousMatchDetails = matchDetails;
    previousWicketCount = currentWicketCount;
    return "No Update"; // Ensure we always return a value
};

const getMatchDetailsAndMessages = async (url) => {
    try {
        const matchDetails = await getMatchDetails(url);
        const formattedMessage = formatMatchMessage(matchDetails);
        const importantMessage = getImportantMessage(matchDetails);
        return { formattedMessage, importantMessage };
    } catch (error) {
        console.error(`Error fetching match details: ${error}`);
        return { formattedMessage: null, importantMessage: null };
    }
};

// Function to start interval logging
const startIntervalLogging = (url, newIntervalId) => {
    intervalId = newIntervalId;
};

// Function to stop interval logging
const stopIntervalLogging = () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log(chalk.red("Live updates stopped."));
    }
};

module.exports = { getMatchDetailsAndMessages, startIntervalLogging, stopIntervalLogging };
