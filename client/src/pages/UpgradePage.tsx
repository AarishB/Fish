import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { usePlusStatus } from '../hooks/usePlusStatus';

const FEATURES = [
  { icon: '🎨', title: 'Premium Card Designs', desc: 'Midnight, Gold & Obsidian card backs unlocked' },
  { icon: '👻', title: 'Hidden Deck Mode', desc: 'Cards dealt to a ghost hand — maximum deduction' },
  { icon: '✦', title: 'Gold Profile Ring', desc: 'Animated gold ring around your avatar everywhere it appears' },
  { icon: '🥋', title: 'Belt Progression', desc: 'Track your rank from White to Black belt across all games' },
  { icon: '📊', title: 'Full Stats', desc: 'Win/loss ratio, games played, games ended early, and more' },
  { icon: '👁', title: 'More Reveals', desc: '5 reveals per game in Normal mode (free players get 3) + buy extra mid-game' },
];

export default function UpgradePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isPlus = usePlusStatus();

  return (
    <div className="min-h-screen bg-feltDark flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(user ? '/profile' : '/')}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
        </div>

        {/* Hero */}
        <div className="text-center space-y-2">
          <div className="text-4xl">✦</div>
          <h1 className="text-3xl font-bold font-card text-white">Fish Plus</h1>
          <p className="text-gray-400">Unlock the full Fish Card Game experience</p>
        </div>

        {/* Already Plus */}
        {isPlus && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-5 text-center">
            <div className="text-2xl mb-1">✦</div>
            <div className="text-amber-300 font-bold">You're already on Fish Plus!</div>
            <p className="text-gray-400 text-sm mt-1">All features are unlocked for your account.</p>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="mt-3 text-sm text-amber-400 hover:text-amber-300 transition-colors underline"
            >
              Back to profile
            </button>
          </div>
        )}

        {/* Features */}
        <div className="bg-gray-900/90 border border-gray-700 rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">What you get</h2>
          <div className="space-y-3">
            {FEATURES.map(f => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="text-xl w-7 flex-shrink-0">{f.icon}</div>
                <div>
                  <div className="text-white font-semibold text-sm">{f.title}</div>
                  <div className="text-gray-400 text-xs">{f.desc}</div>
                </div>
                <div className="ml-auto text-green-400 text-sm flex-shrink-0">✓</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing + payment */}
        {!isPlus && (
          <div className="bg-gray-900/90 border border-amber-500/30 rounded-3xl p-6 space-y-5">

            {/* Price */}
            <div className="text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-gray-400 text-lg">$</span>
                <span className="text-5xl font-black text-white">4</span>
                <span className="text-3xl font-black text-white">.99</span>
                <span className="text-gray-400 ml-1">/ month</span>
              </div>
              <p className="text-gray-500 text-xs mt-1">Cancel any time · 7-day refund guarantee</p>
            </div>

            <div className="border-t border-gray-800" />

            {/* Email */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={user?.email ?? ''}
                readOnly
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3
                  text-white text-sm opacity-60 cursor-not-allowed"
              />
            </div>

            {/* Card placeholder */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">
                Card details
              </label>
              <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                text-gray-500 text-sm flex items-center gap-2 cursor-not-allowed opacity-60">
                <span>💳</span>
                <span>Card number</span>
                <span className="ml-auto text-xs">MM / YY · CVC</span>
              </div>
            </div>

            {/* Disabled payment button */}
            <div className="space-y-2">
              <button
                type="button"
                disabled
                className="w-full py-4 rounded-2xl font-bold text-base
                  bg-gray-700 text-gray-500 cursor-not-allowed opacity-60
                  border border-gray-600"
              >
                Subscribe for $4.99 / month
              </button>
              <p className="text-center text-xs text-amber-500/70">
                🔒 Payments not yet active — launching soon
              </p>
            </div>

            <p className="text-xs text-gray-600 text-center leading-relaxed">
              By subscribing you agree to our{' '}
              <button
                type="button"
                onClick={() => navigate('/terms-of-service')}
                className="underline hover:text-gray-400 transition-colors"
              >
                Terms of Service
              </button>
              {' '}and{' '}
              <button
                type="button"
                onClick={() => navigate('/privacy-policy')}
                className="underline hover:text-gray-400 transition-colors"
              >
                Privacy Policy
              </button>
              . Powered by Stripe. We never store your card details.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
