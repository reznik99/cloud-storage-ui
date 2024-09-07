import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { SnackbarProvider } from 'notistack'

import Dashboard from './pages/dashboard.tsx'
import Nav from './components/nav.tsx'
import Login from './pages/login.tsx'
import Signup from './pages/signup.tsx'
import './index.css'

const theme = createTheme({
  colorSchemes: {
    dark: true,
    light: true,
  },
});

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  }, {
    path: "/login",
    element: <Login />,
  }, {
    path: "/signup",
    element: <Signup />,
  }, {
    path: "/dashboard",
    element: <>
      <Nav />
      <Dashboard />
    </>,
  }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <SnackbarProvider maxSnack={5} autoHideDuration={4000} >
        <CssBaseline />
        <RouterProvider router={router} />
      </SnackbarProvider>
    </ThemeProvider>
  </StrictMode>,
)
