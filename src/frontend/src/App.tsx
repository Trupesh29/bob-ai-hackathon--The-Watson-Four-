import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Shell } from './components/Shell'
import DashboardPage from './pages/DashboardPage'
import VesselsPage from './pages/VesselsPage'
import MapPage from './pages/MapPage'
import PredictionsPage from './pages/PredictionsPage'
import OptimizerPage from './pages/OptimizerPage'
import OperationsPlanPage from './pages/OperationsPlanPage'
import CopilotPage from './pages/CopilotPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/vessels" element={<VesselsPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/predictions" element={<PredictionsPage />} />
          <Route path="/optimizer" element={<OptimizerPage />} />
          <Route path="/operations-plan" element={<OperationsPlanPage />} />
          <Route path="/copilot" element={<CopilotPage />} />
          {/* Catch-all: redirect unknown routes to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
