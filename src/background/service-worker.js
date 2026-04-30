const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
const STORAGE_KEY = 'linkedguard_config';

const BUILTIN_LISTS = [
  {
    id: 'recruitment-spam',
    name: 'Recruitment Spam',
    enabled: true,
    builtin: true,
    action: 'inherit',
    keywords: [
      'exciting opportunity',
      'perfect candidate',
      'i came across your profile',
      'came across your profile',
      'we are hiring',
      'competitive salary',
      'dream job',
      'reach your full potential',
      'great fit for your profile',
      'quick question for you',
      'your background caught my attention',
      'open to new opportunities',
      'ideal candidate',
      'urgent hiring',
      'attractive package',
      'remote position',
      'looking for talent like you',
    ],
  },
  {
    id: 'crypto-scam',
    name: 'Crypto & Financial Scams',
    enabled: true,
    builtin: true,
    action: 'inherit',
    keywords: [
      'guaranteed returns',
      'passive income',
      'financial freedom',
      'crypto investment',
      'binary options',
      'forex signals',
      'double your investment',
      'risk-free profit',
      'invest with us',
      'trading signals',
      'bitcoin opportunity',
      'web3 opportunity',
      'nft drop',
      'staking rewards',
      'defi protocol',
      'high-yield investment',
      'limited spots remaining',
    ],
  },
  {
    id: 'mlm-spam',
    name: 'MLM / Network Marketing',
    enabled: true,
    builtin: true,
    action: 'inherit',
    keywords: [
      'downline',
      'upline',
      'network marketing',
      'be your own boss',
      'work from home opportunity',
      'join my team',
      'residual income',
      'unlimited earning potential',
      'multilevel',
      'direct sales opportunity',
      'side hustle',
      'extra income from home',
      'change your life',
      'financial independence',
      'six figures',
    ],
  },
  {
    id: 'generic-spam',
    name: 'Generic Spam',
    enabled: false,
    builtin: true,
    action: 'inherit',
    keywords: [
      'congratulations you have been selected',
      'claim your prize',
      'limited time offer',
      'act now',
      'click the link below',
      'verify your account',
      'your account has been compromised',
      'you have won',
      'urgent action required',
      'final notice',
    ],
  },
  {
    id: 'ai-prospection',
    name: 'AI & Prospection Pitches',
    enabled: true,
    builtin: true,
    action: 'inherit',
    keywords: [
      'artificial intelligence',
      'machine learning solution',
      'automate your workflow',
      'ai-powered',
      'leverage ai',
      'innovative solution',
      'boost your roi',
      'demo gratuite',
      'free demo',
      'revolutionize your',
      'transform your business',
      'optimize your processes',
      'streamline your operations',
      'cold outreach',
      'lead generation',
      'sales pipeline',
      'prospection automatisee',
    ],
  },
  {
    id: 'agency-pitch',
    name: 'Marketing Agency Pitches',
    enabled: true,
    builtin: true,
    action: 'inherit',
    keywords: [
      'grow your business',
      'scale your business',
      '10x your',
      'double your revenue',
      'guaranteed results',
      'qualified leads',
      'we generate leads',
      'marketing agency',
      'paid ads',
      'google ads expert',
      'facebook ads expert',
      'meta ads',
      'social media management',
      'we help companies like yours',
      'happy to share case studies',
      'free strategy call',
      'free audit',
    ],
  },
  {
    id: 'seo-spam',
    name: 'SEO & Backlinks',
    enabled: true,
    builtin: true,
    action: 'inherit',
    keywords: [
      'rank on google',
      'first page of google',
      'backlinks',
      'high da backlinks',
      'guest post',
      'link building',
      'seo services',
      'increase your traffic',
      'on-page seo',
      'off-page seo',
      'domain authority',
      'organic traffic',
    ],
  },
  {
    id: 'coaching-pitch',
    name: 'Coaching & Mentorship Pitches',
    enabled: true,
    builtin: true,
    action: 'inherit',
    keywords: [
      'transform your life',
      'unlock your potential',
      'next level',
      'mindset coach',
      'business coach',
      'life coach',
      'personal development',
      'mentorship program',
      'mastermind group',
      'apply for our program',
      'limited seats',
      'change your mindset',
      'level up your',
    ],
  },
  {
    id: 'course-sales',
    name: 'Course & Training Sales',
    enabled: true,
    builtin: true,
    action: 'inherit',
    keywords: [
      'enroll now',
      'last chance to join',
      'cohort starts',
      'masterclass',
      'free webinar',
      'exclusive training',
      'free training',
      'lifetime access',
      'limited cohort',
      'bonus included',
      'join the waitlist',
    ],
  },
  {
    id: 'outsourcing-pitch',
    name: 'Outsourcing & Offshore Dev',
    enabled: true,
    builtin: true,
    action: 'inherit',
    keywords: [
      'dedicated developers',
      'offshore team',
      'remote developers',
      'staff augmentation',
      'cost-effective solution',
      'highly skilled developers',
      'we provide developers',
      'hire dedicated',
      'nearshore',
      'rates as low as',
      'quality at affordable',
    ],
  },
  {
    id: 'saas-pitch',
    name: 'SaaS Cold Outreach',
    enabled: true,
    builtin: true,
    action: 'inherit',
    keywords: [
      'noticed you work at',
      'noticed you are the',
      'thought our tool',
      'our platform helps',
      'would love a quick chat',
      'open to a quick demo',
      'worth a 15 min call',
      '15-minute call',
      'jump on a call',
      'block 15 minutes',
      'put time on my calendar',
      'book a slot',
    ],
  },
  {
    id: 'phishing',
    name: 'Phishing & Account Threats',
    enabled: true,
    builtin: true,
    action: 'inherit',
    keywords: [
      'unusual activity detected',
      'verify your identity',
      'reset your password',
      'security alert',
      'your linkedin account',
      'suspended account',
      'click here to confirm',
      'update your billing',
      'payment failed',
      'invoice attached',
    ],
  },
  {
    id: 'romance-bot',
    name: 'Romance / Bot Greetings',
    enabled: false,
    builtin: true,
    action: 'inherit',
    keywords: [
      'how is your day going',
      'how was your day',
      'we should connect more',
      'i would love to know more about you',
      'what brings you to linkedin',
      'tell me more about yourself',
      'do you live in',
      'are you single',
    ],
  },
  {
    id: 'investment-pitch',
    name: 'Investment Opportunities',
    enabled: true,
    builtin: true,
    action: 'inherit',
    keywords: [
      'investment opportunity',
      'funding round',
      'pre-seed opportunity',
      'angel investor',
      'investment proposal',
      'high return investment',
      'minimum investment',
      'roi guaranteed',
      'wealth management',
      'portfolio diversification',
    ],
  },
];

