/* =========================================================
   SwiftSite — Business Configuration
   ---------------------------------------------------------
   This is the ONLY file the studio owner needs to edit.
   Everything in the UI (services, pricing, contact, process,
   suggested questions) and everything the AI is allowed to
   say is generated from this object.

   RULE: leave a value empty ("") or null if it is not real.
   The site will render "Coming soon" / "Custom quote" and the
   assistant will honestly say the detail is not configured.
   Never fill this with invented facts.
   ========================================================= */

window.SWIFTSITE_CONFIG = {

  /* ---------- Brand ---------- */
  brandName: 'SwiftSite',
  assistantName: 'SwiftSite AI',
  brandLine: 'Web development studio',
  assistantRole: 'Digital concierge for SwiftSite visitors',
  version: '1.0',

  /* ---------- Languages ---------- */
  languages: ['English', 'Roman Urdu'],
  languageModes: [
    { id: 'auto', label: 'Auto' },
    { id: 'en', label: 'English' },
    { id: 'roman-urdu', label: 'Roman Urdu' }
  ],

  /* ---------- Working hours (empty = not configured) ---------- */
  workingHours: '',
  responseTimeNote: '',

  /* ---------- Services ---------- */
  services: [
    {
      id: 'web-development',
      icon: 'code',
      title: 'Web Development',
      summary: 'Hand-built websites — no page-builder bloat, no template shortcuts.',
      detail: 'Complete website development written by hand in HTML, CSS and JavaScript, or with a modern stack when the project needs it. Focus is on speed, clean structure and a design that matches the business.',
      tags: ['HTML', 'CSS', 'JavaScript'],
      group: 'Build'
    },
    {
      id: 'wordpress',
      icon: 'panels',
      title: 'WordPress',
      summary: 'Custom themes and a backend your team can actually edit.',
      detail: 'WordPress builds with custom or child themes, plugin setup, content structure and an admin handover so the owner can update text and images without a developer.',
      tags: ['Themes', 'Plugins', 'Handover'],
      group: 'Build'
    },
    {
      id: 'frontend',
      icon: 'frame',
      title: 'Frontend Development',
      summary: 'Interfaces that stay fast on a mid-range phone, not just on a demo laptop.',
      detail: 'Responsive, accessible frontends: layout systems, motion that has a purpose, performance work and cross-browser cleanup.',
      tags: ['Responsive', 'Motion', 'Accessibility'],
      group: 'Build'
    },
    {
      id: 'backend',
      icon: 'stack',
      title: 'Backend Development',
      summary: 'APIs, databases, authentication and admin logic behind the scenes.',
      detail: 'Server-side work: database design, REST APIs, authentication and roles, admin panels and third-party integrations.',
      tags: ['API', 'Database', 'Auth'],
      group: 'Build'
    },
    {
      id: 'ecommerce',
      icon: 'bag',
      title: 'E-commerce',
      summary: 'Catalogue, cart and checkout that people finish.',
      detail: 'Online stores: product catalogue, cart and checkout flow, payment gateway configuration where available, shipping basics and order management.',
      tags: ['Catalogue', 'Checkout', 'Payments'],
      group: 'Sell'
    },
    {
      id: 'web-apps',
      icon: 'grid',
      title: 'Custom Web Applications',
      summary: 'Dashboards, booking tools, internal systems — built to your workflow.',
      detail: 'Custom web applications such as dashboards, booking and enquiry systems, calculators, portals and internal automation tools.',
      tags: ['Dashboards', 'Portals', 'Automation'],
      group: 'Sell'
    },
    {
      id: 'ui-ux',
      icon: 'crosshair',
      title: 'UI / UX',
      summary: 'Structure and visual direction decided before a single line of code.',
      detail: 'Wireframes, user flow, visual direction, component styling and clickable prototypes before development starts.',
      tags: ['Wireframes', 'Prototype', 'Design system'],
      group: 'Design'
    },
    {
      id: 'maintenance',
      icon: 'pulse',
      title: 'Website Maintenance',
      summary: 'Updates, backups, fixes and the small changes you keep postponing.',
      detail: 'Ongoing care: updates, backups, security checks, bug fixes, small content changes and priority support for existing sites.',
      tags: ['Updates', 'Backups', 'Support'],
      group: 'Care'
    }
  ],

  /* ---------- Pricing ----------
     price: null  →  UI shows "Custom quote" and the assistant
     will refuse to invent a number. Fill in only real figures. */
  pricingCurrency: '',
  pricingNote: 'No figure on this page is invented. Where a price is not configured, it is shown as a custom quote — the assistant will tell you the same thing.',
  pricing: [
    {
      id: 'landing',
      name: 'Landing Page',
      for: 'One offer, one page, one clear action.',
      includes: ['Single-page custom build', 'Responsive layout', 'Contact / enquiry section', 'Basic on-page SEO'],
      timeline: '',
      price: null,
      note: 'Scope is confirmed in writing before work starts.'
    },
    {
      id: 'business',
      name: 'Business Website',
      for: 'A proper home for a company or practice.',
      includes: ['Custom design direction', 'Multi-page responsive build', 'Contact and enquiry handling', 'Handover notes and walkthrough'],
      timeline: '',
      price: null,
      note: 'Final scope depends on pages, content and integrations.'
    },
    {
      id: 'wordpress',
      name: 'WordPress Website',
      for: 'Content you want to edit yourself.',
      includes: ['Custom or child theme setup', 'Editable content structure', 'Plugin setup and cleanup', 'Admin handover'],
      timeline: '',
      price: null,
      note: 'Premium plugin or theme licences are quoted separately if needed.'
    },
    {
      id: 'store',
      name: 'E-commerce Store',
      for: 'Selling online, seriously.',
      includes: ['Product catalogue setup', 'Cart and checkout configuration', 'Payment gateway setup where available', 'Order and shipping basics'],
      timeline: '',
      price: null,
      note: 'Payment provider availability depends on your region and account.'
    },
    {
      id: 'application',
      name: 'Custom Web Application',
      for: 'A tool, portal or dashboard with real logic.',
      includes: ['Requirement mapping', 'Database and API design', 'Authentication and roles', 'Admin dashboard'],
      timeline: '',
      price: null,
      note: 'Quoted after requirements are discussed — scope varies widely.'
    },
    {
      id: 'care',
      name: 'Website Maintenance',
      for: 'Keeping an existing site healthy.',
      includes: ['Updates and backups', 'Small content changes', 'Bug fixes', 'Priority support'],
      timeline: '',
      price: null,
      note: 'Available for sites built by SwiftSite and, on review, for existing sites.'
    }
  ],

  /* ---------- Process (the assistant's own explanation) ---------- */
  process: [
    {
      step: '01',
      title: 'Ask',
      body: 'Write to the assistant the way you would write to a person — in English, Roman Urdu, or a mix of both. Short questions and long messy ones both work.'
    },
    {
      step: '02',
      title: 'Understand',
      body: 'SwiftSite AI reads your question against the real studio configuration: the services listed here, the pricing fields filled in by the owner, and the contact details that actually exist.'
    },
    {
      step: '03',
      title: 'Connect',
      body: 'When you are ready, the assistant points you to the project form or the studio\'s public profiles. It never claims a message was sent, a call was booked or a developer joined the chat.'
    }
  ],

  /* ---------- Contact (empty = not configured → "Coming soon") ---------- */
  contact: {
    email: '',
    phone: '',
    whatsapp: '',
    website: '',
    address: '',
    availabilityLabel: 'Coming soon'
  },

  /* ---------- Public profiles that DO exist ---------- */
  social: [
    { id: 'instagram', label: 'Instagram', handle: '@swif.site', url: 'https://www.instagram.com/swif.site' },
    { id: 'github', label: 'GitHub', handle: 'Mharryjs', url: 'https://github.com/Mharryjs' }
  ],

  /* ---------- Project form options ---------- */
  form: {
    submissionEndpoint: '',   // e.g. '/api/enquiry' or a form service URL — leave empty if none
    projectTypes: [],         // auto-filled from services when empty
    budgets: [
      'Not sure yet',
      'Under discussion',
      'Will confirm after quote'
    ]
  },

  /* ---------- Suggested questions ---------- */
  suggestions: [
    { text: 'Tell me about SwiftSite.', hint: 'Intro' },
    { text: 'What services do you offer?', hint: 'Services' },
    { text: 'Show me your pricing.', hint: 'Pricing' },
    { text: 'Website ka price kya hai?', hint: 'Roman Urdu' },
    { text: 'WordPress website kitne ki hoti hai?', hint: 'Roman Urdu' },
    { text: 'Website banwane ka process kya hai?', hint: 'Process' },
    { text: 'How can I start a project?', hint: 'Start' },
    { text: 'How can I contact SwiftSite?', hint: 'Contact' }
  ],

  /* ---------- Assistant copy ---------- */
  copy: {
    heroKicker: 'AI Assistant',
    heroTitle: ['Your questions.', 'Answered instantly.'],
    heroSub: 'Ask about services, pricing or starting your project.',
    emptyTitle: 'Not sure where to start?',
    emptySub: 'Tell me what you are building. One line is enough — I will take it from there.',
    thinking: 'Thinking',
    connectionError: 'Sorry, I could not connect to the AI right now. Please try again in a moment.',
    notConfigured: 'AI connection needs to be configured.',
    formReady: 'Your project details are ready to send.',
    formNoEndpoint: 'No submission endpoint is configured for this form yet — nothing has been sent anywhere.',

    /* offline / local knowledge mode */
    localTitle: 'Offline mode — the chat still works.',
    localBody: 'No Gemini key is attached, so answers come from SwiftSite\'s own configuration on this page. Every reply is marked. Attach a key and the same questions go to the model.',
    localTag: 'local knowledge',
    localButton: 'Attach Gemini key',
    geminiTag: 'Gemini'
  },

  /* ---------- Gemini AI layer ---------- */
  ai: {
    endpointBase: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'],
    temperature: 0.72,
    topP: 0.95,
    maxOutputTokens: 1024,
    historyLimit: 14,
    stream: true,
    requestTimeoutMs: 30000,

    /* When no key is attached, fall back to local.js — a knowledge engine
       built from this configuration. It is always labelled in the UI and
       never claims to be Gemini. Set to false to disable the fallback. */
    allowLocalFallback: true,
    localStreamMs: 14
  }
};

/* Derived: project types come straight from the service list. */
(function () {
  var cfg = window.SWIFTSITE_CONFIG;
  if (!cfg.form.projectTypes || cfg.form.projectTypes.length === 0) {
    cfg.form.projectTypes = cfg.services.map(function (s) { return s.title; });
  }
  cfg.form.projectTypes = cfg.form.projectTypes.concat(['Something else']);
})();
