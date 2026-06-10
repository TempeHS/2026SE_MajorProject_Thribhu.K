import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Signup from './pages/Signup'
import Papers from './pages/Papers'
import PaperEditor from './pages/PaperEditor'
import Search from './pages/Search'
import { AuthProvider } from './api/auth'
import { CartProvider } from './hooks/use-cart'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <CartProvider>
      <TooltipProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path='/signup' element={<Signup />} />
        <Route path="/papers" element={<Papers />} />
        <Route path="/search" element={<Search />} />
        <Route path="/papers/:paperId" element={<PaperEditor />} />
      </Routes>
      <Toaster />
      </TooltipProvider>
      </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
