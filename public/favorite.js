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
document.addEventListener('DOMContentLoaded', async () => {
    // Function to extract cookie value by name
    const getCookieValue = (name) => {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
    };

    // Retrieve userId from the cookie
    const userId = getCookieValue('userId');

    if (!userId) {
        console.error('User ID not found in the cookie');
        return;
    }

    const response = await fetch(`/api/favorite/${userId}`);
    const favoriteManga = await response.json();
    console.log(favoriteManga);
    const container = document.getElementById('favorites-list');
    favoriteManga.forEach(async (manga) => {
        try {
            // Fetch latest chapter information
            const latestChapterLink = `https://api.mangadex.org/manga/${manga.mangaId}/aggregate`;
            console.log('Latest Chapter Link:', latestChapterLink);
            const latestChapterResponse = await fetch(latestChapterLink);
            const latestChapterData = await latestChapterResponse.json();

            let latestChapterNumber = 'OneShot';
            if (latestChapterData.result === 'ok' && latestChapterData.volumes) {
                const volumes = latestChapterData.volumes;
                let lastVolume = Object.keys(volumes).pop();
                let lastChapter = Object.keys(volumes[lastVolume].chapters).pop();
                latestChapterNumber = volumes[lastVolume].chapters[lastChapter].chapter;
            }

            // Create HTML elements to display manga details
            const card = document.createElement('div');
            card.className = 'favorite-manga-card';
            card.innerHTML = `
                <img src="${manga.coverArtUrl}" alt="${manga.title} Cover Art">
                <div class="favorite-card-content">
                    <div class="favorite-truncate resultTitle">${manga.title}</div>
                    <div class="favorite-resultChapter">${latestChapterNumber !== 'OneShot' ? `Chapter: ${latestChapterNumber}` : 'Chapter: OneShot'}</div>
                    <div class="favorite-resultStatus">Status: ${manga.status}</div>
                   <div class="button-container">
            <button class="readStatus ${manga.status === 'Reading' ? '' : 'active'}">
                <div><span><p>Reading</p></span></div>
                <div><span><p>Completed</p></span></div>
            </button>
            <button class="bin-button">
                <svg class="bin-top" viewBox="0 0 39 7" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line y1="5" x2="39" y2="5" stroke="white" stroke-width="4"></line>
                    <line x1="12" y1="1.5" x2="26.0357" y2="1.5" stroke="white" stroke-width="3"></line>
                </svg>
                <svg class="bin-bottom" viewBox="0 0 33 39" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <mask id="path-1-inside-1_8_19" fill="white">
                        <path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z"></path>
                    </mask>
                    <path d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z" fill="white" mask="url(#path-1-inside-1_8_19)"></path>
                    <path d="M12 6L12 29" stroke="white" stroke-width="4"></path>
                    <path d="M21 6V29" stroke="white" stroke-width="4"></path>
                </svg>
            </button>
        </div>
                </div>
            `;
            container.appendChild(card);

            // Toggle read status
            const readStatusButton = card.querySelector('.readStatus');
            if (manga.status === 'Completed') {
                readStatusButton.classList.add('active');
            }

            readStatusButton.addEventListener('click', async () => {
                const newStatus = manga.status === 'Reading' ? 'Completed' : 'Reading';
                await updateReadStatus(userId, manga.mangaId, newStatus);
                manga.status = newStatus;
                readStatusButton.classList.toggle('active', newStatus === 'Completed');
                card.querySelector('.favorite-resultStatus').innerText = `Status: ${newStatus}`;
            });

            // Remove manga event listener
            const removeButton = card.querySelector('.bin-button');
            removeButton.addEventListener('click', async () => {
                await removeMangaFromFavorites(userId, manga.mangaId);
                card.remove();
            });

        } catch (error) {
            console.error('Error fetching manga details:', error);
        }
    });
});

async function updateReadStatus(userId, mangaId, status) {
    try {
        const response = await fetch(`/api/update-read-status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, mangaId, status }),
        });
        if (!response.ok) {
            throw new Error('Failed to update read status');
        }
    } catch (error) {
        console.error('Error updating read status:', error);
    }
}

async function removeMangaFromFavorites(userId, mangaId) {
    try {
        const response = await fetch(`/api/remove-favorite`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, mangaId }),
        });
        if (!response.ok) {
            throw new Error('Failed to remove manga from favorites');
        }
    } catch (error) {
        console.error('Error removing manga from favorites:', error);
    }
}
