import { StrictMode, useEffect, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import './index.css'

// Ensure theme initialization runs immediately on entry bundle execution
import '@/stores/theme.store'

import { useAuthStore } from '@/stores/auth.store'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoadingScreen } from '@/components/LoadingScreen'

const LandingPage = lazy(() => import('@/pages/LandingPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const RoomPage = lazy(() => import('@/pages/RoomPage'))
const ExtensionPage = lazy(() => import('@/pages/ExtensionPage'))

function PageFallback() {
  return <LoadingScreen />
}

function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/extension" element={<ExtensionPage />} />

          {/* Protected Workspace Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/rooms" element={<Navigate to="/dashboard" replace />} />
            <Route path="/rooms/:roomId" element={<RoomPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
