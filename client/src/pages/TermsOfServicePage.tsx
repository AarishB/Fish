import { useNavigate } from 'react-router-dom';

function Section({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-white border-b border-gray-700 pb-2">{title}</h2>
      <div className="text-gray-300 text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function TermsOfServicePage() {
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
          <h1 className="text-3xl font-bold font-card text-white">Terms of Service</h1>
          <p className="text-gray-400 text-sm mt-1">Last updated: June 2026 · fishcardgame.com</p>
        </div>

        <Section title="Acceptance of Terms">
          <p>
            By accessing or using Fish Card Game at <strong>fishcardgame.com</strong> you agree to be
            bound by these Terms of Service. If you do not agree to these terms, please do not use the
            service. These terms apply to all users, including guests and registered (Google) accounts.
          </p>
        </Section>

        <Section title="Description of Service">
          <p>
            Fish Card Game is a free-to-play online multiplayer card game. Players can create and join
            game rooms, play the Fish card game with friends or bots, and optionally subscribe to Fish
            Plus for premium features including exclusive card designs, Hidden Deck mode, and a gold
            profile ring.
          </p>
        </Section>

        <Section title="User Accounts">
          <p>
            You may play as a guest without an account. To access features such as game stats, a
            profile, and Plus subscription benefits you must sign in with a Google account. You are
            responsible for maintaining the security of your Google account. We are not liable for any
            loss resulting from unauthorised use of your account.
          </p>
          <p>
            You agree to provide accurate information in your profile. You may not use another person's
            identity or create accounts on behalf of others without permission.
          </p>
        </Section>

        <Section title="Acceptable Use">
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Cheat, exploit bugs, or use automated tools (bots) to gain unfair advantage</li>
            <li>Harass, abuse, or threaten other players</li>
            <li>Upload profile pictures that are offensive, illegal, or infringe third-party rights</li>
            <li>Attempt to reverse-engineer, decompile, or circumvent the game's security</li>
            <li>Use the service for any unlawful purpose</li>
          </ul>
          <p>
            We reserve the right to terminate or suspend any account that violates these terms without
            prior notice.
          </p>
        </Section>

        <Section title="Fish Plus Subscription">
          <p><strong className="text-white">Billing</strong></p>
          <p>
            Fish Plus is a paid subscription processed through Stripe. By subscribing you authorise us
            to charge your payment method on a recurring basis at the price stated at the time of
            purchase. All prices are in USD unless stated otherwise.
          </p>
          <p><strong className="text-white">Cancellation</strong></p>
          <p>
            You may cancel your Fish Plus subscription at any time. Upon cancellation your Plus benefits
            will remain active until the end of the current billing period. No charges will be made
            after cancellation.
          </p>
          <p><strong className="text-white">Refund Policy</strong></p>
          <p>
            We offer a <strong className="text-white">7-day refund</strong> on new Fish Plus
            subscriptions. If you are unsatisfied within 7 days of your first payment, contact us at{' '}
            <a href="mailto:aarishbusiness1@gmail.com" className="text-teamA hover:underline">
              aarishbusiness1@gmail.com
            </a>{' '}
            for a full refund. Renewals after the initial period are non-refundable except where
            required by applicable law.
          </p>
          <p><strong className="text-white">Feature changes</strong></p>
          <p>
            We reserve the right to modify, add, or remove Plus features at any time. We will provide
            reasonable notice of significant changes.
          </p>
        </Section>

        <Section title="Intellectual Property">
          <p>
            Fish Card Game, its branding, code, design, and all original content are the intellectual
            property of Fish Card Game. You may not reproduce, distribute, or create derivative works
            without written permission. The Fish card game rules are a traditional card game and are not
            owned by us.
          </p>
        </Section>

        <Section title="User-Generated Content">
          <p>
            By uploading a profile picture or choosing a display name you grant us a non-exclusive,
            royalty-free licence to display that content within the service. You retain ownership of
            your content. You are responsible for ensuring your content does not violate any laws or
            third-party rights.
          </p>
        </Section>

        <Section title="Third-Party Services">
          <p>
            Our service relies on Google Firebase (authentication, database, storage) and Stripe
            (payments). Your use of these services is also subject to their respective terms of service
            and privacy policies. We are not responsible for the practices of these third parties.
          </p>
        </Section>

        <Section title="Disclaimers and Limitation of Liability">
          <p>
            Fish Card Game is provided <strong className="text-white">"as is"</strong> without warranties
            of any kind. We do not guarantee uninterrupted or error-free operation. To the fullest extent
            permitted by law, we are not liable for any indirect, incidental, special, or consequential
            damages arising from your use of the service, including loss of game data or progress.
          </p>
          <p>
            Our total liability to you for any claim arising from these terms or your use of the service
            shall not exceed the amount you paid us in the 12 months preceding the claim.
          </p>
        </Section>

        <Section title="Governing Law">
          <p>
            These terms are governed by the laws of the jurisdiction in which Fish Card Game operates.
            Any disputes shall be resolved through good-faith negotiation. If unresolved, disputes shall
            be submitted to the courts of that jurisdiction.
          </p>
        </Section>

        <Section title="Changes to These Terms">
          <p>
            We may update these Terms of Service at any time. We will update the "Last updated" date at
            the top of this page. Continued use of Fish Card Game after changes constitutes acceptance
            of the updated terms.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms? Contact us at:{' '}
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
