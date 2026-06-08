// Stripe integration — wire in Stripe Checkout/Billing Portal when configured.
// The server endpoint POST /api/create-checkout-session returns a Stripe Checkout URL.

export async function upgradeToPlusButton(): Promise<void> {
  window.location.href = '/upgrade';
}

// Called by the upgrade page once Stripe is live.
// Returns the Stripe Checkout redirect URL from the server.
export async function createCheckoutSession(email: string): Promise<string> {
  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error('Checkout session failed');
  const data = await res.json() as { url: string };
  return data.url;
}
