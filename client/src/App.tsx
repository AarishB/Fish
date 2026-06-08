import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useAuthStore } from './store/useAuthStore';
import { useSocket } from './hooks/useSocket';
import LandingPage from './pages/LandingPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import EndScreen from './pages/EndScreen';
import ProfilePage from './pages/ProfilePage';
import UpgradePage from './pages/UpgradePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
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
        <Route path="/upgrade" element={<UpgradePage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-of-service" element={<TermsOfServicePage />} />
      </Routes>
      <ToastContainer />
    </>
  );
}

export default function App() {
  const { setUser, setIsPlus, setLoading } = useAuthStore();

  useEffect(() => {
    const id = setInterval(() => {
      fetch('https://fish-d9st.onrender.com/health').catch(() => {});
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        setIsPlus(snap.data()?.isPlus ?? false);
      } else {
        setIsPlus(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [setUser, setIsPlus, setLoading]);

  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
