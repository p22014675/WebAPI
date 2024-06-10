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
            
            // Get the latest chapter number
            const volumes = latestChapterData.volumes;
            let latestChapterNumber = 'OneShot';
            for (const volume in volumes) {
                for (const chapter in volumes[volume].chapters) {
                    latestChapterNumber = chapter || 'OneShot';
                }
            }

            // Create HTML elements to display manga details
            const card = document.createElement('div');
            card.className = 'favorite-manga-card';
            card.innerHTML = `
                <img src="${manga.coverArtUrl}" alt="${manga.title} Cover Art">
                <div class="favorite-card-content">
                    <div class="favorite-truncate resultTitle">${manga.title}</div>
                    <div class="favorite-resultChapter">Chapter: ${latestChapterNumber}</div>
                    <button class="readStatus">
                        <div>
                            <span>
                                <p>Reading</p>
                            </span>
                        </div>
                        <div>
                            <span>
                                <p>Completed</p>
                            </span>
                        </div>
                    </button>
                </div>
            `;
            
            const readStatusButton = card.querySelector('.readStatus');
            if (manga.status === 'Completed') {
                readStatusButton.classList.add('active');
            }
            
            readStatusButton.addEventListener('click', async () => {
                if (manga.status === 'Reading') {
                    const newStatus = 'Completed';
                    await updateReadStatus(userId, manga.mangaId, newStatus);
                    manga.status = newStatus;
                    readStatusButton.classList.add('active');
                    card.querySelector('.favorite-resultStatus').innerText = `Status: ${newStatus}`;
                } else if (manga.status === 'Completed') {
                    const newStatus = 'Reading';
                    await updateReadStatus(userId, manga.mangaId, newStatus);
                    manga.status = newStatus;
                    readStatusButton.classList.remove('active');
                    card.querySelector('.favorite-resultStatus').innerText = `Status: ${newStatus}`;
                }
            });
            container.appendChild(card);
        } catch (error) {
            console.error('Error fetching manga details:', error);
        }
    });
});

async function updateReadStatus(userId, mangaId, status) {
    try {
        const response = await fetch(`/api/updateReadStatus`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, mangaId, status })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error updating read status:', error);
    }
}

