import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { useAuthStore } from './store/useAuthStore';
import { useSocket } from './hooks/useSocket';
import LandingPage from './pages/LandingPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import EndScreen from './pages/EndScreen';
import ProfilePage from './pages/ProfilePage';
import { ToastContainer } from './components/ui/Toast';

function AppInner() {
  useSocket();
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/lobby/:roomCode" element={<LobbyPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/end" element={<EndScreen />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
      <ToastContainer />
    </>
  );
}

export default function App() {
  const { setUser, setLoading } = useAuthStore();

  // Keep-alive ping to prevent Render free tier sleep
  useEffect(() => {
    const id = setInterval(() => {
      fetch('https://fish-d9st.onrender.com/health').catch(() => {});
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Persist Firebase auth across page refreshes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, [setUser, setLoading]);

  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
