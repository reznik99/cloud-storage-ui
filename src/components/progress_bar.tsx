import { Box, LinearProgress, SxProps, Theme, Typography } from "@mui/material"
import { FileInfo, formatSize, Progress } from "../utilities/utils"

type IProps = {
    progress: Progress;
    file: FileInfo;
    sx?: SxProps<Theme>
}

function ProgressBar({ progress, file, sx }: IProps) {
    return (
        <Box sx={sx}>
            <LinearProgress variant="determinate" value={progress.percentage} />
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {`${progress.percentage}% (${formatSize(progress.bytesProcessed)}/${formatSize(file?.size || 0)})`}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>estimate {`${progress.estimateSec}s`}</Typography>
            </Box>
        </Box>
    )
}

export default ProgressBar