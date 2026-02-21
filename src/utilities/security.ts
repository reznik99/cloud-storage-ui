import zxcvbn from 'zxcvbn';

const security = {
    minPasswordLength: 8,
    minPasswordScore: 1,
};

export function GetPasswordScore(password: string): number {
    return zxcvbn(password).score;
}

export function ValidatePassword(password: string): string {
    if (!password) return 'Password is required';

    if (password !== password.trim()) return 'Whitespace at the start or end of the password is not permitted';

    if (password.length < security.minPasswordLength)
        return `Your password needs to be at least ${security.minPasswordLength} characters long`;

    if (GetPasswordScore(password) < security.minPasswordScore) return 'Password too weak';

    return ''; // Valid password
}
