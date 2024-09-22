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
    path: "/settings",
    element: <>
      <Nav />
      <Settings />
    </>,
  }, {
    path: "/dashboard",
    element: <>
      <Nav />
      <Dashboard />
    </>,
  }, {
    path: "/share/:access_key",
    element: <LinkShare />,
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
