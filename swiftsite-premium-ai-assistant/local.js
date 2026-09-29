/* =========================================================
   local.js — SwiftSite offline knowledge engine
   ---------------------------------------------------------
   Used ONLY when no Gemini key is attached. It answers from
   config.js (the studio's real data) and never pretends to be
   a language model. Every reply is tagged `engine: 'local'`
   so the UI can label it honestly.

   Rules it follows, same as the Gemini instruction:
   - never invent a price, timeline, client, review or contact
   - mirror the visitor's language (English / Roman Urdu / mixed)
   - vary its openings, stay concise
   ========================================================= */

(function (global) {
  'use strict';

  var CFG = global.SWIFTSITE_CONFIG || {};
  var rotation = 0;

  /* ---------- language detection ---------- */
  var ROMAN = ['kya','kia','hai','hain','hy','hn','ka','ki','ke','kiya','aap','ap','tum','mera','meri','hum','ham','kitna','kitne','kitni','kaisa','kaise','kaisi','kab','kahan','kyun','kyu','agar','toh','phir','aur','lekin','magar','bhi','kuch','zyada','ziada','acha','achha','accha','theek','thek','batao','bata','bataiye','sakte','sakti','sakta','chahte','chahiye','chahye','banate','banana','banwana','banwa','qimat','qeemat','kharcha','paisa','paise','rupay','rupee','waqt','din','hafte','mahina','kaam','shuru','suru','madad','shukriya','shukria','ji','haan','han','nahi','nahin','nhi','log','aapka','hamara','wala','wali','dena','denge','karna','karte','hoti','hota','hote','liye','lay','sirf','bilkul','zaroor','zarur','pehle','baad','saath','mein','me','se'];
  var URDU_SCRIPT = /[\u0600-\u06FF]/;

  function detectLanguage(text) {
    var t = String(text || '');
    if (URDU_SCRIPT.test(t)) return 'roman-urdu';
    var words = t.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
    if (!words.length) return 'en';
    var hits = 0;
    for (var i = 0; i < words.length; i++) if (ROMAN.indexOf(words[i]) > -1) hits++;
    if (hits >= 2 || hits / words.length >= 0.16) return 'roman-urdu';
    return 'en';
  }

  /* ---------- helpers ---------- */
  function norm(t) {
    return String(t || '').toLowerCase().replace(/[^\w\s+.#/-]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function has(t, words) {
    for (var i = 0; i < words.length; i++) if (t.indexOf(words[i]) > -1) return true;
    return false;
  }
  function pick(arr, extra) {
    if (!arr || !arr.length) return '';
    rotation += 1;
    return arr[(rotation + (extra || 0)) % arr.length];
  }
  function hash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }
  function services() { return CFG.services || []; }
  function pricing() { return CFG.pricing || []; }
  function social(id) {
    return (CFG.social || []).filter(function (s) { return s.id === id; })[0] || null;
  }
  function socialLine() {
    var parts = (CFG.social || []).map(function (s) { return s.label + ' ' + s.handle + ' (' + s.url + ')'; });
    return parts.length ? parts.join(' aur ') : '';
  }
  function findService(q) {
    var map = [
      { k: ['wordpress', 'wp ', 'theme', 'plugin'], id: 'wordpress' },
      { k: ['ecommerce', 'e-commerce', 'store', 'shop', 'cart', 'checkout', 'product', 'woocommerce', 'dukan'], id: 'ecommerce' },
      { k: ['frontend', 'front end', 'front-end', 'responsive', 'css', 'html'], id: 'frontend' },
      { k: ['backend', 'back end', 'back-end', 'api', 'database', 'server', 'auth'], id: 'backend' },
      { k: ['app', 'application', 'dashboard', 'portal', 'software', 'tool', 'automation'], id: 'web-apps' },
      { k: ['ui', 'ux', 'design', 'figma', 'wireframe', 'prototype', 'look'], id: 'ui-ux' },
      { k: ['maintenance', 'maintain', 'update', 'backup', 'support', 'fix', 'care', 'khayal'], id: 'maintenance' },
      { k: ['landing', 'one page', 'single page', 'campaign'], id: 'landing' }
    ];
    for (var i = 0; i < map.length; i++) {
      if (has(q, map[i].k)) {
        var found = services().filter(function (s) { return s.id === map[i].id; })[0];
        if (found) return found;
        if (map[i].id === 'landing') {
          var lp = pricing().filter(function (p) { return p.id === 'landing'; })[0];
          if (lp) {
            return {
              title: lp.name,
              summary: lp.for || '',
              detail: (lp.for || '') + ' It covers ' + (lp.includes || []).join(', ') + '.' +
                (priceOf(lp) ? ' Configured price: ' + priceOf(lp) + '.' : ' It is quoted per project — no fixed rate is configured.')
            };
          }
        }
      }
    }
    return null;
  }
  function findPackage(q) {
    var rules = [
      { k: ['landing', 'one page', 'single page'], id: 'landing' },
      { k: ['wordpress', 'wp'], id: 'wordpress' },
      { k: ['ecommerce', 'e-commerce', 'store', 'shop', 'selling', 'product'], id: 'store' },
      { k: ['app', 'application', 'dashboard', 'portal', 'software'], id: 'application' },
      { k: ['maintenance', 'maintain', 'update', 'support', 'care'], id: 'care' },
      { k: ['business', 'company', 'corporate', 'office', 'brand'], id: 'business' }
    ];
    for (var i = 0; i < rules.length; i++) {
      if (has(q, rules[i].k)) {
        var p = pricing().filter(function (x) { return x.id === rules[i].id; })[0];
        if (p) return p;
      }
    }
    return null;
  }
  function priceOf(pkg) {
    if (!pkg) return null;
    var p = pkg.price;
    return (p === null || p === undefined || p === '') ? null : String(p);
  }
  function anyRealPrice() {
    return pricing().some(function (p) { return !!priceOf(p); });
  }
  function contactReady() {
    var c = CFG.contact || {};
    return !!(c.email || c.phone || c.whatsapp);
  }
  function soon() { return (CFG.contact && CFG.contact.availabilityLabel) || 'Coming soon'; }
  function brand() { return CFG.brandName || 'SwiftSite'; }

  /* ---------- intent: routing ---------- */
  function detect(q) {
    var t = norm(q);
    if (!t) return 'empty';
    if (has(t, ['hello', 'hi ', 'hey', 'salam', 'assalam', 'salaam', 'adaslam', 'good morning', 'good evening', 'good night', 'hlo', 'yo ']) || t === 'hi' || t === 'salam') return 'greeting';
    if (has(t, ['thank', 'shukriya', 'shukria', 'thanks', 'jazak', 'great ', 'nice ', 'good job', 'well done', 'perfect'])) return 'thanks';
    if (has(t, ['bye', 'khuda hafiz', 'allah hafiz', 'see you', 'goodnight', 'tata'])) return 'bye';
    if (has(t, ['are you human', 'are you real', 'are you a bot', 'are you ai', 'which ai', 'which model', 'gemini', 'chatgpt', 'robot', 'tum insan', 'aap insan', 'real ho', 'bot ho', 'kaunsa ai'])) return 'identity';
    if (has(t, ['what can you do', 'what do you do here', 'help me', 'your features', 'tum kya kar', 'aap kya kar', 'kya madad', 'how do you work'])) return 'capability';
    if (has(t, ['urdu', 'english me', 'in english', 'roman', 'change language', 'switch language', 'language'])) return 'language';
    if (has(t, ['discount', 'sasta', 'cheap', 'kam price', 'kam qeemat', 'negotiate', 'offer', 'deal', 'installment', 'kist'])) return 'discount';
    if (has(t, ['how long', 'time lag', 'kitna time', 'kitne din', 'delivery', 'deadline', 'timeline', 'waqt', 'days', 'weeks', 'duration', 'kab tak', 'kab milegi'])) return 'timeline';
    if (has(t, ['portfolio', 'client', 'kaam dikhao', 'previous work', 'sample', 'example', 'review', 'rating', 'testimonial', 'award', 'experience', 'saal', 'years', 'team', 'developer', 'staff', 'office', 'address', 'location', 'kahan se', 'company history', 'about company'])) return 'notconfigured';
    if (has(t, ['contact', 'email', 'phone', 'number', 'whatsapp', 'call', 'reach', 'mobile', 'rabta', 'baat karni', 'baat kar', 'instagram', 'github', 'social'])) return 'contact';
    if (has(t, ['start', 'begin', 'shuru', 'suru', 'kick off', 'hire', 'book', 'order', 'place order', 'project form', 'enquiry', 'inquiry'])) return 'start';
    if (has(t, ['process', 'how it works', 'steps', 'workflow', 'tarika', 'process kya', 'kaise banate', 'kaise banti'])) return 'process';
    if (has(t, ['technology', 'technologies', 'stack', 'framework', 'tools', 'kis cheez', 'html', 'javascript', 'react'])) return 'tech';
    if (has(t, ['maintenance', 'maintain', 'update', 'backup', 'support', 'fix', 'bug'])) return 'service';
    if (has(t, ['price', 'pricing', 'cost', 'quote', 'budget', 'charge', 'fee', 'rate', 'kitne', 'kitna', 'kitni', 'qeemat', 'qimat', 'kharcha', 'paisa', 'paise', 'rupay', 'package', 'plan'])) return 'pricing';
    if (has(t, ['service', 'services', 'offer', 'what do you', 'provide', 'kaunse kaam', 'kya kya', 'kya karte', 'banate ho', 'bana sakte'])) return 'services';
    if (has(t, ['who are you', 'what is swiftsite', 'about swiftsite', 'about you', 'tell me about', 'introduce', 'kaun ho', 'kon ho', 'swiftsite kya'])) return 'about';
    if (findService(t) || has(t, ['website', 'site', 'web ', 'wordpress', 'ecommerce', 'store', 'shop', 'app', 'dashboard', 'design', 'ui', 'ux', 'frontend', 'backend', 'landing'])) return 'service';
    return 'fallback';
  }

  /* ---------- reply builders (EN) ---------- */
  var EN = {
    greeting: function () {
      return pick([
        'Hey — good to see you here. Ask me anything about ' + brand() + ': services, pricing, process or how to start.',
        'Hi there. I handle the questions people usually email us — services, pricing, timelines, getting in touch.',
        'Hello. Tell me what you are building and I will point you to the right service and the right package.'
      ]);
    },
    thanks: function () {
      return pick([
        'Anytime. If you want the next step, the project form in the contact section is the fastest route.',
        'Glad that helped. Want me to walk you through pricing or the process next?',
        'You are welcome. Anything else about the build, the timeline or how to reach us?'
      ]);
    },
    bye: function () {
      return pick(['Take care — the form and our profiles stay here whenever you are ready.', 'See you. Come back with your requirements and I will lay out the options.']);
    },
    identity: function () {
      return 'I am ' + (CFG.assistantName || 'SwiftSite AI') + ', the assistant on this page. Right now no AI model is attached, so I am answering from the studio\'s own configuration — the services, pricing fields and contact details you can see on this site. Attach a Gemini key and the same questions go to the model instead. Either way I only say what is actually configured.';
    },
    capability: function () {
      return 'I can explain what ' + brand() + ' builds, how pricing is handled here, what the process looks like and how to reach the studio. I can also send your question to the studio\'s team via the project form. What I cannot do is invent details — if something is not configured, I will say so.';
    },
    language: function () {
      return 'You can write in English, Roman Urdu, or a mix — I follow whatever you use. There is also an Auto / English / Roman Urdu switch in the rail on the left if you want to pin one.';
    },
    about: function () {
      return brand() + ' is a ' + (CFG.brandLine || 'web development studio') + '. We build websites, WordPress setups, e-commerce stores and custom web applications, and we look after sites afterwards. Everything I tell you comes from the studio\'s own configuration on this page — no invented history, clients or awards.';
    },
    services: function () {
      var list = services().map(function (s) { return '- ' + s.title + ': ' + (s.summary || ''); }).join('\n');
      return 'Here is what we do:\n' + list + '\nTell me which one sounds closest to your project and I will go deeper on it.';
    },
    service: function (svc) {
      if (!svc) {
        return 'We handle ' + services().slice(0, 4).map(function (s) { return s.title; }).join(', ') + ' and more — ask about any of them and I will explain how we approach it.';
      }
      return svc.title + ' — ' + (svc.detail || svc.summary || '') + '\nWant me to explain what the quote for this depends on?';
    },
    pricing: function (pkg) {
      if (pkg && priceOf(pkg)) {
        return 'For ' + pkg.name + ' the configured price is ' + priceOf(pkg) + '. It covers ' + (pkg.includes || []).slice(0, 3).join(', ') + '. ' + (pkg.note || '');
      }
      if (pkg) {
        return pkg.name + ' is quoted per project — there is no fixed rate configured, and I am not going to guess one. ' + (pkg.for || '') + ' It usually covers ' + (pkg.includes || []).join(', ') + '.\nWhat the final quote depends on: how many pages or screens, whether content is ready, and any integrations (payments, forms, logins). Tell me those three and I can tell you which package fits.';
      }
      if (anyRealPrice()) {
        var withPrice = pricing().filter(function (p) { return priceOf(p); }).map(function (p) { return '- ' + p.name + ': ' + priceOf(p); }).join('\n');
        return 'These are the configured prices:\n' + withPrice + '\nAnything else is quoted per project.';
      }
      return 'Pricing here is quote-based — no package has a fixed rate configured, so I will not invent a number. The quote moves with scope: number of pages or screens, whether your content is ready, and integrations like payments, logins or third-party APIs.\nTell me what you need built and I will tell you which package it falls under.';
    },
    process: function () {
      var steps = (CFG.process || []).map(function (p) { return '- ' + p.step + ' ' + p.title + ': ' + p.body; }).join('\n');
      return 'How it works on this page:\n' + steps + '\nFor a build, the practical order is: requirements, quote, design direction, development, review, handover.';
    },
    timeline: function () {
      var any = pricing().filter(function (p) { return p.timeline; });
      if (any.length) {
        return 'Configured timelines: ' + any.map(function (p) { return p.name + ' — ' + p.timeline; }).join('; ') + '.';
      }
      return 'Delivery timelines are not configured, so I would be making it up if I gave you a number of days. Honestly it depends on scope and how quickly content and feedback come back. Share your requirements in the project form and the timeline gets confirmed at the quote stage.';
    },
    tech: function () {
      var tags = [];
      services().forEach(function (s) { (s.tags || []).forEach(function (t) { if (tags.indexOf(t) === -1) tags.push(t); }); });
      return 'The configured stack areas are: ' + tags.join(', ') + '. Hand-built HTML, CSS and JavaScript for marketing sites, WordPress where you want to edit content yourself, and a proper backend with database and APIs when the project needs real logic. Exact choices depend on the project.';
    },
    discount: function () {
      return 'There is no discount or instalment policy configured, so I cannot promise one. What I can do is help you scope the project so it fits a budget — sometimes a landing page first and the rest later is the sensible route.';
    },
    contact: function () {
      var c = CFG.contact || {};
      var lines = [];
      if (c.email) lines.push('- Email: ' + c.email);
      if (c.phone) lines.push('- Phone: ' + c.phone);
      if (c.whatsapp) lines.push('- WhatsApp: ' + c.whatsapp);
      if (!lines.length) {
        return 'Direct contact details are ' + soon().toLowerCase() + ' — email, phone and WhatsApp are not configured yet, and I will not invent them. Two things that do work right now:\n- the project enquiry form in the contact section of this page\n- ' + socialLine() + '\nFill the form and your details are ready to send the moment the studio address goes live.';
      }
      return 'Here is how to reach ' + brand() + ':\n' + lines.join('\n') + '\nAlso public: ' + socialLine() + '.';
    },
    start: function () {
      return 'Easiest way: scroll to the Contact section and fill the project enquiry form — name, email, project type, budget and a line or two about what you are building. It validates your details and prepares the enquiry; it does not pretend to have sent anything. If you would rather talk first, ' + (contactReady() ? 'use the contact details above' : socialLine() + ' is open') + '.';
    },
    notconfigured: function () {
      return 'I do not have that information configured yet. ' + brand() + ' does not publish client lists, reviews, team details or office information on this page, and I am not going to make any of it up. What I can give you is services, how pricing is handled, the process and the project form.';
    },
    fallback: function (q) {
      return 'That one is outside what I have configured, so I would only be guessing. I can answer properly about ' + brand() + '\'s services, pricing approach, process and how to reach us — try one of those, or drop your question in the project form.';
    },
    empty: function () { return 'Go ahead — type your question. Something like "website ka price kya hai?" works.'; }
  };

  /* ---------- reply builders (Roman Urdu) ---------- */
  var RU = {
    greeting: function () {
      return pick([
        'Salam! ' + brand() + ' ke baare me jo poochna hai pooch lein — services, pricing, process ya project kaise shuru karein.',
        'Ji, main yahan hoon. Batayein kya banana chahte hain, main suitable service aur package bata deta hoon.',
        'Welcome! Aap English ya Roman Urdu me likh sakte hain — jo aap use karenge main usi me jawab doonga.'
      ]);
    },
    thanks: function () {
      return pick([
        'Koi baat nahi. Agla qadam ye hai ke contact section me project form bhar dein — sab se tez rasta wahi hai.',
        'Khushi hui madad kar ke. Pricing ya process samjhana chahiye ab?',
        'Shukriya aap ka. Aur kuch poochna hai build, timeline ya contact ke baare me?'
      ]);
    },
    bye: function () {
      return 'Theek hai, form aur hamari profiles yahi hain — jab requirements ready hon wapas aa jaiye.';
    },
    identity: function () {
      return 'Main ' + (CFG.assistantName || 'SwiftSite AI') + ' hoon, is page ka assistant. Abhi koi AI model attach nahi hai, is liye main studio ki apni configuration se jawab de raha hoon — wahi services, pricing fields aur contact details jo is site par maujood hain. Gemini key attach ho jaye to yehi sawal model ke paas chale jate hain. Dono surat me main sirf wahi batata hoon jo configure hai.';
    },
    capability: function () {
      return 'Main bata sakta hoon ke ' + brand() + ' kya kya banata hai, pricing ka andaza kaise lagta hai, process kya hai aur studio tak kaise pohnchna hai. Project form ke zariye aap ki requirements bhi tayyar kar deta hoon. Jo cheez configure nahi hoti us ka main jhoot nahi bolta — saaf keh deta hoon ke information available nahi.';
    },
    language: function () {
      return 'Aap English, Roman Urdu ya dono mix likh sakte hain — main usi andaaz me jawab doonga jaise aap likhenge. Left rail me Auto / English / Roman Urdu ka switch bhi hai agar aap ek language fix karna chahein.';
    },
    about: function () {
      return brand() + ' ek ' + (CFG.brandLine || 'web development studio') + ' hai. Hum websites, WordPress setups, e-commerce stores aur custom web applications banate hain, aur banne ke baad un ki dekh bhaal bhi karte hain. Jo kuch main batata hoon wo is page ki real configuration se aata hai — koi banawati clients, reviews ya awards nahi.';
    },
    services: function () {
      var list = services().map(function (s) { return '- ' + s.title + ': ' + (s.summary || ''); }).join('\n');
      return 'Ye hain wo kaam jo hum karte hain:\n' + list + '\nBatayein in me se kaunsa aap ke project ke qareeb hai, phir main us ki tafseel bata deta hoon.';
    },
    service: function (svc) {
      if (!svc) {
        return 'Hum ' + services().slice(0, 4).map(function (s) { return s.title; }).join(', ') + ' aur baqi cheezein bhi banate hain. Kisi ek ka naam lein to main us ka poora andaza bata doon.';
      }
      return svc.title + ' — ' + (svc.detail || svc.summary || '') + '\nBataiye, is ka quote kin cheezon par depend karta hai wo bhi samjha doon?';
    },
    pricing: function (pkg) {
      if (pkg && priceOf(pkg)) {
        return pkg.name + ' ki configured price ' + priceOf(pkg) + ' hai. Is me ' + (pkg.includes || []).slice(0, 3).join(', ') + ' shamil hai. ' + (pkg.note || '');
      }
      if (pkg) {
        return pkg.name + ' ka price fix configure nahi hai — ye project ke requirements ke hisaab se quote hota hai, aur main andaza nahi lagaoonga. ' + (pkg.for || '') + ' Aam taur par is me ' + (pkg.includes || []).join(', ') + ' shamil hota hai.\nFinal quote in cheezon par depend karta hai: kitne pages ya screens hain, content tayyar hai ya nahi, aur koi integration chahiye (payment, form, login). Ye teen bata dein to main suitable package bata deta hoon.';
      }
      if (anyRealPrice()) {
        var withPrice = pricing().filter(function (p) { return priceOf(p); }).map(function (p) { return '- ' + p.name + ': ' + priceOf(p); }).join('\n');
        return 'Jo prices configure hain wo ye hain:\n' + withPrice + '\nBaqi sab ka quote project ke hisaab se banta hai.';
      }
      return 'Yahan pricing quote-based hai — kisi package ka fix rate configure nahi hai, is liye main koi number nahi banaoonga. Quote ka taaluq scope se hai: pages ya screens ki tadaad, content tayyar hai ya nahi, aur integrations jaise payment, login ya kisi teesri service ka API.\nAap bata dein kya banana hai, main package aur requirements clear kar deta hoon.';
    },
    process: function () {
      var steps = (CFG.process || []).map(function (p) { return '- ' + p.step + ' ' + p.title + ': ' + p.body; }).join('\n');
      return 'Is page par tareeqa ye hai:\n' + steps + '\nBuild ke liye practical order: requirements, quote, design direction, development, review, phir handover.';
    },
    timeline: function () {
      var any = pricing().filter(function (p) { return p.timeline; });
      if (any.length) {
        return 'Jo timelines configure hain: ' + any.map(function (p) { return p.name + ' — ' + p.timeline; }).join('; ') + '.';
      }
      return 'Delivery ka time configure nahi hai, is liye main din ya hafte nahi bata sakta — wo banawati hoga. Sach ye hai ke scope aur content/feedback ki speed par depend karta hai. Project form me requirements bhej dein, quote ke waqt exact timeline confirm ho jati hai.';
    },
    tech: function () {
      var tags = [];
      services().forEach(function (s) { (s.tags || []).forEach(function (t) { if (tags.indexOf(t) === -1) tags.push(t); }); });
      return 'Jo stack areas configure hain: ' + tags.join(', ') + '. Marketing sites ke liye hand-built HTML, CSS aur JavaScript, content khud edit karne ke liye WordPress, aur jab real logic chahiye to database aur APIs ke saath backend. Exact choice project par depend karti hai.';
    },
    discount: function () {
      return 'Discount ya kiston ki koi policy configure nahi hai, is liye main wada nahi kar sakta. Haan, scope aise set karne me madad kar sakta hoon ke budget me aa jaye — baar awwal sirf landing page, baqi kaam baad me, ye aksar behtar rehta hai.';
    },
    contact: function () {
      var c = CFG.contact || {};
      var lines = [];
      if (c.email) lines.push('- Email: ' + c.email);
      if (c.phone) lines.push('- Phone: ' + c.phone);
      if (c.whatsapp) lines.push('- WhatsApp: ' + c.whatsapp);
      if (!lines.length) {
        return 'Direct contact details abhi ' + soon() + ' hain — email, phone aur WhatsApp configure nahi hue, aur main koi number bana kar nahi de sakta. Jo abhi kaam karte hain:\n- is page ke contact section me project enquiry form\n- ' + socialLine() + '\nForm bhar dein, studio ka address live hote hi aap ki details bhejne ke liye tayyar hongi.';
      }
      return brand() + ' tak pohnchne ke tareeqe:\n' + lines.join('\n') + '\nIs ke ilawa public: ' + socialLine() + '.';
    },
    start: function () {
      return 'Sab se aasaan rasta: Contact section me jaa kar project enquiry form bhar dein — naam, email, project type, budget aur do line me batayein kya banana hai. Form aap ki details validate kar ke enquiry tayyar karta hai; wo jhoot nahi bolta ke message chala gaya. Pehle baat karni ho to ' + (contactReady() ? 'upar diye gaye contact details use karein' : socialLine() + ' khula hai') + '.';
    },
    notconfigured: function () {
      return 'Ye information mere paas configure nahi hai. ' + brand() + ' is page par clients, reviews, team ya office ki tafseelat publish nahi karta, aur main kuch bana kar nahi bataoonga. Jo bata sakta hoon: services, pricing ka tareeqa, process aur project form.';
    },
    fallback: function () {
      return 'Ye sawal meri configuration se bahar hai, is liye main sirf andaza laga sakta hoon — wo main nahi karoonga. Services, pricing ka tareeqa, process aur contact ke baare me sahi jawab de sakta hoon. Ya apna sawal project form me likh dein.';
    },
    empty: function () { return 'Likhiye apna sawal — masalan "website ka price kya hai?" ya "WordPress site banate ho?"'; }
  };

  /* ---------- follow-up chips ---------- */
  var CHIPS = {
    greeting: ['What services do you offer?', 'Website ka price kya hai?', 'How can I start a project?'],
    thanks: ['Show me your pricing.', 'How can I contact SwiftSite?', 'Website banwane ka process kya hai?'],
    bye: ['What services do you offer?', 'Show me your pricing.'],
    identity: ['What services do you offer?', 'How can I start a project?', 'Show me your pricing.'],
    capability: ['What services do you offer?', 'Show me your pricing.', 'How can I contact SwiftSite?'],
    language: ['What services do you offer?', 'Website ka price kya hai?'],
    about: ['What services do you offer?', 'Show me your pricing.', 'How can I start a project?'],
    services: ['WordPress available hai?', 'E-commerce store banate ho?', 'Show me your pricing.'],
    service: ['Is ka price kya hoga?', 'Kitna time lagega?', 'How can I start a project?'],
    pricing: ['Website banwane ka process kya hai?', 'WordPress website ka quote kaise banta hai?', 'How can I start a project?'],
    process: ['What services do you offer?', 'How can I contact SwiftSite?', 'Kitna time lagega?'],
    timeline: ['Show me your pricing.', 'How can I start a project?', 'What services do you offer?'],
    tech: ['WordPress available hai?', 'Custom web application banate ho?', 'Show me your pricing.'],
    discount: ['Show me your pricing.', 'Landing page se shuru karein?', 'How can I start a project?'],
    contact: ['How can I start a project?', 'What services do you offer?', 'Show me your pricing.'],
    start: ['Show me your pricing.', 'What services do you offer?', 'Website banwane ka process kya hai?'],
    notconfigured: ['What services do you offer?', 'Show me your pricing.', 'How can I contact SwiftSite?'],
    fallback: ['What services do you offer?', 'Website ka price kya hai?', 'How can I contact SwiftSite?'],
    empty: ['What services do you offer?', 'Website ka price kya hai?']
  };

  /* ---------- public ---------- */
  function respond(messages, mode) {
    var last = '';
    for (var i = (messages || []).length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { last = messages[i].text || ''; break; }
    }
    var detected = detectLanguage(last);
    var lang = (mode === 'en') ? 'en' : (mode === 'roman-urdu' ? 'roman-urdu' : detected);
    var intent = detect(last);
    var q = norm(last);
    var bank = (lang === 'roman-urdu') ? RU : EN;
    var svc = findService(q);
    var pkg = findPackage(q);
    var text;

    switch (intent) {
      case 'greeting': text = bank.greeting(); break;
      case 'thanks': text = bank.thanks(); break;
      case 'bye': text = bank.bye(); break;
      case 'identity': text = bank.identity(); break;
      case 'capability': text = bank.capability(); break;
      case 'language': text = bank.language(); break;
      case 'about': text = bank.about(); break;
      case 'services': text = bank.services(); break;
      case 'service': text = bank.service(svc); break;
      case 'pricing': text = bank.pricing(pkg); break;
      case 'process': text = bank.process(); break;
      case 'timeline': text = bank.timeline(); break;
      case 'tech': text = bank.tech(); break;
      case 'discount': text = bank.discount(); break;
      case 'contact': text = bank.contact(); break;
      case 'start': text = bank.start(); break;
      case 'notconfigured': text = bank.notconfigured(); break;
      case 'empty': text = bank.empty(); break;
      default: text = bank.fallback(q);
    }

    /* pricing questions that name a service should also see the service line */
    if (intent === 'pricing' && svc && !pkg) {
      text = text + '\n' + (lang === 'roman-urdu'
        ? 'Aap ' + svc.title + ' ki baat kar rahe hain — us ke liye bhi quote scope ke hisaab se banta hai.'
        : 'You sound like a ' + svc.title + ' project — that is quoted on scope too.');
    }

    var chips = (CHIPS[intent] || CHIPS.fallback).slice(0, 3);
    return {
      text: text,
      language: lang,
      intent: intent,
      engine: 'local',
      followUps: chips.map(function (c) { return { text: c }; }),
      seed: hash(q)
    };
  }

  global.SwiftSiteLocal = {
    respond: respond,
    detectLanguage: detectLanguage,
    available: function () { return services().length > 0; }
  };
})(window);
