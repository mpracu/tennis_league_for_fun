const API_BASE_URL = 'https://vof6ldfts1.execute-api.us-east-1.amazonaws.com/dev';  // Replace with your API Gateway URL


document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.toggle').addEventListener('click', toggleForm);
    document.getElementById('action-button').addEventListener('click', handleAction);
    document.getElementById('sign-out-button').addEventListener('click', handleSignOut);
});

function toggleForm() {
    const formTitle = document.getElementById('form-title');
    const actionButton = document.getElementById('action-button');
    const toggleText = document.querySelector('.toggle');

    if (formTitle.textContent === 'Sign In') {
        formTitle.textContent = 'Register';
        actionButton.textContent = 'Register';
    } else {
        formTitle.textContent = 'Sign In';
        actionButton.textContent = 'Sign In';
    }

    toggleText.textContent = formTitle.textContent === 'Sign In'
        ? "Don't have an account? Register"
        : 'Already have an account? Sign In';
}

async function handleAction() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const formTitle = document.getElementById('form-title').textContent;
    if (formTitle === 'Sign In') {
        await handleSignIn(email, password);
    } else {
        await handleRegister(email, password);
    }
}

async function handleSignIn(email, password) {
    try {
        console.log("Attempting to sign in with:", email, password);
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                      "Content-Type": "application/json",

            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error during sign in');
        }

        const data = await response.json();
        console.log("Sign in response data:", data);



        
        showWelcomeMessage(email);
        localStorage.setItem('accessToken', data.accessToken);
    } catch (error) {
        console.error('Sign in error:', error);

        // Improved error logging
        if (error instanceof TypeError) {
            console.error("This appears to be a TypeError:", error.message);
        } else {
            console.error("Unexpected error:", error.message);
        }

        document.getElementById('error-message').textContent = 'Error signing in: ' + error.message;
    }
}

async function handleRegister(email, password) {
    try {
        console.log("Attempting to register with:", email, password);
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                      "Content-Type": "application/json",

            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error during registration');
        }

        const data = await response.json();
        console.log("Registration response data:", data);

        alert('Registration successful! Please sign in.');
        toggleForm();  // Switch back to sign-in form
    } catch (error) {
        console.error('Registration error:', error);

        // Improved error logging
        if (error instanceof TypeError) {
            console.error("This appears to be a TypeError:", error.message);
        } else {
            console.error("Unexpected error:", error.message);
        }

        document.getElementById('error-message').textContent = 'Error registering: ' + error.message;
    }
}

async function handleSignOut() {
    const accessToken = localStorage.getItem('accessToken');

    try {
        console.log("Attempting to sign out with access token:", accessToken);
        const response = await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            headers: {
                      "Content-Type": "application/json",
                    
            },
            body: JSON.stringify({ accessToken }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error during sign out');
        }

        console.log("Sign out successful");
        localStorage.removeItem('accessToken');
        document.getElementById('welcome').style.display = 'none';
        document.getElementById('form-title').style.display = 'block';
        document.getElementById('form').style.display = 'block';
    } catch (error) {
        console.error('Sign out error:', error);

        // Improved error logging
        if (error instanceof TypeError) {
            console.error("This appears to be a TypeError:", error.message);
        } else {
            console.error("Unexpected error:", error.message);
        }

        document.getElementById('error-message').textContent = 'Error signing out: ' + error.message;
    }
}



function showWelcomeMessage(username) {
    localStorage.setItem('username', username); // Store username for future use
    window.location.href = '/market.html'; // Redirect to the market page
}



/*
function showWelcomeMessage(username) {
    document.getElementById('form').style.display = 'none';
    document.getElementById('form-title').style.display = 'none';
    document.getElementById('welcome').style.display = 'block';
    document.getElementById('welcome-username').textContent = username;
} 

*/