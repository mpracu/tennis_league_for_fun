const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();

// Handler function
exports.handler = async (event) => {
    // Parse the request body
    const { email, password } = JSON.parse(event.body);

    // Check if both email and password are provided
    if (!email || !password) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Email and password are required',
            }),
        };
    }

    // Define the parameters for Cognito's initiateAuth
    const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: process.env.COGNITO_CLIENT_ID, // Cognito App Client ID
        AuthParameters: {
            USERNAME: email, // Use email as the username
            PASSWORD: password
        }
    };

    try {
        // Attempt to authenticate the user with Cognito
        const result = await cognito.initiateAuth(params).promise();

        // Successful authentication
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Login successful',
                idToken: result.AuthenticationResult.IdToken,
                accessToken: result.AuthenticationResult.AccessToken,
                refreshToken: result.AuthenticationResult.RefreshToken,
            }),
        };
    } catch (error) {
        // Handle specific errors (e.g., wrong password, user not confirmed)
        let errorMessage = 'Login failed';
        if (error.code === 'NotAuthorizedException') {
            errorMessage = 'Incorrect email or password';
        } else if (error.code === 'UserNotConfirmedException') {
            errorMessage = 'User not confirmed. Please confirm your account';
        } else if (error.code === 'PasswordResetRequiredException') {
            errorMessage = 'Password reset required. Please reset your password';
        }

        // Log the error for debugging purposes
        console.error('Error authenticating user:', error);

        // Return the error response
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: errorMessage,
                error: error.message,
            }),
        };
    }
};

