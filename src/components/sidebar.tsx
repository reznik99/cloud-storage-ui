
import { useState } from "react"
import Circle from "@mui/icons-material/Circle"
import Upload from "@mui/icons-material/Upload"
import GitHub from "@mui/icons-material/GitHub"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import Divider from "@mui/material/Divider"
import FormControlLabel from "@mui/material/FormControlLabel"
import LinearProgress from "@mui/material/LinearProgress"
import Link from "@mui/material/Link"
import Stack from "@mui/material/Stack"
import Switch from "@mui/material/Switch"
import Typography from "@mui/material/Typography"
import { useColorScheme } from "@mui/material/styles"

import { calculateSizePercentageUsed, calculateSizeUsed, FileInfo, formatBytes, sizePercentageToColor } from "../utilities/utils"
import FileUploadDialog from "./dialog_file_upload"
import { Logo } from "./logo"

type IProps = {
    files: Array<FileInfo>;
    allowedStorage: number;
    loadFileList: () => void;
}

function Sidebar(props: IProps) {
    const { mode, setMode } = useColorScheme()
    const [fileModalOpen, setFileModalOpen] = useState(false)

    const sizeUsed = calculateSizeUsed(props.files)
    const sizeUsedPercentage = calculateSizePercentageUsed(sizeUsed, props.allowedStorage)
    return (
        <Card elevation={4} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                paddingX: 8,
                paddingTop: 5,
                flexGrow: 1
            }}>
                <Logo height={100} width={100} />

                <Stack textAlign="center" gap={2}>
                    <Typography>Space used:</Typography>
                    <Typography>{formatBytes(sizeUsed)}/{formatBytes(props.allowedStorage)}</Typography>
                    <LinearProgress variant="determinate" color={sizePercentageToColor(sizeUsedPercentage)} value={sizeUsedPercentage} />
                </Stack>

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
                <Typography variant="body2" display="flex" justifyContent="center" gap={1}>
                    <Link href="https://github.com/reznik99/cloud-storage-ui" target="_blank">Open Source</Link>
                    <GitHub fontSize="small" color="info" />
                </Typography>
            </Alert>
        </Card>
    )
}

export default Sidebar