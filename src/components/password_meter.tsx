import { Box, LinearProgress, Typography } from "@mui/material"
import { useEffect, useState } from "react"
import zxcvbn from "zxcvbn"

function getColor(strength: number): "success" | "info" | "error" | "primary" | "secondary" | "warning" {
    if (strength >= 75) return "success"
    if (strength >= 50) return "info"
    if (strength >= 25) return "warning"
    return "error"
}

function getDescription(strength: number): string {
    if (strength >= 75) return "Strong password"
    if (strength >= 50) return "Average password"
    if (strength >= 25) return "Weak password"
    return "Bruh 😒"
}

function PasswordMeter({ password }: { password: string }) {
    const [strength, setStrength] = useState(0)
    const [feedback, setFeedback] = useState('')

    useEffect(() => {
        const output = zxcvbn(password)
        setFeedback(output.feedback.warning || '')
        setStrength(((output.score + 1) / 5) * 100)
    }, [password])

    return (
        <Box sx={{ textAlign: 'center' }}>
            <LinearProgress variant="determinate"
                color={getColor(strength)}
                value={strength}
            />
            <Typography variant="body2" color={getColor(strength)}>{feedback || getDescription(strength)}</Typography>
        </Box>
    )
}

export default PasswordMeter