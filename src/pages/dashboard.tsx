import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Grid2 from "@mui/material/Grid2"

import AuthenticateDialog from '../components/dialog_authenticate'
import FilesView from '../components/files_view'
import Sidebar from '../components/sidebar'
import api from '../networking/endpoints'
import { RootState } from '../store/store'
import { saveFiles } from '../store/reducer'
import { getErrorString } from '../utilities/utils'

function Dashboard() {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const files = useSelector((store: RootState) => store.user.files)
    const mEncKey = useSelector((store: RootState) => store.user.mEncKey)
    const hAuthKey = useSelector((store: RootState) => store.user.hAuthKey)
    const wrappedAccountKey = useSelector((store: RootState) => store.user.wrappedAccountKey)
    const allowedStorage = useSelector((store: RootState) => store.user.allowedStorage)

    const [loading, setLoading] = useState(false)
    const [authModalOpen, setAuthModalOpen] = useState(false)

    const loadFileList = useCallback(async () => {
        try {
            setLoading(true)
            const resp = await api.getFiles()
            dispatch(saveFiles({ files: resp.data.files }))
        } catch (err: unknown) {
            const message = getErrorString(err)
            console.error(message)
            if (axios.isAxiosError(err) && err.response?.status === 401) navigate("/login")
        } finally {
            setLoading(false)
        }
    }, [navigate, dispatch])

    useEffect(() => {
        // If we don't have any files in store, load from backend
        if (!files.length) {
            loadFileList()
        }
    }, [files, loadFileList])

    useEffect(() => {
        if (!authModalOpen && (mEncKey === "" || hAuthKey === "" || wrappedAccountKey === "")) {
            // We lost track of imporant keys, page cannot function, ask for password to re-initialise keys
            setAuthModalOpen(true)
        }
    }, [authModalOpen, mEncKey, hAuthKey, wrappedAccountKey])

    return (
        <Grid2 container width="100%"
            rowSpacing={2}
            sx={{
                display: 'flex',
                flexGrow: 1,
                overflowY: 'scroll',
            }}>

            {/* File explorer */}
            <Grid2 size={{ md: 10, sm: 12 }}>
                <FilesView files={files || []} loadFileList={loadFileList}
                    loading={loading} />
            </Grid2>

            {/* Side menu */}
            <Grid2 size="grow">
                <Sidebar files={files || []} loadFileList={loadFileList} allowedStorage={allowedStorage} />
            </Grid2>


            {/* Auth dialolg */}
            <AuthenticateDialog open={authModalOpen} closeDialog={() => setAuthModalOpen(false)} />
        </Grid2>
    )
}

export default Dashboard
