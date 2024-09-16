import { useCallback, useRef, useState } from "react"
import { Cancel, ExpandMore, Key, UploadFile } from "@mui/icons-material"
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, FormLabel, TextField, Typography } from "@mui/material"
import { useSnackbar } from "notistack"
import { fileToFileInfo, getErrorString, Progress } from "../utilities/utils"
import { BufferEquals, DecryptFile, DeriveKeysFromPassword, EncryptFile, Hash } from "../utilities/crypto"
import api from "../networking/endpoints"
import ProgressBar from "./progress_bar"

type IProps = {
    open: boolean;
    closeDialog: () => void;
    loadFileList: () => void;
}

function FileUploadDialog(props: IProps) {
    const { enqueueSnackbar } = useSnackbar()
    const [selectedFile, setSelectedFile] = useState<File | null>()
    const [progress, setProgress] = useState<Progress | null>()
    const controller = useRef(new AbortController())
    const [encPassword, setEncPassword] = useState('')
    const [testLoading, setTestLoading] = useState(false)

    const handleFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedFile(event.target?.files?.[0])
    }, [])

    const handleCancel = useCallback(() => {
        props.closeDialog()
        setSelectedFile(null)
        controller.current.abort()
    }, [])

    const uploadFile = useCallback(async () => {
        controller.current = new AbortController()
        try {
            await api.uploadFile(selectedFile as File, setProgress, controller.current.signal)
            handleCancel()
            props.loadFileList()
            enqueueSnackbar("File uploaded successfully", { variant: "success" })
        } catch (err: any) {
            const error = getErrorString(err)
            console.error(error)
            enqueueSnackbar("Upload failed: " + error, { variant: "error" })
        } finally {
            setProgress(null)
        }
    }, [selectedFile])

    const testEncryption = useCallback(async () => {
        if (!selectedFile) return
        try {
            setTestLoading(true)
            // Derive master key from password
            const derive1 = await DeriveKeysFromPassword(encPassword, null)
            // Decrypt file with random key and wrap with master key
            const encFile = await EncryptFile(derive1.mEncKey, selectedFile)

            // Derive master key from password
            const derive2 = await DeriveKeysFromPassword(encPassword, derive1.salt)
            // Decrypt random key with master key and decrypt file
            const decFile = await DecryptFile(derive2.mEncKey, fileToFileInfo(selectedFile), await encFile.arrayBuffer())

            // Hash both original file data and decrypted file data to check they match
            const originalFileData = await selectedFile.arrayBuffer()
            const decryptedFileData = await decFile.arrayBuffer()
            const originalHash = await Hash(originalFileData, "SHA-256")
            const decryptedHash = await Hash(decryptedFileData, "SHA-256")
            const equal = BufferEquals(new Uint8Array(originalHash), new Uint8Array(decryptedHash))
            if (!equal) throw new Error("Decrypted file doesn't match original")

            enqueueSnackbar("Encryption tests succeeded", { variant: "success" })
        } catch (err: any) {
            console.error(err)
            enqueueSnackbar("Encryption tests failed: " + err, { variant: "error" })
        } finally {
            setTestLoading(false)
        }
    }, [selectedFile, encPassword])

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
                    <Button variant={Boolean(selectedFile?.name) ? "contained" : "outlined"} component="label">
                        {selectedFile?.name ?? "Select File"}
                        <input onChange={handleFile} type="file" hidden />
                    </Button>
                </Box>

                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>Advanced Options</AccordionSummary>
                    <AccordionDetails>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 2 }}>
                            <Typography variant="body2">Encrypt your file with a password to provide End to End encryption!</Typography>
                            <FormControl sx={{ width: '80%' }}>
                                <FormLabel htmlFor="password">Encryption Password</FormLabel>
                                <TextField fullWidth
                                    name="password"
                                    type="password"
                                    id="password"
                                    autoComplete="new-password"
                                    placeholder="••••••"
                                    variant="outlined"
                                    color="primary"
                                    value={encPassword}
                                    onChange={(e) => setEncPassword(e.target.value)} />
                            </FormControl>
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
                    disabled={!selectedFile}
                    startIcon={<UploadFile />}
                    onClick={uploadFile} autoFocus>
                    Upload
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default FileUploadDialog