const DEFAULT_CONFIG = {
  version: 1,
  enabled: true,
  defaultAction: 'flag', // archive coming soon — flag is the only active mode
  caseSensitive: false,
  filterLists: BUILTIN_LISTS,
  stats: {
    totalArchived: 0,
    totalFlagged: 0,
    lastAction: null,
  },
  log: [],
};

// Storage wrapper — tries sync first, falls back to local
async function storageGet(key) {
  try {
    const r = await browserAPI.storage.sync.get(key);
    return r;
  } catch (_) {
    const r = await browserAPI.storage.local.get(key);
    return r;
  }
}

async function storageSet(data) {
  try {
    await browserAPI.storage.sync.set(data);
  } catch (_) {
    await browserAPI.storage.local.set(data);
  }
}

// Init default config on first install
browserAPI.runtime.onInstalled.addListener(({ reason }) => {
  if (reason !== 'install') return;
  storageGet(STORAGE_KEY).then((result) => {
    if (!result[STORAGE_KEY]) {
      storageSet({ [STORAGE_KEY]: DEFAULT_CONFIG }).catch(console.error);
    }
  }).catch(console.error);
});

// Message handler
browserAPI.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_CONFIG') {
    storageGet(STORAGE_KEY)
      .then((r) => sendResponse(r[STORAGE_KEY] || DEFAULT_CONFIG))
      .catch(() => sendResponse(DEFAULT_CONFIG));
    return true;
  }

  if (msg.type === 'LOG_ACTION') {
    handleLogAction(msg.payload)
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
});

async function handleLogAction({ entry, action }) {
  let result;
  try {
    result = await storageGet(STORAGE_KEY);
  } catch (_) {
    return { ok: false };
  }

  const config = result[STORAGE_KEY] || DEFAULT_CONFIG;
  const log = [entry, ...(config.log || [])].slice(0, 50);
  const stats = { ...config.stats };
  stats.lastAction = new Date().toISOString();
  if (action === 'archive') stats.totalArchived = (stats.totalArchived || 0) + 1;
  if (action === 'flag') stats.totalFlagged = (stats.totalFlagged || 0) + 1;

  await storageSet({ [STORAGE_KEY]: { ...config, log, stats } });

  // Update badge (best-effort, don't crash if unavailable)
  try {
    const total = (stats.totalArchived || 0) + (stats.totalFlagged || 0);
    if (browserAPI.action && browserAPI.action.setBadgeText) {
      await browserAPI.action.setBadgeText({ text: total > 0 ? String(total) : '' });
      await browserAPI.action.setBadgeBackgroundColor({ color: '#cc1016' });
    }
  } catch (_) {}

  return { ok: true };
}
