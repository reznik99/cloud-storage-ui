import { useCallback, useRef, useState } from "react"
import { Cancel, ExpandMore, Key, UploadFile } from "@mui/icons-material"
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography } from "@mui/material"
import { useSnackbar } from "notistack"
import { fileToFileInfo, getErrorString, Progress } from "../utilities/utils"
import { BufferEquals, DecryptFile, EncryptFile, Hash } from "../utilities/crypto"
import api from "../networking/endpoints"
import ProgressBar from "./progress_bar"
import { useSelector } from "react-redux"
import { RootState } from "../store/store"

type IProps = {
    open: boolean;
    closeDialog: () => void;
    loadFileList: () => void;
}

function FileUploadDialog(props: IProps) {
    const { enqueueSnackbar } = useSnackbar()
    const controller = useRef(new AbortController())

    const password = useSelector((state: RootState) => state.user.password)
    const [selectedFile, setSelectedFile] = useState<File | null>()
    const [progress, setProgress] = useState<Progress | null>()
    const [testLoading, setTestLoading] = useState(false)

    const handleFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedFile(event.target?.files?.[0])
    }, [])

    const handleCancel = useCallback(() => {
        props.closeDialog()
        setSelectedFile(null)
        controller.current.abort()
    }, [props])

    const uploadFile = useCallback(async () => {
        if (!selectedFile) return

        controller.current = new AbortController()
        try {
            const encFile = await EncryptFile(selectedFile)
            await api.uploadFile(encFile.encryptedFile, encFile.encryptedFileKey, setProgress, controller.current.signal)
            handleCancel()
            props.loadFileList()
            enqueueSnackbar("File uploaded successfully", { variant: "success" })
        } catch (err: unknown) {
            const error = getErrorString(err)
            console.error(err)
            enqueueSnackbar("Upload failed: " + error, { variant: "error" })
        } finally {
            setProgress(null)
        }
    }, [selectedFile, props, handleCancel, enqueueSnackbar])

    const testEncryption = useCallback(async () => {
        if (!selectedFile) return
        try {
            setTestLoading(true)
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
            setTestLoading(false)
        }
    }, [selectedFile, password, enqueueSnackbar])

    return (
        <Dialog open={props.open}
            fullWidth={true}
            onClose={handleCancel}
            aria-labelledby="file-dialog-title"
            aria-describedby="file-dialog-description">
            <DialogTitle id="file-dialog-title">Select file</DialogTitle>
            <DialogContent>
                <DialogContentText id="file-dialog-description">
                    Select a file to upload to store on the cloud.
                </DialogContentText>

                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', my: 2 }}>
                    <Button variant={selectedFile?.name ? "contained" : "outlined"} component="label">
                        {selectedFile?.name ?? "Select File"}
                        <input onChange={handleFile} type="file" hidden />
                    </Button>
                </Box>

                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>Advanced Options</AccordionSummary>
                    <AccordionDetails>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 2 }}>
                            <Typography variant="body2">Encrypt your file with a password to provide End to End encryption!</Typography>
                            <Button variant="text"
                                startIcon={testLoading ? <CircularProgress /> : <Key />}
                                onClick={testEncryption}
                                disabled={testLoading || !selectedFile}>
                                Test Encryption
                            </Button>
                        </Box>
                    </AccordionDetails>
                </Accordion>

                {progress && <ProgressBar sx={{ mt: 2 }}
                    onCancel={() => controller.current.abort()}
                    progress={progress}
                    file={fileToFileInfo(selectedFile)} />
                }
            </DialogContent>
            <DialogActions>
                <Button variant="text"
                    startIcon={<Cancel />}
                    onClick={handleCancel}>
                    Cancel
                </Button>
                <Button variant="contained"
                    disabled={testLoading || !selectedFile}
                    startIcon={<UploadFile />}
                    onClick={uploadFile} autoFocus>
                    Upload
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default FileUploadDialog