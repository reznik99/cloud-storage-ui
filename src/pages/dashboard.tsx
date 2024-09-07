import { useCallback, useEffect, useState } from 'react'
import { Box } from '@mui/material'
import FilesView from '../components/files'
import Sidebar from '../components/sidebar'
import api from '../networking/endpoints'

function Dashboard() {
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
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <Box sx={{
      textAlign: 'center',
      display: 'flex',
      flexGrow: 1,
      overflowY: 'scroll',
      paddingX: 2,
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
