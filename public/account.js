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
document.addEventListener('DOMContentLoaded', () => {
    const chgPwdButton = document.getElementById('chgPwd');
    const chgPwdForm = document.getElementById('chgPwdForm');
    const overlay = document.getElementById('overlay');
    const chgPwdFormElement = document.getElementById('chgPwdFormElement');

    // Function to show the change password form
    const showChgPwdForm = () => {
        chgPwdForm.style.display = 'block';
        overlay.style.display = 'block';
    };

    // Function to hide the change password form
    const hideChgPwdForm = () => {
        chgPwdForm.style.display = 'none';
        overlay.style.display = 'none';
    };

    // Show the change password form when the button is clicked
    chgPwdButton.addEventListener('click', showChgPwdForm);

    // Hide the form when the overlay is clicked
    overlay.addEventListener('click', hideChgPwdForm);

    // Handle the form submission
    chgPwdFormElement.addEventListener('submit', async (event) => {
        event.preventDefault();

        const password1 = document.getElementById('password1').value;
        const password2 = document.getElementById('password2').value;

        if (password1 !== password2) {
            alert('Passwords do not match!');
            return;
        }

        // Get the userId from the cookie
        const getCookieValue = (name) => {
            const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
            return match ? match[2] : null;
        };
        const userId = getCookieValue('userId');

        if (!userId) {
            console.error('User ID not found in the cookie');
            return;
        }

        try {
            const response = await fetch(`/api/change-password/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password: password1 }),
            });

            if (response.ok) {
                alert('Password changed successfully. Please log in again.');
                // Redirect to login page
                window.location.href = '/login';
            } else {
                const errorData = await response.json();
                alert('Error changing password: ' + errorData.message);
            }
        } catch (error) {
            console.error('Error changing password:', error);
            alert('An error occurred. Please try again later.');
        }
    });
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
