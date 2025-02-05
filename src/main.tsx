import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { SnackbarProvider } from 'notistack'
import { Provider } from 'react-redux'

import './index.css'
import store from './store/store.ts'
import PrivateRoute from './private_route.tsx'
// Pages
import Dashboard from './pages/dashboard.tsx'
import Login from './pages/login.tsx'
import Signup from './pages/signup.tsx'
import LinkShare from './pages/share.tsx'
import Settings from './pages/settings.tsx'
import ResetPassword from './pages/reset_password.tsx'
import Nav from './components/nav.tsx'
import P2PFileSharingWrapper from './pages/p2p_file_sharing.tsx'

const theme = createTheme({
  colorSchemes: {
    dark: true,
    light: true,
  },
  palette: {
    mode: 'light',
    background: {
      default: '#DEDEDE',
    },
  }
});

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  }, {
    path: "/signup",
    element: <Signup />,
  }, {
    path: "/reset-password",
    element: <ResetPassword />,
  }, {
    path: "/share/:access_key",
    element: <LinkShare />,
  }, {
    path: "/p2p-file-share",
    element: <P2PFileSharingWrapper />,
  }, {
    path: "/settings",
    element: <PrivateRoute><Nav /><Settings /></PrivateRoute>,
  }, {
    path: "/dashboard",
    element: <PrivateRoute><Nav /><Dashboard /></PrivateRoute>,
  }, {
    path: "/",
    element: <PrivateRoute><Nav /><Dashboard /></PrivateRoute>,
  }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <SnackbarProvider maxSnack={5} autoHideDuration={3000} >
          <CssBaseline />
          <RouterProvider router={router} />
        </SnackbarProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
)
