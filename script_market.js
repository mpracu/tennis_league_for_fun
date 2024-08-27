const headers = {
    'authority': 'api.sofascore.com',
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'max-age=0',
    'dnt': '1',
    'if-none-match': 'W/"4bebed6144"',
    'origin': 'https://www.sofascore.com',
    'referer': 'https://www.sofascore.com/',
    'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="114"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
};

// Fetch the top 100 players based on ranking
async function fetchTopPlayers() {
    const urlRanking = 'https://api.sofascore.com/api/v1/rankings/type/5';

    try {
        const rankingResponse = await fetch(urlRanking, { headers });
        const rankingData = await rankingResponse.json();
        const topPlayers = rankingData.rankings.slice(0, 100);
        displayPlayers(topPlayers);
    } catch (error) {
        console.error('Error fetching top players:', error);
    }
}

// Fetch recent matches for a player
async function fetchPlayerMatches(playerId) {
    const urlResults = `https://api.sofascore.com/api/v1/team/${playerId}/events/last/0`;

    try {
        const resultsResponse = await fetch(urlResults, { headers });
        const resultsData = await resultsResponse.json();
        return resultsData.events || [];
    } catch (error) {
        console.error(`Error fetching matches for player ID ${playerId}:`, error);
        return [];
    }
}

// Sort matches by date (most recent first)
function sortMatchesByDate(matches) {
    return matches.sort((a, b) => new Date(b.startTimestamp) - new Date(a.startTimestamp));
}

// Filter for finished singles matches with category name 'ATP'
function filterFinishedMatches(matches) {
    return matches.filter(match =>
        match.status.type === 'finished' &&                // Ensure the match is finished
        (!match.homeTeam.subTeams || match.homeTeam.subTeams.length === 0) && // Ensure the home team has no subTeams (singles match)
        (match.tournament.category.slug === 'atp') // Ensure the category name is ATP
    );
}

// Format number with commas as thousands separators
function formatNumberWithCommas(number) {
    return number.toLocaleString();
}


// Calculate the market price of a player
function calculateMarketPrice(rank, recentMatches, playerId) {
    const maxBaseValue = 10000000; // Maximum base value for the top-ranked player
    const baseValue = maxBaseValue / (rank + 1); // Calculate base value based on ranking
    let performanceScore = 0;
    let lastMatchEffect = 0;

    const weightMultipliers = {
        'Singles': 2.0, // Singles matches are twice as valuable
        'Doubles': 1.0, // Doubles matches have base value
        'Finals': 3.0,  // Finals have a higher multiplier
        'Semifinals': 2.5,
        'Quarterfinals': 2.0,
        'Others': 1.5,
    };

    const finishedMatches = filterFinishedMatches(recentMatches);
    const matchesToConsider = sortMatchesByDate(finishedMatches).slice(0, 5);

    matchesToConsider.forEach((match, index) => {
        const isHomePlayer = match.homeTeam.id === playerId;
        const isAwayPlayer = match.awayTeam.id === playerId;

        let isInSubTeam = false;
        let matchResult = '';

        if (match.subTeams && match.subTeams.length > 0) {
            match.subTeams.forEach(subTeam => {
                if (subTeam.playerTeamInfo && subTeam.playerTeamInfo.id === playerId) {
                    isInSubTeam = true;
                }
            });
        }

        const homeScore = match.homeScore.current;
        const awayScore = match.awayScore.current;

        if (homeScore > awayScore) {
            matchResult = isHomePlayer || isInSubTeam ? 'W' : 'L';
        } else if (homeScore < awayScore) {
            matchResult = isAwayPlayer || isInSubTeam ? 'W' : 'L';
        } else {
            matchResult = 'D';
        }

        const matchType = match.homeTeam.name === match.tournament.name ? 'Singles' : 'Doubles';
        const roundInfo = match.roundInfo?.name || 'Others';
        const tennisPoints = match.tournament.uniqueTournament?.tennisPoints || 0;

        const resultScore = matchResult === 'W' ? 10000 : (matchResult === 'L' ? -5000 : 0);
        let weight = weightMultipliers[roundInfo] || 1.0;
        weight *= weightMultipliers[matchType] || 1.0;

        // Increase the weight of the last match's effect
        const importanceMultiplier = 1 + (matchesToConsider.length - index) * 0.5;
        const matchScore = resultScore * weight * (tennisPoints / 1000) * importanceMultiplier;
        performanceScore += matchScore;

        if (index === 0) {
            lastMatchEffect = matchScore; // Capture the last match effect specifically
        }
    });

    const marketPrice = Math.max(baseValue + performanceScore, 0); // Ensure price is non-negative
    const marketPriceRounded = Math.round(marketPrice);

    return {
        price: formatNumberWithCommas(marketPriceRounded), // Format price with commas
        lastMatchEffect: lastMatchEffect
    };
}

