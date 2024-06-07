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
});

async function fetchRandomManga() {
    try {
        const response = await fetch('/api/random');
        const data = await response.json();

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
            chapters.forEach(chapter => {
                const chapterLink = document.createElement('a');
                chapterLink.href = `https://mangadex.org/chapter/${chapter.id}`;
                chapterLink.target = '_blank';
                chapterLink.innerText = `Chapter ${chapter.attributes.chapter || 'N/A'}`;
                chaptersList.appendChild(chapterLink);
                chaptersList.appendChild(document.createElement('br'));
            });
        } else {
            chaptersList.innerText = 'No chapters available';
        }

        const favoriteCheckbox = document.getElementById('favoriteCheckbox');
        favoriteCheckbox.checked = false; // Reset the checkbox state
        favoriteCheckbox.onclick = () => toggleFavorite(data.id);
    } catch (error) {
        console.error('Error fetching random manga:', error);
    }
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
        const recentUpdatesTable = document.getElementById('recentUpdatesTable');

        if (Array.isArray(data)) {
            data.forEach(async manga => {
                const coverArtRelation = manga.relationships.find(rel => rel.type === 'cover_art');
                const coverArtUrl = coverArtRelation ? `https://uploads.mangadex.org/covers/${manga.id}/${coverArtRelation.attributes.fileName}` : '';
                const mangaTitle = manga.attributes.title.en || 'No title available';
                const latestChapterId = manga.attributes.latestUploadedChapter || 'N/A';

                if (latestChapterId !== 'N/A') {
                    const chapterResponse = await fetch(`https://api.mangadex.org/chapter/${latestChapterId}`);
                    const chapterData = await chapterResponse.json();
                    const chapterNumber = chapterData.data.attributes.chapter || 'N/A';
                    const chapterLink = `<a href="https://mangadex.org/chapter/${latestChapterId}" target="_blank">Chapter ${chapterNumber}</a>`;

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><img src="${coverArtUrl}" alt="Cover Art" style="max-width: 100px; height: auto;"></td>
                        <td>${mangaTitle}</td>
                        <td>${chapterLink}</td>
                    `;
                    recentUpdatesTable.appendChild(row);
                } else {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><img src="${coverArtUrl}" alt="Cover Art" style="max-width: 100px; height: auto;"></td>
                        <td>${mangaTitle}</td>
                        <td>N/A</td>
                    `;
                    recentUpdatesTable.appendChild(row);
                }
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

fetchRecentMangaUpdates();
fetchRandomManga();