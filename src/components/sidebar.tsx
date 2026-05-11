import { useState } from 'react';
import Circle from '@mui/icons-material/Circle';
import Lock from '@mui/icons-material/Lock';
import Upload from '@mui/icons-material/Upload';
import GitHub from '@mui/icons-material/GitHub';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useColorScheme } from '@mui/material/styles';

import {
    calculateSizePercentageUsed,
    calculateSizeUsed,
    FileInfo,
    formatBytes,
    sizePercentageToColor,
} from '../utilities/utils';
import FileUploadDialog from './dialog_file_upload';
import { Logo } from './logo';

type IProps = {
    files: Array<FileInfo>;
    allowedStorage: number;
    loadFileList: () => void;
};

function Sidebar(props: IProps) {
    const { mode, setMode } = useColorScheme();
    const [fileModalOpen, setFileModalOpen] = useState(false);

    const sizeUsed = calculateSizeUsed(props.files);
    const sizeUsedPercentage = calculateSizePercentageUsed(sizeUsed, props.allowedStorage);
    return (
        <Card
            elevation={4}
            sx={theme => ({
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: alpha(theme.palette.background.paper, 0.6),
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${theme.palette.divider}`,
            })}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 5,
                    paddingX: 8,
                    paddingTop: 5,
                    flexGrow: 1,
                }}
            >
                <Logo height={100} width={100} />

                <Stack textAlign="center" gap={2}>
                    <Typography>Space used:</Typography>
                    <Typography>
                        {formatBytes(sizeUsed)}/{formatBytes(props.allowedStorage)}
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        color={sizePercentageToColor(sizeUsedPercentage)}
                        value={sizeUsedPercentage}
                    />
                </Stack>

                {mode && (
                    <FormControlLabel
                        checked={mode === 'dark'}
                        onChange={() => setMode(mode === 'light' ? 'dark' : 'light')}
                        control={<Switch color="primary" />}
                        label={mode}
                        labelPlacement="top"
                    />
                )}

                <Stack alignItems="center" gap={1}>
                    <Button variant="contained" startIcon={<Upload />} onClick={() => setFileModalOpen(true)}>
                        Upload
                    </Button>
                    <Tooltip title="Files are encrypted with a per-file key in your browser before upload — the server only ever stores ciphertext. Encryption can be disabled per file under Advanced Options.">
                        <Chip
                            icon={<Lock fontSize="small" />}
                            label="End-to-end encrypted by default"
                            size="small"
                            color="success"
                            variant="outlined"
                        />
                    </Tooltip>
                </Stack>

                <FileUploadDialog
                    open={fileModalOpen}
                    closeDialog={() => setFileModalOpen(false)}
                    loadFileList={props.loadFileList}
                />
            </Box>
            <Alert severity="info" sx={{ textAlign: 'center', justifyContent: 'center' }}>
                <Typography variant="body2">
                    Created by{' '}
                    <Link href="https://francescogorini.com" target="_blank">
                        Francesco Gorini
                    </Link>
                </Typography>
                <Divider>
                    <Circle sx={{ fontSize: 8 }} />
                </Divider>
                <Typography variant="body2" display="flex" justifyContent="center" gap={1}>
                    <Link href="https://github.com/reznik99/cloud-storage-ui" target="_blank">
                        Open Source
                    </Link>
                    <GitHub fontSize="small" color="info" />
                </Typography>
            </Alert>
        </Card>
    );
}

export default Sidebar;
