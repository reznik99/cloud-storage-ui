import zxcvbn from 'zxcvbn';

const passSecurity = {
    minLength: 8,
    minScore: 1
}

export function GetPasswordScore(password: string): number {
    return zxcvbn(password).score
}

export function ValidatePassword(password: string): string {

    if (!password) return "Password is required"

    if (password !== password.trim()) return "Whitespace at the start or end of the password is not permitted"

    if (password.length < passSecurity.minLength) return `Your password needs to be at least ${passSecurity.minLength} characters long`

    if (GetPasswordScore(password) < passSecurity.minScore) return "Password too weak"

    return "" // Valid password
}

