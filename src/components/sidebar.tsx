
import { useState } from "react"
import Circle from "@mui/icons-material/Circle"
import Upload from "@mui/icons-material/Upload"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import Divider from "@mui/material/Divider"
import FormControlLabel from "@mui/material/FormControlLabel"
import LinearProgress from "@mui/material/LinearProgress"
import Link from "@mui/material/Link"
import Switch from "@mui/material/Switch"
import Typography from "@mui/material/Typography"

import { calculateSizePercentageUsed, calculateSizeUsed, FileInfo, sizePercentageToColor } from "../utilities/utils"
import FileUploadDialog from "./dialog_file_upload"
import viteLogo from '/vite.svg'
import { useColorScheme } from "@mui/material/styles"

type IProps = {
    files: Array<FileInfo>;
    loadFileList: () => void;
}

function Sidebar(props: IProps) {
    const { mode, setMode } = useColorScheme()
    const [fileModalOpen, setFileModalOpen] = useState(false)

    const sizeUsed = calculateSizeUsed(props.files)
    const sizeUsedPercentage = calculateSizePercentageUsed(sizeUsed, 1000)
    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                paddingX: 8,
                flexGrow: 1
            }}>
                <a href="https://vitejs.dev" target="_blank">
                    <img src={viteLogo} className="logo" alt="Vite logo" />
                </a>
                <Box sx={{ width: '100%', textAlign: 'center' }}>
                    <Typography>Space used:</Typography>
                    <Typography>{sizeUsed} MB/1,000 MB</Typography>
                    <LinearProgress variant="determinate" color={sizePercentageToColor(sizeUsedPercentage)} value={sizeUsedPercentage} />
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
            </Box>
            <Alert severity="info" sx={{ textAlign: 'center', justifyContent: 'center' }}>
                <Typography variant="body2">
                    Created by <Link href="https://francescogorini.com" target="_blank">Francesco Gorini</Link>
                </Typography>
                <Divider><Circle sx={{ fontSize: 8 }} /></Divider>
                <Typography variant="body2">
                    Source code <Link href="https://github.com/reznik99/cloud-storage-ui" target="_blank">github.com</Link>
                </Typography>
            </Alert>
        </Card>
    )
}

export default Sidebar