// Display the list of players
function displayPlayers(playersData) {
    const container = document.getElementById('players-container');
    container.innerHTML = '';  // Clear previous content

    playersData.forEach(async (player, index) => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player';

        const playerImage = document.createElement('img');
        playerImage.src = `https://api.sofascore.com/api/v1/team/${player.team.id}/image`;
        playerImage.alt = player.team.name;
        playerImage.width = 50;
        playerImage.height = 50;

        const playerInfo = document.createElement('div');
        playerInfo.className = 'player-info';
        playerInfo.innerHTML = `
            <h2>${player.team.name || 'Unknown'}</h2>
            <p>Ranking: ${index + 1}</p>
            <p>Country: ${player.team.country?.name || 'N/A'}</p>
        `;

        const recentMatches = await fetchPlayerMatches(player.team.id);
        if (recentMatches.length > 0) {
            const sortedMatches = sortMatchesByDate(recentMatches);
            const { price, lastMatchEffect } = calculateMarketPrice(index + 1, sortedMatches, player.team.id);
            const priceElement = document.createElement('p');

            const color = lastMatchEffect >= 0 ? 'green' : 'red';
            priceElement.innerHTML = `Market Price: <span style="color:${color};">$${price}</span>`;

            const marketChangeElement = document.createElement('p');
            const marketChangeText = lastMatchEffect >= 0 ? 'increase' : 'decrease';
            const formattedEffect = formatNumberWithCommas(Math.abs(Math.round(lastMatchEffect)));
            marketChangeElement.innerHTML = `Price ${marketChangeText}: <span style="color:${color};">$${formattedEffect}</span>`;

            playerInfo.appendChild(priceElement);
            playerInfo.appendChild(marketChangeElement);
        }

        playerElement.appendChild(playerImage);
        playerElement.appendChild(playerInfo);
        container.appendChild(playerElement);

        playerElement.addEventListener('click', () => {
            displayMatches(player.team.id, recentMatches, playerElement);
        });
    });
}

// Display the list of players
function displayPlayers(playersData) {
    const container = document.getElementById('players-container');
    container.innerHTML = '';  // Clear previous content

    playersData.forEach(async (player, index) => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player';

        const playerImage = document.createElement('img');
        playerImage.src = `https://api.sofascore.com/api/v1/team/${player.team.id}/image`;
        playerImage.alt = player.team.name;
        playerImage.width = 50;
        playerImage.height = 50;

        const playerInfo = document.createElement('div');
        playerInfo.innerHTML = `
            <h2>${player.team.name || 'Unknown'}</h2>
            <p>Ranking: ${index + 1}</p>
            <p>Country: ${player.team.country?.name || 'N/A'}</p>
        `;

        const recentMatches = await fetchPlayerMatches(player.team.id);

        if (recentMatches.length > 0) {
            const sortedMatches = sortMatchesByDate(recentMatches);
            const { price, lastMatchEffect } = calculateMarketPrice(index + 1, sortedMatches, player.team.id);
            const priceElement = document.createElement('p');

            // Apply color based on last match effect
            const color = lastMatchEffect >= 0 ? 'green' : 'red';
            priceElement.innerHTML = `Market Price: <span style="color:${color};">$${price}</span>`;

            playerInfo.appendChild(priceElement);
        }

        playerElement.appendChild(playerImage);
        playerElement.appendChild(playerInfo);
        container.appendChild(playerElement);

        playerElement.addEventListener('click', () => {
            displayMatches(player.team.id, recentMatches, playerElement);
        });
    });
}

// Display recent matches when a player is clicked
function displayMatches(playerId, recentMatches, playerElement) {
    // Remove existing matches container if present
    const existingMatchesContainer = playerElement.querySelector('.matches-container');
    if (existingMatchesContainer) {
        playerElement.removeChild(existingMatchesContainer);
    }

    const matchesContainer = document.createElement('div');
    matchesContainer.className = 'matches-container';

    const finishedMatches = filterFinishedMatches(recentMatches);

    if (finishedMatches.length > 0) {
        // Create table structure
        const table = document.createElement('table');
        table.className = 'matches-table';

        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headers = ['Result', 'Opponent', 'Score', 'Ground Type', 'Points', 'Round', 'Tournament'];
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');
        const recentMatchesToShow = sortMatchesByDate(finishedMatches).slice(0, 5); // Show only the last 5 matches
        recentMatchesToShow.forEach(match => {
            const row = document.createElement('tr');
            const isHomePlayer = match.homeTeam.id === playerId;
            const matchResult = match.homeScore.current > match.awayScore.current 
                ? (isHomePlayer ? 'W' : 'L') 
                : (isHomePlayer ? 'L' : 'W');
            const opponent = isHomePlayer ? match.awayTeam.name : match.homeTeam.name;
            const score = `${match.homeScore.current} - ${match.awayScore.current}`;
            const groundType = match.tournament.uniqueTournament.groundType || 'Unknown';
            const tennisPoints = match.tournament.uniqueTournament?.tennisPoints || 'N/A';
            const roundInfo = match.roundInfo?.name || 'N/A';
            const tournamentName = match.tournament.name || 'N/A';

            const cells = [matchResult, opponent, score, groundType, tennisPoints, roundInfo, tournamentName];
            cells.forEach(cellText => {
                const td = document.createElement('td');
                td.textContent = cellText;
                row.appendChild(td);
            });

            // Add class based on match result
            row.className = matchResult === 'W' ? 'match-win' : 'match-loss';
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        matchesContainer.appendChild(table);
    } else {
        const noMatchesMessage = document.createElement('p');
        noMatchesMessage.textContent = 'No finished singles ATP matches found.';
        matchesContainer.appendChild(noMatchesMessage);
    }

    playerElement.appendChild(matchesContainer);
}

// Initialize the process
fetchTopPlayers();