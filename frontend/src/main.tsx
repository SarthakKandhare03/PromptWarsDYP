import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import './index.css'
import { AppStateProvider } from './state/AppState'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'

const ExplorePage = lazy(() => import('./pages/ExplorePage').then((m) => ({ default: m.ExplorePage })))
const SafetyPage = lazy(() => import('./pages/SafetyPage').then((m) => ({ default: m.SafetyPage })))
const ReportPage = lazy(() => import('./pages/ReportPage').then((m) => ({ default: m.ReportPage })))
const ComparePage = lazy(() => import('./pages/ComparePage').then((m) => ({ default: m.ComparePage })))
const page = (el: React.ReactNode) => <Suspense fallback={<div className="container"><div className="skeleton" style={{ height: 480, marginTop: 48 }} /></div>}>{el}</Suspense>

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/explore', element: page(<ExplorePage />) },
      { path: '/safety', element: page(<SafetyPage />) },
      { path: '/report', element: page(<ReportPage />) },
      { path: '/compare', element: page(<ComparePage />) },
      { path: '*', element: <HomePage /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <AppStateProvider>
        <RouterProvider router={router} />
      </AppStateProvider>
    </MotionConfig>
  </StrictMode>,
)
