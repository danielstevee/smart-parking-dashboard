
import Navbar from './layouts/Header'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <div className="min-h-screen bg-[#F4774F]">
      <Navbar />
      <main>
        <Dashboard />
      </main>
    </div>
  )
}

export default App
