async function checkAuthStatus() {
    try {
        const response = await fetch('/api/checkAuth');
        if (response.ok) {
            const userData = await response.json();
            const username = userData.username;
            document.getElementById('welcomeMsg').innerText = `Welcome, ${username}!`; // Display welcome message
        } else {
            document.getElementById('welcomeMsg').innerText = ''; // Clear welcome message if not logged in
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
    }
}



document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    fetchRecentMangaUpdates();
    fetchRandomManga();
    
// Call loadLastVisitedManga when the page loads or as needed
loadLastVisitedManga();
});
async function fetchRandomManga() {
    try {
        const response = await fetch('/api/random');
        const data = await response.json();

        const mangaId = data.id;
        const mangaTitle = data.attributes.title.en || 'No title available';
        const mangaDescription = data.attributes.description.en || 'No description available';
        const coverArtUrl = data.coverArtUrl;
        const chapters = data.chapters || [];

        document.getElementById('coverArt').src = coverArtUrl || '';
        document.getElementById('mangaTitle').innerText = `Title: ${mangaTitle}`;
        document.getElementById('mangaDescription').innerText = `Description: ${mangaDescription}`;

        const chaptersList = document.getElementById('chaptersList');
        chaptersList.innerHTML = '';
        if (chapters.length > 0) {
            if (chapters.length > 15) {
                // Display the first 14 chapters
                const rowContainer = document.createElement('div');
                rowContainer.classList.add('chapter-row-container');
                for (let i = 0; i < 14; i++) {
                    const chapter = chapters[i];
                    const chapterButton = createChapterButton(chapter, mangaId);
                    rowContainer.appendChild(chapterButton);
                }
                chaptersList.appendChild(rowContainer);
                // Add ellipsis button
                chaptersList.appendChild(createEllipsisButton());
                
                // Display the last chapter
                const lastChapter = chapters[chapters.length - 1];
                const lastChapterButton = createChapterButton(lastChapter, mangaId);
                chaptersList.appendChild(lastChapterButton);
                chaptersList.appendChild(document.createElement('br'));
            } else {
                // Display all chapters
                const rowContainer = document.createElement('div');
                rowContainer.classList.add('chapter-row-container');
                chapters.forEach(chapter => {
                    const chapterButton = createChapterButton(chapter, mangaId);
                    rowContainer.appendChild(chapterButton);
                });
                chaptersList.appendChild(rowContainer);
                chaptersList.appendChild(document.createElement('br'));
            }
        } else {
            chaptersList.innerText = 'No chapters available';
        }

        const favoriteCheckbox = document.getElementById('favoriteCheckbox');
        favoriteCheckbox.checked = false; // Reset the checkbox state
        favoriteCheckbox.onclick = () => toggleFavorite(mangaId);
    } catch (error) {
        console.error('Error fetching random manga:', error);
    }
}

function createChapterButton(chapter, mangaId) {
    const chapterButton = document.createElement('button');
    chapterButton.classList.add('randomMangaChapter__button'); // Add class attribute
    chapterButton.innerText = `Chapter ${chapter.attributes.chapter || 'N/A'}`;
    chapterButton.onclick = () => {
        const chapterNumber = chapter.attributes.chapter || 'N/A';
        saveHistory(mangaId, chapterNumber);
        window.open(`https://mangadex.org/chapter/${chapter.id}`, '_blank');
    };
    return chapterButton;
}
function createEllipsisButton() {
    const ellipsisButton = document.createElement('span');
    ellipsisButton.innerText = 'Latest Chapter : ';
    ellipsisButton.disabled = true;
    return ellipsisButton;
}

async function toggleFavorite(mangaId) {
    const favoriteCheckbox = document.getElementById('favoriteCheckbox');
    const status = favoriteCheckbox.checked ? 'read' : 'haven\'t read';

    try {
        const response = await fetch('/api/readList', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mangaId, status })
        });
        const data = await response.json();

        if (!response.ok) {
            alert(data.error);
            favoriteCheckbox.checked = !favoriteCheckbox.checked; // Revert the checkbox state if there was an error
        } else {
            const message = favoriteCheckbox.checked ? 'Manga added to reading list' : 'Manga removed from reading list';
            alert(message);
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        favoriteCheckbox.checked = !favoriteCheckbox.checked; // Revert the checkbox state if there was an error
    }
}

