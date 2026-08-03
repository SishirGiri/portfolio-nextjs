/* ==========================================================================
   AI Chatbot — Portfolio Demo
   Vanilla JS. Rule-based intent matching with keyword/pattern scoring.
   Maintains conversation history and can reference prior context.
   No external dependencies.
   ========================================================================== */
(function () {
  'use strict';

  /* ======================================================================
     1. KNOWLEDGE BASE — realistic FAQ-style content about the portfolio owner
     ====================================================================== */

  const OWNER = {
    name: 'Sishir',
    role: 'Full-Stack Developer & ML Enthusiast',
    focus: 'building intelligent web apps, clean APIs, and ML-powered tools',
    stack: ['JavaScript', 'Python', 'React', 'Node.js', 'FastAPI', 'TensorFlow'],
    interests: ['machine learning', 'system design', 'developer tooling', 'open source']
  };

  /**
   * Each intent has:
   *  - id:        unique key
   *  - keywords:  weighted keywords. Exact word match adds the weight to score.
   *  - patterns:  regex patterns tested against the raw message (higher signal).
   *  - respond(): returns a string (or a function of state for contextual replies)
   */
  const INTENTS = [

    /* ---------- 1. Greeting ---------- */
    {
      id: 'greeting',
      keywords: { hi: 3, hello: 3, hey: 3, yo: 2, greetings: 2, howdy: 2, hola: 2, 'good morning': 2, 'good evening': 2 },
      patterns: [/^(hi|hello|hey|yo|sup|howdy|hola)\b/i],
      respond: (s) => {
        const name = s.user.name;
        return name
          ? `Hey ${name}! Good to see you again. What can I help you with?`
          : "Hey there! I'm a rule-based chatbot demo. Ask me about Sishir's portfolio, request a joke, or try some math.";
      }
    },

    /* ---------- 2. How are you ---------- */
    {
      id: 'how_are_you',
      keywords: { how: 2, are: 1, you: 1, doing: 2, 'how are you': 5, feeling: 2 },
      patterns: [/how (are|r) (you|u|things)/i, /how's it going/i, /how are you/i],
      respond: () => "I'm running at peak performance — every rule firing on schedule! How can I help you today?"
    },

    /* ---------- 3. Identity — who are you ---------- */
    {
      id: 'identity',
      keywords: { who: 2, are: 1, you: 2, what: 1, 'who are you': 5, bot: 2, chatbot: 2, robot: 2, ai: 1 },
      patterns: [/who (are|r) you/i, /what (are|r) you/i, /are you (a |an )?(bot|robot|ai|chatbot|human)/i],
      respond: () => "I'm an AI Chatbot demo built with vanilla JavaScript. I use rule-based pattern matching — no neural networks, just keywords, regex, and a JSON-style knowledge base."
    },

    /* ---------- 4. What can you do ---------- */
    {
      id: 'capabilities',
      keywords: { 'what can you do': 5, capabilities: 3, features: 3, help: 2, functions: 2, do: 1, can: 1 },
      patterns: [/what (can|do) you do/i, /help me/i, /your (features|capabilities)/i],
      respond: () => [
        "Here's what I can do:",
        "• Answer FAQs about Sishir's portfolio",
        "• Solve math like <code>12 * 7</code> or <code>what is 15 + 30</code>",
        "• Tell you the current time and date",
        "• Remember things across our chat (try \"my name is …\")",
        "• Tell jokes, discuss tech, and more"
      ].join('\n')
    },

    /* ---------- 5. Name capture — "my name is X" ---------- */
    {
      id: 'name_capture',
      keywords: { 'my name is': 5, 'name': 2, "i'm": 2, 'i am': 2, 'call me': 4 },
      patterns: [/my name is ([a-z ,.'-]+)/i, /i am ([a-z ,.'-]+)/i, /i'm ([a-z ,.'-]+)/i, /call me ([a-z ,.'-]+)/i],
      respond: (s, m) => {
        const captured = m && m[1] ? m[1].trim().split(/\s+/)[0] : null;
        const name = (captured || '').replace(/[^a-z'-]/gi, '');
        if (name) {
          s.user.name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
          return `Nice to meet you, ${s.user.name}! I'll remember that for the rest of our conversation.`;
        }
        return "I didn't quite catch the name — try \"my name is Alex\".";
      }
    },

    /* ---------- 6. What's my name (memory recall) ---------- */
    {
      id: 'recall_name',
      keywords: { 'my name': 4, "what's my name": 5, "whats my name": 5, remember: 1, name: 2 },
      patterns: [/what('?s| is) my name/i, /do you (know|remember) my name/i, /who am i/i],
      respond: (s) => s.user.name
        ? `You're ${s.user.name} — you told me earlier.`
        : "I don't know your name yet. Tell me with \"my name is …\"."
    },

    /* ---------- 7. What did I just say (history recall) ---------- */
    {
      id: 'recall_last',
      keywords: { 'what did i': 4, 'just said': 4, 'last message': 4, 'previous message': 4, said: 1 },
      patterns: [/what did i (just )?say/i, /what was my last (message|msg)/i, /repeat what i said/i],
      respond: (s) => {
        const lastUser = [...s.history].reverse().find(m => m.role === 'user');
        return lastUser
          ? `You just said: "${lastUser.text}"`
          : "You haven't said anything to me yet!";
      }
    },

    /* ---------- 8. Who made you (owner / portfolio) ---------- */
    {
      id: 'creator',
      keywords: { 'who made you': 5, 'who built you': 5, 'who created you': 5, 'who developed you': 5, creator: 3, author: 2, owner: 2, made: 1, built: 1, sishir: 4 },
      patterns: [/who (made|built|created|developed|wrote) you/i, /your (creator|author|developer|owner)/i],
      respond: () => `I was built by ${OWNER.name}, a ${OWNER.role}. This chatbot is part of their developer portfolio to showcase pattern-matching NLP in vanilla JS.`
    },

    /* ---------- 9. About Sishir (portfolio FAQ) ---------- */
    {
      id: 'about_owner',
      keywords: { sishir: 5, portfolio: 3, about: 2, developer: 2, owner: 2, 'who is': 2 },
      patterns: [/tell me about sishir/i, /who is sishir/i, /about (the )?(owner|developer|portfolio)/i],
      respond: () => `${OWNER.name} is a ${OWNER.role}. They focus on ${OWNER.focus}. You're looking at one of their demo projects right now — a rule-based chatbot written from scratch.`
    },

    /* ---------- 10. Skills / tech stack ---------- */
    {
      id: 'skills',
      keywords: { skills: 3, tech: 2, stack: 3, technologies: 3, languages: 2, tools: 2, framework: 2 },
      patterns: [/what (tech|technologies|languages|tools|frameworks)/i, /(tech|technology) stack/i, /your (skills|stack)/i],
      respond: () => `${OWNER.name}'s core stack includes ${OWNER.stack.slice(0, -1).join(', ')}, and ${OWNER.stack.slice(-1)}. They enjoy working with ${OWNER.interests.slice(0, 2).join(' and ')}.`
    },

    /* ---------- 11. Contact ---------- */
    {
      id: 'contact',
      keywords: { contact: 3, email: 3, reach: 2, hire: 3, connect: 2, linkedin: 2, github: 2 },
      patterns: [/how (do|can) i (contact|reach|hire)/i, /(contact|email|hire) (sishir|you|him)/i],
      respond: () => "To contact Sishir, use the contact form or social links on the main portfolio page. (This demo intentionally has no outbound links to keep things self-contained.)"
    },

    /* ---------- 12. Time ---------- */
    {
      id: 'time',
      keywords: { time: 4, clock: 2, 'what time': 4 },
      patterns: [/what('?s| is) the time/i, /current time/i, /time (now|please)/i],
      respond: () => {
        const now = new Date();
        return `It's ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} in your local timezone.`;
      }
    },

    /* ---------- 13. Date ---------- */
    {
      id: 'date',
      keywords: { date: 3, day: 2, today: 3, 'what day': 4 },
      patterns: [/what('?s| is) the date/i, /what day is (it|today)/i, /today('?s|'s) date/i],
      respond: () => {
        const now = new Date();
        return `Today is ${now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
      }
    },

    /* ---------- 14. Weather (simulated) ---------- */
    {
      id: 'weather',
      keywords: { weather: 5, temperature: 3, forecast: 3, rain: 2, sunny: 2, hot: 1, cold: 1 },
      patterns: [/what('?s| is) the weather/i, /weather (today|forecast|like)/i, /is it (going to )?(rain|sunny|hot|cold)/i],
      respond: () => "This is a portfolio demo, so I can't pull live weather data. But if I could, I'd probably say: 72°F and partly cloudy with a chance of curiosity. For real weather, try a dedicated weather app."
    },

    /* ---------- 15. Jokes ---------- */
    {
      id: 'joke',
      keywords: { joke: 5, jokes: 4, funny: 3, laugh: 2, haha: 2 },
      patterns: [/tell me a joke/i, /make me laugh/i, /something funny/i],
      respond: () => {
        const jokes = [
          "Why do programmers prefer dark mode? Because light attracts bugs.",
          "I'd tell you a UDP joke, but you might not get it.",
          "There are only 10 types of people in the world: those who understand binary and those who don't.",
          "Why did the developer go broke? Because he used up all his cache.",
          "A SQL query walks into a bar, approaches two tables, and asks: \"Mind if I join you?\"",
          "How many programmers does it take to change a light bulb? None — that's a hardware problem.",
          "Why was the JavaScript developer sad? Because they didn't Node how to Express themselves."
        ];
        return jokes[Math.floor(Math.random() * jokes.length)];
      }
    },

    /* ---------- 16. Thanks ---------- */
    {
      id: 'thanks',
      keywords: { thanks: 4, thank: 3, 'thank you': 5, thx: 3, appreciate: 2, ty: 2 },
      patterns: [/thanks?/i, /thank you/i, /appreciate (it|that)/i],
      respond: (s) => {
        const name = s.user.name;
        return name ? `You're welcome, ${name}! Anytime.` : "You're welcome! Happy to help.";
      }
    },

    /* ---------- 17. Goodbye ---------- */
    {
      id: 'goodbye',
      keywords: { bye: 4, goodbye: 4, farewell: 3, 'see you': 3, later: 2, cya: 2, peace: 2 },
      patterns: [/^(bye|goodbye|see ya|see you|farewell|cya|later)\b/i],
      respond: (s) => {
        const name = s.user.name;
        return name ? `Goodbye, ${name}! Thanks for chatting — come back anytime.` : "Goodbye! Thanks for trying out the demo. Refresh to start a new conversation.";
      }
    },

    /* ---------- 18. Technology questions ---------- */
    {
      id: 'tech_general',
      keywords: { javascript: 4, python: 4, react: 3, node: 3, ai: 2, ml: 2, 'machine learning': 4, html: 3, css: 3, api: 3, github: 2 },
      patterns: [/what is (javascript|python|react|node|html|css|ai|machine learning|an api)/i],
      respond: (_s, m) => {
        const topic = (m && m[1] ? m[1] : '').toLowerCase();
        const defs = {
          javascript: "JavaScript is the programming language of the web — it runs in browsers and on servers (via Node.js), powering interactivity like this very chatbot.",
          python: "Python is a high-level, readable language popular for data science, scripting, ML, and backend development. Its clean syntax makes it beginner-friendly.",
          react: "React is a JavaScript library by Meta for building user interfaces using reusable components and a virtual DOM for efficient updates.",
          node: "Node.js lets you run JavaScript outside the browser, making it ideal for building fast, scalable network applications and APIs.",
          html: "HTML (HyperText Markup Language) is the standard markup that structures content on the web — every page, including this one, starts with it.",
          css: "CSS (Cascading Style Sheets) controls how web pages look — colors, layout, animations, and responsive design like this dark theme.",
          ai: "AI (Artificial Intelligence) is the field of making computers perform tasks that typically require human intelligence — perception, reasoning, language.",
          'machine learning': "Machine Learning is a subset of AI where systems learn patterns from data instead of being explicitly programmed. Think recommendations, vision, and LLMs.",
          api: "An API (Application Programming Interface) is a contract that lets different software talk to each other — like a restaurant menu for code."
        };
        return defs[topic] || "That's a broad tech topic! Try asking 'what is JavaScript', 'what is Python', or 'what is React' specifically.";
      }
    },

    /* ---------- 19. How does this chatbot work (meta) ---------- */
    {
      id: 'how_works',
      keywords: { 'how do you work': 5, 'how does this work': 5, 'how it works': 4, nlp: 3, 'pattern matching': 4, algorithm: 2 },
      patterns: [/how (do|does) (you|this|it) work/i, /how (are|were) you (built|made|programmed)/i, /explain yourself/i],
      respond: () => "Great question! I work via rule-based NLP: your message is normalized, then scored against ~20 intents using weighted keyword matching and regex patterns. The highest-scoring intent wins. I also keep a conversation history so I can reference what you said earlier — no neural networks required."
    },

    /* ---------- 20. Compliments / affirmations ---------- */
    {
      id: 'compliment',
      keywords: { awesome: 3, cool: 3, great: 3, nice: 2, amazing: 3, love: 2, good: 2, smart: 3, brilliant: 3 },
      patterns: [/(you('?re| are) |so )(awesome|cool|great|amazing|smart|brilliant|good)/i],
      respond: () => "Thank you! I'm just a bundle of if-statements and regex, but I appreciate it. 😄 Try asking me to tell a joke or do some math!"
    }
  ];

  /* Fallback responses when no intent scores above threshold */
  const FALLBACKS = [
    "I'm not sure I understood that. Try asking about Sishir's skills, request a joke, or ask \"what can you do?\".",
    "Hmm, that's outside my rule set. I'm best at FAQs, math, jokes, time/date, and tech questions.",
    "I didn't catch a matching pattern. Type \"help\" or tap a suggestion chip below to see what I can do!"
  ];

  /* Quick-reply suggestion chips */
  const QUICK_REPLIES = [
    'What can you do?',
    'Who made you?',
    'Tell me a joke',
    'What is machine learning?',
    'What time is it?',
    'My name is Alex'
  ];


  /* ======================================================================
     2. NLP ENGINE — normalize + score intents
     ====================================================================== */

  /**
   * Normalize raw text: lowercase, collapse whitespace, strip punctuation
   * that isn't meaningful for keyword matching. Keep digits for math.
   */
  function normalize(text) {
    return text.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim();
  }

  /**
   * Try to evaluate a math expression embedded in the message.
   * Supports digits, + - * / % ( ) and decimals. Returns a number or null.
   */
  function tryMath(raw) {
    // Look for explicit "what is/what's/calculate/compute <expr>"
    let m = raw.match(/(?:what(?:'s| is)|what equals|calculate|compute|solve|evaluate)\s+([0-9+\-*/%.() ]+)/i);
    let expr = m ? m[1].trim() : null;

    // Or detect a bare arithmetic expression like "5 + 3" or "12*7"
    if (!expr) {
      const bare = raw.match(/^\s*([0-9][0-9+\-*/%.() ]*[0-9])\s*=?\s*\??\s*$/);
      if (bare) expr = bare[1].trim();
    }

    if (!expr) return null;
    // Safety: only allow safe characters
    if (!/^[0-9+\-*/%.() ]+$/.test(expr)) return null;

    try {
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + expr + ');')();
      if (typeof result === 'number' && Number.isFinite(result)) {
        return { expr, result };
      }
    } catch (_) { /* ignore */ }
    return null;
  }

  /**
   * Score every intent against the normalized message.
   * Returns the best intent (with its match array) or null.
   */
  function matchIntent(rawText) {
    const norm = normalize(rawText);
    let best = null;
    let bestScore = 0;

    for (const intent of INTENTS) {
      let score = 0;

      // Regex patterns are stronger signals
      let match = null;
      for (const re of (intent.patterns || [])) {
        const m = norm.match(re);
        if (m) {
          score += 5;
          match = m;
          break; // first matching pattern wins the bonus
        }
      }

      // Weighted keyword scoring (multi-word phrases handled too)
      for (const kw in intent.keywords) {
        if (kw.includes(' ')) {
          if (norm.includes(kw)) score += intent.keywords[kw];
        } else {
          // word-boundary match for single words
          const re = new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
          if (re.test(norm)) score += intent.keywords[kw];
        }
      }

      if (score > bestScore) {
        bestScore = score;
        best = { intent, match };
      }
    }

    // Require a minimum signal to count as a match
    return bestScore >= 2 ? best : null;
  }


  /* ======================================================================
     3. APP STATE + DOM WIRING
     ====================================================================== */

  const state = {
    history: [],          // { role: 'user'|'bot', text, ts }
    user: { name: null }, // learned context (memory)
    fallbackCount: 0
  };

  // DOM references
  const $messages      = document.getElementById('messages');
  const $typing        = document.getElementById('typingIndicator');
  const $quickReplies  = document.getElementById('quickReplies');
  const $composer      = document.getElementById('composer');
  const $userInput     = document.getElementById('userInput');
  const $sendBtn       = document.getElementById('sendBtn');
  const $clearBtn      = document.getElementById('clearBtn');

  /* ---------- Utilities ---------- */

  function timestamp() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Render text safely but allow a curated set of inline tags
   * (<code>, <br>, <b>, <strong>) by escaping first then un-escaping those.
   */
  function renderRich(text) {
    let safe = escapeHtml(text);
    safe = safe
      .replace(/&lt;code&gt;/g, '<code>')
      .replace(/&lt;\/code&gt;/g, '</code>')
      .replace(/&lt;b&gt;/g, '<b>')
      .replace(/&lt;\/b&gt;/g, '</b>')
      .replace(/&lt;strong&gt;/g, '<strong>')
      .replace(/&lt;\/strong&gt;/g, '</strong>')
      .replace(/\n/g, '<br>');
    return safe;
  }

  function scrollToBottom() {
    // rAF ensures the new DOM node is laid out before scrolling
    requestAnimationFrame(() => {
      $messages.scrollTop = $messages.scrollHeight;
    });
  }

  /* ---------- Render a message bubble ---------- */

  function addMessage(role, text) {
    const entry = { role, text, ts: timestamp() };
    state.history.push(entry);

    const row = document.createElement('div');
    row.className = 'msg msg--' + role;

    const bubble = document.createElement('div');
    bubble.className = 'msg__bubble';
    bubble.innerHTML = renderRich(text);

    const meta = document.createElement('div');
    meta.className = 'msg__meta';
    meta.textContent = (role === 'user' ? 'You · ' : 'Bot · ') + entry.ts;

    const wrap = document.createElement('div');
    if (role === 'user') wrap.style.textAlign = 'right';
    wrap.appendChild(bubble);
    wrap.appendChild(meta);

    row.appendChild(wrap);
    $messages.appendChild(row);
    scrollToBottom();
  }

  /* ---------- Typing indicator ---------- */

  function showTyping() { $typing.classList.remove('hidden'); scrollToBottom(); }
  function hideTyping() { $typing.classList.add('hidden'); }

  /* ---------- Generate a bot reply for a given user message ---------- */

  function generateReply(rawText) {
    // 1. Try math first — highest priority for explicit arithmetic
    const math = tryMath(rawText);
    if (math) {
      const pretty = math.result % 1 === 0 ? math.result.toString() : math.result.toFixed(4).replace(/\.?0+$/, '');
      return `The result of <code>${math.expr}</code> is <code>${pretty}</code>.`;
    }

    // 2. Intent matching
    const match = matchIntent(rawText);
    if (match) {
      state.fallbackCount = 0;
      return match.intent.respond(state, match.match);
    }

    // 3. Fallback
    state.fallbackCount += 1;
    return FALLBACKS[Math.min(state.fallbackCount - 1, FALLBACKS.length - 1)];
  }

  /* ---------- Main send flow ---------- */

  function sendUserMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    addMessage('user', trimmed);
    $userInput.value = '';
    $userInput.focus();

    // Simulate "thinking" delay
    showTyping();
    const delay = 600 + Math.random() * 300; // 600–900ms
    window.setTimeout(() => {
      hideTyping();
      const reply = generateReply(trimmed);
      addMessage('bot', reply);
    }, delay);
  }

  /* ---------- Quick-reply chips ---------- */

  function renderQuickReplies() {
    $quickReplies.innerHTML = '';
    QUICK_REPLIES.forEach((q) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.textContent = q;
      btn.addEventListener('click', () => sendUserMessage(q));
      $quickReplies.appendChild(btn);
    });
  }

  /* ---------- Clear chat ---------- */

  function clearChat() {
    state.history.length = 0;
    state.user.name = null;
    state.fallbackCount = 0;
    $messages.innerHTML = '';
    hideTyping();
    renderWelcome();
  }

  function renderWelcome() {
    addMessage('bot', `Hi! I'm an AI Chatbot demo built with vanilla JavaScript and rule-based NLP. I can answer FAQs about ${OWNER.name}'s portfolio, do basic math, tell jokes, and remember your name. How can I help?`);
  }

  /* ---------- Event listeners ---------- */

  $composer.addEventListener('submit', (e) => {
    e.preventDefault();
    sendUserMessage($userInput.value);
  });

  // Optional: live-enable send button styling if input is empty (kept simple)
  $userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendUserMessage($userInput.value);
    }
  });

  $clearBtn.addEventListener('click', clearChat);

  /* ---------- Init ---------- */
  renderQuickReplies();
  renderWelcome();
  $userInput.focus();

})();
