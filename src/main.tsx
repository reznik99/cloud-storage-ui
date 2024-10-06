import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { SnackbarProvider } from 'notistack'
import { Provider } from 'react-redux'

import './index.css'
import store from './store/store.ts'
import Dashboard from './pages/dashboard.tsx'
import Nav from './components/nav.tsx'
import Login from './pages/login.tsx'
import Signup from './pages/signup.tsx'
import LinkShare from './pages/share.tsx'
import Settings from './pages/settings.tsx'
import PrivateRoute from './private_route.tsx'

const theme = createTheme({
  colorSchemes: {
    dark: true,
    light: true,
  },
});

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  }, {
    path: "/signup",
    element: <Signup />,
  }, {
    path: "/share/:access_key",
    element: <LinkShare />,
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
        <SnackbarProvider maxSnack={5} autoHideDuration={4000} >
          <CssBaseline />
          <RouterProvider router={router} />
        </SnackbarProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
)