async function fetchRecentMangaUpdates() {
    try {
        const response = await fetch('/api/recent-updates');
        const data = await response.json();
        const recentUpdatesContainer = document.getElementById('recentUpdatesContainer');

        if (Array.isArray(data)) {
            data.forEach(async manga => {
                const coverArtRelation = manga.relationships.find(rel => rel.type === 'cover_art');
                const coverArtUrl = coverArtRelation ? `https://uploads.mangadex.org/covers/${manga.id}/${coverArtRelation.attributes.fileName}` : '';
                const mangaTitle = manga.attributes.title.en || 'No title available';
                const latestChapterId = manga.attributes.latestUploadedChapter || 'N/A';

                const card = document.createElement('div');
                card.className = 'manga-card';
                const cardContent = document.createElement('div');
                cardContent.className = 'card-content';
                card.innerHTML = `<img src="${coverArtUrl}" alt="Cover Art">`;
                cardContent.innerHTML = `<div class="truncate resultTitle">${mangaTitle}</div>`;
                
                let chapterButton = 'N/A';
                if (latestChapterId !== 'N/A') {
                    const chapterResponse = await fetch(`https://api.mangadex.org/chapter/${latestChapterId}`);
                    const chapterData = await chapterResponse.json();
                    const chapterNumber = chapterData.data.attributes.chapter || 'N/A';
                    chapterButton = document.createElement('button');
                    chapterButton.classList.add('chapter__button');
                    chapterButton.innerHTML = `<span>Chapter ${chapterNumber}</span>`;
                    chapterButton.onclick = () => {
                        saveHistory(manga.id, latestChapterId); // Save history when button is clicked
                        window.open(`https://mangadex.org/chapter/${latestChapterId}`, '_blank');
                    };
                    cardContent.appendChild(chapterButton); // Append button to card content
                }

                card.appendChild(cardContent);
                recentUpdatesContainer.appendChild(card);
            });
        } else {
            console.error('Invalid data format for recent manga updates:', data);
        }
    } catch (error) {
        console.error('Error fetching recent manga updates:', error);
    }
}
document.querySelector('.search-manga-button').addEventListener('click', async () => {
    const query = document.getElementById('input-field-search').value.trim();
    if (query === '') {
        alert('Please enter a search term');
        return;
    }
    await performSearch(query);
});

document.getElementById('input-field-search').addEventListener('input', debounce(async () => {
    const query = document.getElementById('input-field-search').value.trim();
    if (query === '') {
        clearSearchResults();
        return;
    }
    await performSearch(query);
}, 500)); // 1000 ms debounce time

async function performSearch(query) {
    clearSearchResults();
    try {
        const response = await fetch(`/api/search?q=${query}`);
        if (response.ok) {
            const mangas = await response.json();
            displaySearchResults(mangas);
        } else {
            const errorData = await response.json();
            console.error('Search error:', errorData);
        }
    } catch (error) {
        console.error('Error during search:', error);
    }
}

async function displaySearchResults(mangas) {
    const resultsContainer = document.getElementById('search-results');
    const uniqueManga = removeDuplicates(mangas);

    if (uniqueManga.length > 0) {
        for (const manga of uniqueManga) {
            const mangaElement = document.createElement('div');
            mangaElement.classList.add('searchResultCell');
            const coverArtRelation = manga.relationships.find(rel => rel.type === 'cover_art');
            const coverArtUrl = coverArtRelation ? `https://uploads.mangadex.org/covers/${manga.id}/${coverArtRelation.attributes.fileName}` : '';
            
            // Fetch latest chapter data
            const latestChapter = await getLatestChapter(manga.id);

            mangaElement.innerHTML = `
                <div class="resultGlow"></div>
                <div class="resultBorderGlow"></div>
                <div class="resultTitle">${manga.attributes.title.en}</div>
                <div class="resultCoverArt">
                    <img src="${coverArtUrl}" alt="${manga.attributes.title.en} cover art">
                </div>
                <div class="resultChapter">${latestChapter}</div>
            `;
            resultsContainer.appendChild(mangaElement);
        }
    } else {
        resultsContainer.innerText = 'No results found';
    }
}

