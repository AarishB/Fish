import { useNavigate } from 'react-router-dom';

function Section({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-white border-b border-gray-700 pb-2">{title}</h2>
      <div className="text-gray-300 text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-feltDark text-white">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">

        <div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white text-sm transition-colors mb-6 block"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold font-card text-white">Privacy Policy</h1>
          <p className="text-gray-400 text-sm mt-1">Last updated: June 2026 · fishcardgame.com</p>
        </div>

        <Section title="Overview">
          <p>
            Fish Card Game ("we", "us", "our") operates <strong>fishcardgame.com</strong>. This Privacy
            Policy explains how we collect, use, and protect your personal information when you use our
            service. By using Fish Card Game you agree to the practices described here.
          </p>
        </Section>

        <Section title="Information We Collect">
          <p><strong className="text-white">Account information via Google Sign-In</strong></p>
          <p>
            When you sign in with Google we receive your Google display name, email address, and profile
            picture URL. We store these in your Fish Card Game profile on Firebase Firestore.
          </p>
          <p><strong className="text-white">Profile information you provide</strong></p>
          <p>
            You may optionally add an age, country, and a custom profile picture. Custom profile pictures
            are uploaded to Firebase Storage.
          </p>
          <p><strong className="text-white">Game statistics</strong></p>
          <p>
            We record games played, wins, losses, games ended early, and your Plus subscription status.
            This data is stored in Firestore under your user ID.
          </p>
          <p><strong className="text-white">Payment information</strong></p>
          <p>
            Payments for Fish Plus subscriptions are processed by Stripe. We never store your card number
            or sensitive payment details — only a Stripe customer ID.
          </p>
          <p><strong className="text-white">Usage data</strong></p>
          <p>
            We do not run analytics or tracking software beyond what Firebase provides inherently for
            authentication and database operations.
          </p>
        </Section>

        <Section title="How We Use Your Information">
          <ul className="list-disc list-inside space-y-1 text-gray-300">
            <li>To identify you across game sessions and display your name in multiplayer games</li>
            <li>To show your profile picture and stats on your profile page</li>
            <li>To track game statistics and calculate your belt rank</li>
            <li>To process Plus subscription payments via Stripe</li>
            <li>To enforce feature access (e.g. Plus-only card designs and game modes)</li>
          </ul>
          <p>We do not sell your personal data to third parties.</p>
        </Section>

        <Section title="Third-Party Services">
          <p><strong className="text-white">Google (Firebase Auth)</strong></p>
          <p>
            Authentication is handled by Google Firebase Authentication. By signing in with Google you
            are also subject to{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer"
              className="text-teamA hover:underline">
              Google's Privacy Policy
            </a>.
          </p>
          <p><strong className="text-white">Firebase (Firestore &amp; Storage)</strong></p>
          <p>
            User profiles, game stats, and profile pictures are stored using Google Firebase services.
            Data is stored in Google Cloud infrastructure. See{' '}
            <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noreferrer"
              className="text-teamA hover:underline">
              Firebase Privacy
            </a>.
          </p>
          <p><strong className="text-white">Stripe</strong></p>
          <p>
            Plus subscription payments are processed by Stripe, Inc. Stripe may collect payment card
            data and billing information directly. See{' '}
            <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer"
              className="text-teamA hover:underline">
              Stripe's Privacy Policy
            </a>.
          </p>
        </Section>

        <Section title="Data Storage and Security">
          <p>
            Your data is stored in Google Firebase (US regions by default). We use Firebase security
            rules to ensure users can only read and write their own data. Connections are encrypted via
            HTTPS/TLS. We retain your account data for as long as your account exists.
          </p>
        </Section>

        <Section title="Your Rights">
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-white">Access:</strong> You can view your stored profile and stats on your profile page at any time.</li>
            <li><strong className="text-white">Correction:</strong> You can update your display name, age, country, and profile picture directly in the app.</li>
            <li><strong className="text-white">Deletion:</strong> To delete your account and all associated data, email us at the address below. We will process requests within 30 days.</li>
            <li><strong className="text-white">Portability:</strong> Request a copy of your data by contacting us.</li>
          </ul>
          <p>
            If you are in the European Economic Area (EEA) you have additional rights under GDPR. Contact
            us to exercise these rights.
          </p>
        </Section>

        <Section title="Cookies and Local Storage">
          <p>
            We use <strong className="text-white">localStorage</strong> to remember your selected card
            back design between sessions. Firebase Auth uses browser storage to persist your login
            session. We do not use advertising cookies or third-party tracking cookies.
          </p>
        </Section>

        <Section title="Children's Privacy">
          <p>
            Fish Card Game is not directed at children under 13. We do not knowingly collect personal
            information from children under 13. If you believe a child has provided us with personal
            information please contact us and we will delete it promptly.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will update the "Last updated" date
            at the top of this page. Continued use of Fish Card Game after changes constitutes acceptance
            of the updated policy.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For privacy questions, data deletion requests, or any concerns please contact us at:{' '}
            <a href="mailto:aarishbusiness1@gmail.com" className="text-teamA hover:underline">
              aarishbusiness1@gmail.com
            </a>
          </p>
        </Section>

        <div className="border-t border-gray-800 pt-6 text-xs text-gray-500 text-center">
          © 2026 Fish Card Game · fishcardgame.com
        </div>
      </div>
    </div>
  );
}
