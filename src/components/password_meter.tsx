import { Box, LinearProgress, Typography } from "@mui/material"
import { useEffect, useState } from "react"
import zxcvbn from "zxcvbn"

function normalizeStrength(score: number) {
    return ((score + 1) / 5) * 100
}

function getColor(score: number): "success" | "info" | "error" | "primary" | "secondary" | "warning" {
    switch (score) {
        case 0: return "error"
        case 1: return "error"
        case 2: return "warning"
        case 3: return "info"
        case 4: return "success"
        default: return "success"
    }
}

function getDescription(score: number): string {
    switch (score) {
        case 0: return "Bruh 😒"
        case 1: return "Very weak password"
        case 2: return "Weak password"
        case 3: return "Average password"
        case 4: return "Strong password"
        default: return "Strong password"
    }
}

function PasswordMeter({ password }: { password: string }) {
    const [strength, setStrength] = useState<zxcvbn.ZXCVBNResult | null>()

    useEffect(() => {
        const output = zxcvbn(password)
        setStrength(output)
    }, [password])

    return (
        <Box sx={{ textAlign: 'center' }}>
            <LinearProgress variant="determinate"
                color={getColor(strength?.score || 0)}
                value={normalizeStrength(strength?.score || 0)}
            />
            <Typography variant="body2"
                color={getColor(strength?.score || 0)}>
                {getDescription(strength?.score || 0)}
            </Typography>
            {strength?.crack_times_display?.offline_slow_hashing_1e4_per_second &&
                <Typography variant="body2" color={getColor(strength?.score || 0)}>
                    Time to crack: {strength?.crack_times_display?.offline_slow_hashing_1e4_per_second}
                </Typography>
            }
        </Box>
    )
}

export default PasswordMeter