document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch user details using the userId from the cookie
        const userId = getCookie('userId');
        if (!userId) {
            throw new Error('User ID not found in cookie');
        }
        const response = await fetch(`/api/user-details/${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch user details');
        }
        const userDetails = await response.json();
        document.querySelector('.name').textContent = userDetails.username;
        document.querySelector('.email').textContent = userDetails.email;
    } catch (error) {
        console.error('Error fetching user details:', error);
    }

})
// Handle Change Password button click
document.getElementById('chgPwd').addEventListener('click', () => {
    // Redirect to change password page or open a modal
    window.location.href = '/change-password'; // Adjust the URL as needed
});

// Handle Clear Favorite List button click
document.addEventListener('DOMContentLoaded', () => {
    const clearFavoriteButton = document.getElementById('clearFavorite');

    if (clearFavoriteButton) {
        clearFavoriteButton.addEventListener('click', async () => {
            try {
                const userId = getCookie('userId'); 

                const response = await fetch(`/api/clear-favorite/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    alert(data.message); // Display success message
                } else {
                    alert(data.message); // Display error message
                }
            } catch (error) {
                console.error('Error clearing favorite list:', error);
                alert('Failed to clear favorite list. Please try again.');
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const clearLastVisitButton = document.getElementById('clearLastVisit');

    if (clearLastVisitButton) {
        clearLastVisitButton.addEventListener('click', async () => {
            try {
                const userId = getCookie('userId');
            if (!userId) {
                throw new Error('User ID not found in cookie');
            }

                const response = await fetch(`/api/clear-last-visited/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    alert(data.message); // Display success message
                } else {
                    alert(data.message); // Display error message
                }
            } catch (error) {
                console.error('Error clearing last visited:', error);
                alert('Failed to clear last visited manga. Please try again.');
            }
        });
    }
});

// Function to get cookie value by name
function getCookie(name) {
    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.split('=');
        if (cookieName === name) {
            return cookieValue;
        }
    }
    return null;
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
