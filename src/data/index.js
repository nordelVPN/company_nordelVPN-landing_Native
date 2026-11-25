module.exports = {
  lang: 'en', title: 'Nordel — Your freedom starts here.',
  description: 'A simpler way to connect. Nordel brings a little more privacy to your everyday online moments.',
  canonical: '', landing: true,
  hero: { eyebrow: 'A little more peace of mind', title: 'Your freedom', accent: 'starts here.', description: 'A simpler way to connect. Nordel brings a little more privacy to your everyday online moments.', button: 'Explore Nordel', note: 'Designed for the way you move through the world.', caption: 'A clearer view, wherever you are　 /　 01' },
  features: [
    { icon: '◇', title: 'Privacy, made simple', description: 'A calmer way to think about your connection.' },
    { icon: '↗', title: 'Ready when you are', description: 'Designed to fit naturally into your day.' },
    { icon: '○', title: 'Clarity at a glance', description: 'Know your connection status in a moment.' }
  ],
  app: { eyebrow: 'Meet the Nordel app', title: 'A quieter way', titleEnd: 'to connect.', description: 'A thoughtful, uncomplicated experience. Open the app, choose your location and connect in a tap.',
    steps: ['Open Nordel on your device', 'Choose your preferred location', 'Connect and get on with your day'],
    hint: 'INTERACTIVE PREVIEW　 ·　 Tap the button to try it', caption: 'CONCEPT PREVIEW / 01',
    status: 'Not connected', connectedStatus: 'Connected (preview)', heading: 'Ready when you are', connectedHeading: 'You’re connected', note: 'Your connection is currently off.', connectedNote: 'Demo only — your network connection has not changed.', connect: 'Connect', disconnect: 'Disconnect', locationLabel: 'Selected location', location: 'Fastest location',
    tabs: ['Home', 'Locations', 'Account'], demoNotice: 'This is a concept preview. Locations and accounts are not available yet.' },
  pricing: {
    eyebrow: 'Your freedom starts here',
    title: 'Find the plan that fits.',
    description: 'Choose how you want to connect with Nordel.',
    button: 'Choose plan',
    note: 'All prices are shown in EUR (€) for the full plan period. Plan selection opens the wishlist or checkout.',
    plans: [
      {
        planId: 'trial',
        name: 'Trial',
        description: 'Try all features.',
        price: '0.50',
        period: '/ 5 days',
        features: ['10 devices', 'All features']
      },
      {
        planId: 'basic',
        name: 'Basic',
        description: 'For a monthly connection.',
        price: '7',
        period: '/ 1 month',
        features: ['5 devices', '3 servers']
      },
      {
        planId: 'plus',
        name: 'Plus',
        description: 'Connect for six months.',
        price: '25',
        period: '/ 6 months',
        features: ['5 devices', 'All servers', 'Browser extension']
      },
      {
        planId: 'complete',
        name: 'Complete',
        description: 'A full year of Nordel.',
        price: '55',
        period: '/ 12 months',
        features: ['10 devices', 'All servers', 'Advanced features', 'Ad blocker', 'Password manager', 'Data cloud']
      }
    ]
  },
  wishlist: { title: 'Nordel wishlist', description: 'Our Telegram wishlist is not available yet. Please check back soon.', telegramUrl: '', buttonText: 'Open Telegram', close: 'Close' }
};
