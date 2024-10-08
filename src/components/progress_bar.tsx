import { Box, IconButton, LinearProgress, SxProps, Theme, Typography } from "@mui/material"
import { Cancel } from "@mui/icons-material"
import { FileInfo, formatSize, Progress } from "../utilities/utils"

type IProps = {
    progress: Progress;
    file: FileInfo;
    sx?: SxProps<Theme>
    onCancel?: () => void;
}

function ProgressBar({ progress, file, sx, onCancel }: IProps) {

    const cancel = () => {
        if (onCancel) onCancel()
    }

    return (
        <Box sx={sx}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LinearProgress variant="determinate" value={progress.percentage} sx={{ width: '100%' }} />
                <IconButton onClick={cancel}><Cancel /></IconButton>
            </Box>
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