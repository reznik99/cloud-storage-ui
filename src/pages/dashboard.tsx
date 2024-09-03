import { useCallback, useEffect, useState } from 'react'
import { Alert, Box, Snackbar } from '@mui/material'
import FilesView from '../components/files'
import Sidebar from '../components/sidebar'
import api from '../networking/endpoints'
import { Feedback } from '../utilities/utils'

function Dashboard() {
  const [alertInfo, setAlertInfo] = useState<Feedback | null>(null)
  const [files, setFiles] = useState([])

  useEffect(() => {
    loadFileList()
  }, [])

  const loadFileList = useCallback(() => {
    api.getFiles()
      .then(response => setFiles(response.data.files))
      .catch(err => console.error(err.message))
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
      <FilesView files={files || []}
        setAlertInfo={setAlertInfo}
        loadFileList={loadFileList} />

      {/* Side menu */}
      <Sidebar files={files || []}
        setAlertInfo={setAlertInfo}
        loadFileList={loadFileList} />

      {/* Feedback */}
      <Snackbar open={Boolean(alertInfo)}
        autoHideDuration={4000}
        onClose={() => setAlertInfo(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {alertInfo
          ? <Alert onClose={() => setAlertInfo(null)}
            severity={alertInfo.severity || 'error'}
            variant="filled"
            sx={{ width: '100%' }}>
            {alertInfo?.message}
          </Alert>
          : undefined
        }
      </Snackbar>
    </Box>
  )
}

export default Dashboard
