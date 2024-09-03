import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router-dom"

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
    <RouterProvider router={router} />
  </StrictMode>,
)
