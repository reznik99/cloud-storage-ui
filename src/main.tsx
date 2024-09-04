import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { SnackbarProvider } from 'notistack'

import Dashboard from './pages/dashboard.tsx'
import Nav from './components/nav.tsx'
import Login from './pages/login.tsx'
import Signup from './pages/signup.tsx'
import './index.css'

const router = createBrowserRouter([
  {
    path: "/",
    element: <>
      <Nav />
      <Login />
    </>,
  }, {
    path: "/login",
    element: <>
      <Nav />
      <Login />
    </>,
  }, {
    path: "/signup",
    element: <>
      <Nav />
      <Signup />
    </>,
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
    <SnackbarProvider maxSnack={5} autoHideDuration={4000}>
      <RouterProvider router={router} />
    </SnackbarProvider>
  </StrictMode>,
)
