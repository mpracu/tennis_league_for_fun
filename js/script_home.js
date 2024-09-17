$(document).ready(function () {
    // Check if the user is already logged in when the app starts
    tennis_app_user.checkUser();

    // Handle sign-in form submission
    $('#signinForm').submit(handleSignin);

    // Handle registration form submission
    $('#registrationForm').submit(handleRegister);

    // Handle verification form submission
    $('#verifyForm').submit(handleVerify);
});