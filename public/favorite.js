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
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

document.addEventListener('DOMContentLoaded', async () => {
    const userId = "66607e8686640f1b4a9f78af";

    const response = await fetch(`/api/favorite/${userId}`);
    const favoriteManga = await response.json();

    const container = document.getElementById('favorites-list');
    favoriteManga.forEach(manga => {
        console.log(manga.coverArtUrl);
        const card = document.createElement('div');
        card.className = 'manga-card';
        card.innerHTML = `
            <img src="${manga.coverArtUrl}" alt="${manga.title} Cover Art">
            <div class="card-content">
                <div class="truncate resultTitle">${manga.title}</div>
                <div class="resultChapter">Latest Chapter: ${manga.latestChapter}</div>
                <div class="resultStatus">Status: ${manga.status}</div>
            </div>
        `;
        container.appendChild(card);
    });
});        

