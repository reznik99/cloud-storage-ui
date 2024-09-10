import { useCallback, useEffect, useState } from 'react'
import { Box } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import FilesView from '../components/files_view'
import Sidebar from '../components/sidebar'
import api from '../networking/endpoints'


function Dashboard() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [files, setFiles] = useState([])

    useEffect(() => {
        loadFileList()
    }, [])

    const loadFileList = useCallback(async () => {
        try {
            setLoading(true)
            const resp = await api.getFiles()
            setFiles(resp.data.files)
        } catch (err: any) {
            console.error(err.message)
            if (err.response?.status === 401) navigate("/login")
        } finally {
            setLoading(false)
        }
    }, [])

    return (
        <Box sx={{
            display: 'flex',
            flexGrow: 1,
            overflowY: 'scroll',
        }}>

            {/* File explorer */}
            <FilesView files={files || []} loadFileList={loadFileList}
                loading={loading} />

            {/* Side menu */}
            <Sidebar files={files || []} loadFileList={loadFileList} />

        </Box>
    )
}

export default Dashboard
