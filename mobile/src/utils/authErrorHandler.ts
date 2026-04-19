export const handleAuthError = (error: any): string => {
  // Check if it's a Firebase Error
  if (error?.code) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'The email address is badly formatted.';
      case 'auth/user-disabled':
        return 'This user account has been disabled.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password.'; // Obfuscate exact error to prevent user enumeration
      case 'auth/email-already-in-use':
        return 'An account already exists with this email.';
      case 'auth/weak-password':
        return 'Your password is too weak. Please use at least 8 characters, including an uppercase letter and a number.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      case 'auth/too-many-requests':
        return 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
      case 'auth/operation-not-allowed':
        return 'This authentication operation is not enabled on the server.';
      case 'auth/credential-already-in-use':
        return 'This Google account is already linked to another user.';
      case 'auth/unregistered-google-account':
        return 'It looks like you don’t have an account with us yet. Please sign up first.';
      default:
        // Print the code out so developer can see it
        return `An unexpected authentication error occurred (${error.code}). ${error.message || ''}`;
    }
  }
  
  // Generic error fallback
  return error?.message || 'An unexpected error occurred.';
};
