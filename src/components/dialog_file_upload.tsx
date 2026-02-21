import { useCallback, useRef, useState } from 'react';
import { useSnackbar } from 'notistack';
import Add from '@mui/icons-material/Add';
import Cancel from '@mui/icons-material/Cancel';
import ExpandMore from '@mui/icons-material/ExpandMore';
import UploadFile from '@mui/icons-material/UploadFile';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

import { fileToFileInfo, getErrorString, Progress } from '../utilities/utils';
import { EncryptFile } from '../utilities/crypto';
import api from '../networking/endpoints';
import ProgressBar from './progress_bar';
import { DialogContentText } from '@mui/material';

type IProps = {
    open: boolean;
    closeDialog: () => void;
    loadFileList: () => void;
};

function FileUploadDialog(props: IProps) {
    const { enqueueSnackbar } = useSnackbar();
    const controller = useRef(new AbortController());

    const [selectedFile, setSelectedFile] = useState<File | null>();
    const [progress, setProgress] = useState<Progress | null>();
    const [loading, setLoading] = useState(false);
    const [encryptionEnabled, setEncryptionEnabled] = useState(true);

    const handleFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedFile(event.target?.files?.[0]);
    }, []);

    const closeDialog = useCallback(() => {
        props.closeDialog();
        setSelectedFile(null);
        setEncryptionEnabled(true);
        controller.current.abort();
    }, [props]);

    const uploadFile = useCallback(async () => {
        if (!selectedFile) return;
        try {
            setLoading(true);
            controller.current = new AbortController();
            if (encryptionEnabled) {
                const encFile = await EncryptFile(selectedFile);
                await api.uploadFile(
                    encFile.encryptedFile,
                    encFile.encryptedFileKey,
                    setProgress,
                    controller.current.signal,
                );
            } else {
                await api.uploadFile(selectedFile, undefined, setProgress, controller.current.signal);
            }

            closeDialog();
            props.loadFileList();
            enqueueSnackbar('File uploaded successfully', { variant: 'success' });
        } catch (err: unknown) {
            const error = getErrorString(err);
            console.error(err);
            enqueueSnackbar('Upload failed: ' + error, { variant: 'error' });
        } finally {
            setProgress(null);
            setLoading(false);
        }
    }, [selectedFile, encryptionEnabled, props, closeDialog, enqueueSnackbar]);

    return (
        <Dialog
            open={props.open}
            fullWidth={true}
            onClose={closeDialog}
            aria-labelledby="file-dialog-title"
            aria-describedby="file-dialog-description"
        >
            <DialogTitle id="file-dialog-title">File Upload</DialogTitle>
            <DialogContent>
                <DialogContentText id="link-dialog-description">
                    Select a file to upload (max size: 1.0 GB)
                </DialogContentText>

                <Button
                    sx={{ paddingX: 5, marginY: 3 }}
                    component="label"
                    variant={selectedFile?.name ? 'contained' : 'text'}
                    startIcon={<Add />}
                >
                    {selectedFile?.name ?? 'Select File'}
                    <input onChange={handleFile} type="file" hidden />
                </Button>

                {selectedFile && (
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>Advanced Options</AccordionSummary>
                        <AccordionDetails>
                            <FormGroup>
                                <FormLabel>File Encryption</FormLabel>
                                <Switch checked={encryptionEnabled} onChange={e => setEncryptionEnabled(e.target.checked)} />
                            </FormGroup>
                        </AccordionDetails>
                    </Accordion>
                )}

                <Alert severity={encryptionEnabled ? 'info' : 'warning'}>
                    {encryptionEnabled ? (
                        <Typography>File will be End-To-End encrypted!</Typography>
                    ) : (
                        <Typography>
                            File will not be encrypted!
                            <br />
                            Only disable encryption if video/mp4 files are to be shared.
                            <br />
                            This will allow a shared link to be used for streaming the video to the browser.
                        </Typography>
                    )}
                </Alert>

                {progress && (
                    <ProgressBar
                        sx={{ mt: 2 }}
                        onCancel={() => controller.current.abort()}
                        progress={progress}
                        file={fileToFileInfo(selectedFile)}
                    />
                )}
            </DialogContent>
            <DialogActions>
                <Button variant="text" startIcon={<Cancel />} onClick={closeDialog}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    disabled={loading || !selectedFile}
                    startIcon={<UploadFile />}
                    onClick={uploadFile}
                    autoFocus
                >
                    Upload
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default FileUploadDialog;