function clearSearchResults() {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = ''; // Clear previous results
}

async function getLatestChapter(mangaId) {
    try {
        const response = await fetch(`https://api.mangadex.org/manga/${mangaId}/aggregate`);
        const data = await response.json();
        const volumes = data.volumes;

        let latestChapter = '';
        for (const volume in volumes) {
            for (const chapter in volumes[volume].chapters) {
                latestChapter = `Volume ${volume}, Chapter ${chapter}`;
            }
        }
        return latestChapter || 'No chapters available';
    } catch (error) {
        console.error('Error fetching latest chapter:', error);
        return 'Error fetching chapters';
    }
}

function removeDuplicates(mangas) {
    const seen = new Set();
    return mangas.filter(manga => {
        const title = manga.attributes.title.en;
        if (seen.has(title)) {
            return false;
        }
        seen.add(title);
        return true;
    });
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
// Function to save history entry
async function saveHistory(mangaId, chapter) {
    try {
        const response = await fetch('/api/history/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mangaId, chapter })
        });
        if (!response.ok) {
            throw new Error('Failed to save history');
        }
        console.log('History saved successfully');
    } catch (error) {
        console.error('Error saving history:', error.message);
    }
}
async function fetchMangaDetails(mangaId) {
    try {
        const response = await fetch(`https://api.mangadex.org/manga/${mangaId}`);
        const mangaData = await response.json();

        if (mangaData.result === 'ok' && mangaData.response === 'entity') {
            const mangaAttributes = mangaData.data.attributes;
            const mangaTitle = mangaAttributes.title.en || 'No title available';
            const coverArtRelation = mangaData.data.relationships.find(rel => rel.type === 'cover_art');
            let coverArtUrl = '';
            
            if (coverArtRelation) {
                const coverArtId = coverArtRelation.id;
                const coverArtResponse = await fetch(`https://api.mangadex.org/cover/${coverArtId}`);
                const coverArtData = await coverArtResponse.json();
                coverArtUrl = coverArtData.data.attributes.fileName;
            }

            coverArtUrl = coverArtUrl ? `https://uploads.mangadex.org/covers/${mangaId}/${coverArtUrl}` : '';
            
            return {
                title: mangaTitle,
                coverArtUrl: coverArtUrl
            };
        } else {
            console.error('Error fetching manga details:', mangaData);
            return null;
        }
    } catch (error) {
        console.error('Error fetching manga details:', error);
        return null;
    }
}

async function loadLastVisitedManga() {
    try {
        const userId = document.getElementById('lastVisitedContent').dataset.userid;
        const response = await fetch(`/api/history/${userId}`);
        const data = await response.json();
        const lastVisitedContainer = document.getElementById('lastVisitedContent');

        if (Array.isArray(data)) {
            for (const manga of data) {
                const card = document.createElement('div');
                card.className = 'last-visited-cell';

                const mangaDetails = await fetchMangaDetails(manga.mangaId);
                if (mangaDetails) {
                    const { title, coverArtUrl } = mangaDetails;
                    const chapterNumber = parseInt(manga.chapter, 10);

                    const chapterButton = document.createElement('button');
                    chapterButton.className = 'chapter__button';
                    chapterButton.innerHTML = `<span>Chapter: ${chapterNumber}</span>`;
                    chapterButton.onclick = () => {
                        saveHistory(manga.mangaId, chapterNumber); // Save history when button is clicked
                        window.open(`https://mangadex.org/chapter/${chapterNumber}`, '_blank');
                    };

                    card.innerHTML = `
                        <img src="${coverArtUrl}" alt="${title} Cover Art">
                        <div class="truncate">${title}</div>
                    `;
                    card.appendChild(chapterButton);
                    lastVisitedContainer.appendChild(card);
                }
            }
        } else {
            console.error('Invalid data format for last visited manga:', data);
        }
    } catch (error) {
        console.error('Error loading last visited manga:', error);
    }
}
document.getElementById('logoutButton').addEventListener('click', function(e) {
    e.preventDefault();
    fetch('/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => {
        if (response.ok) {
            window.location.href = '/login';
        } else {
            alert('Failed to log out');
        }
    }).catch(error => {
        console.error('Error:', error);
    });
});


