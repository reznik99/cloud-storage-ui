
import { useState } from "react"
import { Box, Button, Card, FormControlLabel, LinearProgress, Switch, Typography, useColorScheme } from "@mui/material"
import { Upload } from "@mui/icons-material"
import { calculateSizePercentageUsed, calculateSizeUsed, FileInfo } from "../utilities/utils"
import viteLogo from '/vite.svg'
import FileUploadDialog from "./file_upload"

type IProps = {
    files: Array<FileInfo>;
    loadFileList: () => void;
}

function Sidebar(props: IProps) {
    const { mode, setMode } = useColorScheme()
    const [fileModalOpen, setFileModalOpen] = useState(false)

    return (
        <Card sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 5,
            paddingX: 5
        }}>
            <a href="https://vitejs.dev" target="_blank">
                <img src={viteLogo} className="logo" alt="Vite logo" />
            </a>
            <Box sx={{ width: '100%', textAlign: 'center' }}>
                <Typography>Space used:</Typography>
                <Typography>{calculateSizeUsed(props.files)} MiB/1,000 MiB</Typography>
                <LinearProgress variant="determinate" value={calculateSizePercentageUsed(calculateSizeUsed(props.files), 1000)} />
            </Box>

            {mode &&
                <FormControlLabel checked={mode === 'dark'}
                    onChange={() => setMode(mode === 'light' ? 'dark' : 'light')}
                    control={<Switch color="primary" />}
                    label={mode}
                    labelPlacement="top"
                />
            }

            <Button variant="contained"
                startIcon={<Upload />}
                onClick={() => setFileModalOpen(true)}>
                Upload
            </Button>

            <FileUploadDialog open={fileModalOpen}
                closeDialog={() => setFileModalOpen(false)}
                loadFileList={props.loadFileList}
            />

        </Card>
    )
}

export default Sidebar