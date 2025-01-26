import { useCallback, useRef, useState } from "react"
import { Cancel, ExpandMore, Key, UploadFile } from "@mui/icons-material"
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormGroup, FormLabel, Switch, Typography } from "@mui/material"
import { useSnackbar } from "notistack"
import { fileToFileInfo, getErrorString, Progress } from "../utilities/utils"
import { BufferEquals, DecryptFile, EncryptFile, Hash } from "../utilities/crypto"
import api from "../networking/endpoints"
import ProgressBar from "./progress_bar"

type IProps = {
    open: boolean;
    closeDialog: () => void;
    loadFileList: () => void;
}

function FileUploadDialog(props: IProps) {
    const { enqueueSnackbar } = useSnackbar()
    const controller = useRef(new AbortController())

    const [selectedFile, setSelectedFile] = useState<File | null>()
    const [progress, setProgress] = useState<Progress | null>()
    const [loading, setLoading] = useState(false)
    const [encryptionEnabled, setEncryptionEnabled] = useState(true)

    const handleFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedFile(event.target?.files?.[0])
    }, [])

    const closeDialog = useCallback(() => {
        props.closeDialog()
        setSelectedFile(null)
        controller.current.abort()
    }, [props])

    const uploadFile = useCallback(async () => {
        if (!selectedFile) return
        try {
            setLoading(true)
            controller.current = new AbortController()

            const encFile = await EncryptFile(selectedFile)
            await api.uploadFile(encFile.encryptedFile, encFile.encryptedFileKey, setProgress, controller.current.signal)

            closeDialog()
            props.loadFileList()
            enqueueSnackbar("File uploaded successfully", { variant: "success" })
        } catch (err: unknown) {
            const error = getErrorString(err)
            console.error(err)
            enqueueSnackbar("Upload failed: " + error, { variant: "error" })
        } finally {
            setProgress(null)
            setLoading(false)
        }
    }, [selectedFile, props, closeDialog, enqueueSnackbar])

    const testEncryption = useCallback(async () => {
        if (!selectedFile) return
        try {
            setLoading(true)
            const encFile = await EncryptFile(selectedFile)

            const decFile = await DecryptFile(encFile.encryptedFileKey, fileToFileInfo(selectedFile), encFile.encryptedFile)

            // Hash both original file data and decrypted file data to check they match
            const originalHash = await Hash(await selectedFile.arrayBuffer(), "SHA-256")
            const decryptedHash = await Hash(await decFile.arrayBuffer(), "SHA-256")
            const equal = BufferEquals(new Uint8Array(originalHash), new Uint8Array(decryptedHash))
            if (!equal) throw new Error("Decrypted file doesn't match original")

            enqueueSnackbar("Encryption tests succeeded", { variant: "success" })
        } catch (err: unknown) {
            console.error(err)
            enqueueSnackbar("Encryption tests failed: " + err, { variant: "error" })
        } finally {
            setLoading(false)
        }
    }, [selectedFile, enqueueSnackbar])

    return (
        <Dialog open={props.open}
            fullWidth={true}
            onClose={closeDialog}
            aria-labelledby="file-dialog-title"
            aria-describedby="file-dialog-description">
            <DialogTitle id="file-dialog-title">File Upload</DialogTitle>
            <DialogContent>
                <Alert severity={encryptionEnabled ? "info" : "warning"}>
                    {encryptionEnabled
                        ? <Typography>File will be End-To-End encrypted!</Typography>
                        : <Typography>File will not be encrypted!<br />
                            Only disable encryption if video/mp4 files are to be shared.<br />
                            This will allow a shared link to be used for streaming the video to the browser.
                        </Typography>
                    }
                </Alert>

                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', my: 2 }}>
                    <Button sx={{ paddingX: 5 }}
                        component="label"
                        variant={selectedFile?.name ? "contained" : "outlined"} >
                        {selectedFile?.name ?? "Select File"}
                        <input onChange={handleFile} type="file" hidden />
                    </Button>
                </Box>

                {selectedFile && <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>Advanced Options</AccordionSummary>
                    <AccordionDetails>
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}>
                            <FormGroup>
                                <FormLabel>File Encryption</FormLabel>
                                <Switch checked={encryptionEnabled}
                                    onChange={e => setEncryptionEnabled(e.target.checked)} />
                            </FormGroup>
                            <Button variant="text"
                                startIcon={loading ? <CircularProgress size={15} /> : <Key />}
                                onClick={testEncryption}
                                disabled={loading || !selectedFile}>
                                Test Encryption
                            </Button>
                        </Box>
                    </AccordionDetails>
                </Accordion>}

                {progress && <ProgressBar sx={{ mt: 2 }}
                    onCancel={() => controller.current.abort()}
                    progress={progress}
                    file={fileToFileInfo(selectedFile)} />
                }
            </DialogContent>
            <DialogActions>
                <Button variant="text"
                    startIcon={<Cancel />}
                    onClick={closeDialog}>
                    Cancel
                </Button>
                <Button variant="contained"
                    disabled={loading || !selectedFile}
                    startIcon={<UploadFile />}
                    onClick={uploadFile} autoFocus>
                    Upload
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default FileUploadDialog