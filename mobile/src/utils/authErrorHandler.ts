export const handleAuthError = (error: any): string => {
  // Check if it's a Firebase Error
  if (error?.code) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'The email address is badly formatted.';
      case 'auth/user-disabled':
        return 'This user account has been disabled.';
      case 'auth/user-not-found':
        return 'No user found with this email.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email.';
      case 'auth/weak-password':
        return 'Your password must be at least 6 characters long.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      default:
        return error.message || 'An unexpected authentication error occurred.';
    }
  }
  
  // Generic error fallback
  return error?.message || 'An unexpected error occurred.';
};
