/**
 * Jev Playground proxy.
 *
 * The browser sends { text }. This Worker adds the OpenRouter key (a Worker secret),
 * asks Jev every question in one Decisions call, and returns the IntentResult shape
 * the app already understands. The key never reaches the browser.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/alpha/decisions";
const MODEL = "~typesafe/jev-latest";
const MAX_TEXT = 500;

const choice = (instructions, criteria) => ({ type: "choice", instructions, criteria });
const noul = (instructions) => ({ type: "noul", instructions });
const score = (instructions, criteria) => ({ type: "score", instructions, criteria });

// Mirrors src/lib/jev/questions.ts. Keep the two in sync.
const QUESTIONS = {
  intent: choice("What is the person trying to create with this text", {
    event: "Scheduling a meeting, meal, call or gathering at a time, usually with other people",
    reminder: "Asking to be reminded to do a single task themselves, e.g. 'remind me to…'",
    todo: "Listing several separate things to do or buy",
    timer: "Starting a timer, countdown, focus session or stopwatch for a duration",
    habit: "Something they want to do repeatedly as a routine, e.g. daily or weekly",
    color: "Referring to a color: a hex code, rgb value, or a described color",
    split: "Dividing an amount of money between several people",
    expense: "Recording money they spent on something",
    convert: "Converting a value from one unit of measurement to another",
    calc: "A math calculation or percentage that is not splitting money or converting units",
    travel: "Planning a trip, flight, train or stay to a destination",
    poll: "Asking a group to choose between options",
    contact: "Saving a person's name with a phone number or email address",
    link: "Saving a web link or URL, optionally with a note",
    countdown: "Counting the days until a future date, holiday or event",
    timezone: "Converting a time of day between time zones or cities, or asking the time somewhere",
    random: "Asking for a random result: rolling dice, flipping a coin, a random number or letting chance pick",
    goal: "Tracking progress toward a numeric target, such as 4 of 12 books read or money saved",
    note: "Writing a thought, idea or note that is none of the above",
    none: "Too short, unclear or unfinished to tell yet",
  }),
  readiness: score("How complete is this input for what the person is creating", [
    "Just started, key details missing",
    "Partially specified, some details present",
    "Fully specified, ready to act on",
  ]),
  isQuestion: noul("The text is a question rather than an instruction or statement"),
  recurring: noul("The text describes something that repeats on a schedule"),
  urgency: score("How urgent or time-sensitive the text sounds", [
    "Not urgent at all",
    "Somewhat time-sensitive",
    "Urgent, needs attention immediately",
  ]),
  tone: choice("The emotional tone of the text", {
    neutral: "Plain and factual, no clear emotion",
    positive: "Happy, grateful or content",
    excited: "Enthusiastic or looking forward to something",
    stressed: "Worried, frustrated or under pressure",
    reflective: "Thoughtful, calm or introspective",
  }),
  eventMode: choice("How the gathering or meeting would take place", {
    in_person: "Meeting physically at a place",
    video_call: "A video call such as Zoom, Meet or FaceTime",
    phone_call: "A phone call",
    unspecified: "Not mentioned or not a meeting",
  }),
  transport: choice("How the person would travel", {
    flight: "By plane",
    train: "By train",
    bus: "By bus",
    car: "By car or road trip",
    unspecified: "Not mentioned or not about travel",
  }),
  tripType: choice("The purpose of the trip", {
    work: "Work or business travel",
    leisure: "Holiday, vacation or personal visit",
    unspecified: "Not mentioned or not about travel",
  }),
  expenseCategory: choice("What the money was spent on", {
    food: "Food, groceries, restaurants or drinks",
    transport: "Cabs, fuel, tickets or commuting",
    shopping: "Clothes, gadgets or other purchases",
    bills: "Rent, utilities, subscriptions or recharges",
    entertainment: "Movies, events, games or outings",
    health: "Medicine, doctor or fitness",
    other: "Something else or not about spending",
  }),
  colorMood: choice("The feel of the color described", {
    warm: "Reds, oranges, yellows",
    cool: "Blues, greens, purples",
    neutral: "Greys, beiges, off-whites",
    vivid: "Very bright and saturated",
    pastel: "Soft and light",
    dark: "Deep and dark",
  }),
  timerKind: choice("What kind of timer is wanted", {
    countdown: "A plain countdown for a duration",
    focus: "A focus or deep-work session",
    break: "A rest or break",
    stopwatch: "Counting up with no end time",
  }),
  hasExplicitOptions: noul("The text names two or more explicit options to pick between"),
  isShoppingList: noul("The listed items are things to buy"),
};
const QUESTION_COUNT = Object.keys(QUESTIONS).length;

const answer = (a) => ({ value: a.choice, confidence: a.confidence, probabilities: { ...a.probabilities } });

function toIntentResult(res, latencyMs) {
  const a = res.answers;
  return {
    intent: answer(a.intent),
    readiness: a.readiness.score,
    signals: {
      isQuestion: a.isQuestion.noul,
      recurring: a.recurring.noul,
      urgency: { score: a.urgency.score, confidence: a.urgency.confidence },
      tone: answer(a.tone),
      eventMode: answer(a.eventMode),
      transport: answer(a.transport),
      tripType: answer(a.tripType),
      expenseCategory: answer(a.expenseCategory),
      colorMood: answer(a.colorMood),
      timerKind: answer(a.timerKind),
      hasExplicitOptions: a.hasExplicitOptions.noul,
      isShoppingList: a.isShoppingList.noul,
    },
    latencyMs,
    questionCount: QUESTION_COUNT,
    model: String(res.model || MODEL).replace(/^typesafe\//, ""),
    source: "jev",
  };
}

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim());
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const json = (body, status, headers) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, "content-type": "application/json" } });

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim());

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "POST only" }, 405, cors);
    if (!allowed.includes(origin)) return json({ error: "Origin not allowed" }, 403, cors);

    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    if (env.RATE_LIMITER) {
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) return json({ error: "Rate limited" }, 429, cors);
    }

    const body = await request.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : "";
    if (text.length < 2) return json({ error: "Expected { text: string }" }, 400, cors);

    // Same text → same answer. Cache it at the edge so repeat keystrokes are free.
    const cache = caches.default;
    const cacheKey = new Request(`https://jev-cache.internal/${encodeURIComponent(text.toLowerCase())}`);
    const hit = await cache.match(cacheKey);
    if (hit) {
      const cached = await hit.json();
      return json({ ...cached, latencyMs: 0, cached: true }, 200, cors);
    }

    const started = Date.now();
    let res;
    try {
      res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://himanshubhusari.com/jevplayground/",
          "X-OpenRouter-Title": "Jev Playground",
        },
        body: JSON.stringify({ model: MODEL, state: { text }, questions: QUESTIONS }),
        signal: AbortSignal.timeout(4000),
      });
    } catch {
      return json({ error: "Upstream unreachable" }, 502, cors);
    }
    if (!res.ok) return json({ error: `Upstream ${res.status}` }, 502, cors);

    const data = await res.json().catch(() => null);
    if (!data?.answers?.intent) return json({ error: "Bad upstream response" }, 502, cors);

    const result = toIntentResult(data, Date.now() - started);
    ctx.waitUntil(
      cache.put(cacheKey, new Response(JSON.stringify(result), { headers: { "Cache-Control": "max-age=86400" } })),
    );
    return json(result, 200, cors);
  },
};
