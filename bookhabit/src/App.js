import { useState, useEffect } from "react";

const STORAGE_KEY = "book_habit_tracker_v1";

const sampleBooks = [
  "Atomic Habits", "Deep Work", "The 7 Habits of Highly Effective People",
  "Can't Hurt Me", "The 4-Hour Workweek", "Think and Grow Rich",
  "The Power of Now", "12 Rules for Life", "Mindset", "The Subtle Art of Not Giving a F*ck"
];

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getStreakCount(completions) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split("T")[0];
    if (completions[key] && Object.values(completions[key]).some(Boolean)) {
      streak++;
    } else if (i > 0) break;
  }
  return streak;
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [bookInput, setBookInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [currentBook, setCurrentBook] = useState(null);
  const [habits, setHabits] = useState([]);
  const [principle, setPrinciple] = useState("");
  const [completions, setCompletions] = useState({});
  const [savedData, setSavedData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setSavedData(data);
        setCurrentBook(data.book);
        setHabits(data.habits);
        setPrinciple(data.principle);
        setCompletions(data.completions || {});
        setScreen("tracker");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (bookInput.length > 1) {
      setSuggestions(sampleBooks.filter(b => b.toLowerCase().includes(bookInput.toLowerCase())).slice(0, 4));
    } else {
      setSuggestions([]);
    }
  }, [bookInput]);

  const loadingMessages = [
    "📖 Reading between the lines...",
    "🧠 Extracting golden nuggets...",
    "⚡ Crafting your action plan...",
    "✨ Almost ready..."
  ];

  async function generatePlan(bookTitle) {
    setLoading(true);
    setError("");
    setScreen("loading");
    let msgIdx = 0;
    setLoadingMsg(loadingMessages[0]);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % loadingMessages.length;
      setLoadingMsg(loadingMessages[msgIdx]);
    }, 2000);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a habit coach. For the book "${bookTitle}", generate a practical daily/weekly habit tracker plan.

Respond ONLY with a valid JSON object in this exact format, no markdown, no extra text:
{
  "principle": "One memorable core thesis of the book in 1-2 sentences.",
  "habits": [
    { "id": "1", "title": "Habit title", "description": "Why this habit, tied to the book", "frequency": "daily", "icon": "🔥" },
    { "id": "2", "title": "Habit title", "description": "Why this habit, tied to the book", "frequency": "daily", "icon": "📝" },
    { "id": "3", "title": "Habit title", "description": "Why this habit, tied to the book", "frequency": "daily", "icon": "🎯" },
    { "id": "4", "title": "Habit title", "description": "Why this habit, tied to the book", "frequency": "weekly", "icon": "🧘" },
    { "id": "5", "title": "Habit title", "description": "Why this habit, tied to the book", "frequency": "weekly", "icon": "💡" },
    { "id": "6", "title": "Habit title", "description": "Why this habit, tied to the book", "frequency": "one-time", "icon": "⭐" }
  ]
}

Use relevant emojis. Frequency must be "daily", "weekly", or "one-time". Make habits specific and actionable.`
          }]
        })
      });

      const data = await res.json();
      const text = data.content?.find(b => b.type === "text")?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      clearInterval(interval);
      setCurrentBook(bookTitle);
      setHabits(parsed.habits);
      setPrinciple(parsed.principle);
      const newCompletions = {};
      setSavedData({ book: bookTitle, habits: parsed.habits, principle: parsed.principle, completions: newCompletions });
      setCompletions(newCompletions);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ book: bookTitle, habits: parsed.habits, principle: parsed.principle, completions: newCompletions }));
      setScreen("tracker");
    } catch (e) {
      clearInterval(interval);
      setError("Couldn't generate plan. Try again.");
      setScreen("home");
    } finally {
      setLoading(false);
    }
  }

  function toggleHabit(id) {
    const today = getTodayStr();
    const updated = {
      ...completions,
      [today]: { ...(completions[today] || {}), [id]: !completions[today]?.[id] }
    };
    setCompletions(updated);
    const newData = { ...savedData, completions: updated };
    setSavedData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  }

  function resetApp() {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentBook(null); setHabits([]); setPrinciple(""); setCompletions({});
    setSavedData(null); setBookInput(""); setScreen("home");
  }

  const today = getTodayStr();
  const todayCompletions = completions[today] || {};
  const dailyHabits = habits.filter(h => h.frequency === "daily");
  const weeklyHabits = habits.filter(h => h.frequency === "weekly");
  const onetimeHabits = habits.filter(h => h.frequency === "one-time");
  const streak = getStreakCount(completions);
  const dailyDone = dailyHabits.filter(h => todayCompletions[h.id]).length;
  const progress = dailyHabits.length > 0 ? Math.round((dailyDone / dailyHabits.length) * 100) : 0;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      color: "#f0ece4",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      maxWidth: 430,
      margin: "0 auto",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: -100, left: "50%", transform: "translateX(-50%)",
        width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(196,164,100,0.12) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0
      }} />

      {screen === "loading" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 24, padding: 32 }}>
          <div style={{ fontSize: 48, animation: "spin 2s linear infinite" }}>📚</div>
          <div style={{ fontSize: 16, color: "#c4a464", textAlign: "center", letterSpacing: 1 }}>{loadingMsg}</div>
          <div style={{ width: 120, height: 2, background: "#1e1e28", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#c4a464", animation: "progress 2s ease-in-out infinite", borderRadius: 2 }} />
          </div>
          <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes progress { 0% { width: 0%; } 50% { width: 80%; } 100% { width: 100%; } }
          `}</style>
        </div>
      )}

      {screen === "home" && (
        <div style={{ padding: "60px 24px 40px", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
            <h1 style={{ fontSize: 28, fontWeight: "normal", letterSpacing: 2, color: "#f0ece4", margin: 0, marginBottom: 8 }}>
              BOOKHABIT
            </h1>
            <p style={{ color: "#8a8070", fontSize: 13, letterSpacing: 1, margin: 0 }}>
              Turn books into daily practice
            </p>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, letterSpacing: 2, color: "#8a8070", marginBottom: 8, textTransform: "uppercase" }}>
              Enter a book title
            </label>
            <div style={{ position: "relative" }}>
              <input
                value={bookInput}
                onChange={e => setBookInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && bookInput.trim() && generatePlan(bookInput.trim())}
                placeholder="e.g. Atomic Habits"
                style={{
                  width: "100%", padding: "14px 16px", background: "#14141c",
                  border: "1px solid #2a2a38", borderRadius: 8, color: "#f0ece4",
                  fontSize: 15, fontFamily: "inherit", boxSizing: "border-box", outline: "none"
                }}
              />
            </div>
            {suggestions.length > 0 && (
              <div style={{ background: "#14141c", border: "1px solid #2a2a38", borderRadius: 8, marginTop: 4, overflow: "hidden" }}>
                {suggestions.map(s => (
                  <div key={s} onClick={() => { setBookInput(s); setSuggestions([]); }}
                    style={{ padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #1e1e28", fontSize: 14, color: "#c4a464" }}>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p style={{ color: "#e07070", fontSize: 13, textAlign: "center" }}>{error}</p>}

          <button
            onClick={() => bookInput.trim() && generatePlan(bookInput.trim())}
            disabled={!bookInput.trim()}
            style={{
              width: "100%", padding: "16px", marginTop: 8,
              background: bookInput.trim() ? "linear-gradient(135deg, #c4a464, #a07840)" : "#1e1e28",
              border: "none", borderRadius: 8, color: bookInput.trim() ? "#0a0a0f" : "#4a4a58",
              fontSize: 14, letterSpacing: 2, fontFamily: "inherit", fontWeight: "bold",
              cursor: bookInput.trim() ? "pointer" : "not-allowed", textTransform: "uppercase"
            }}>
            Generate My Plan →
          </button>

          <div style={{ marginTop: 48 }}>
            <p style={{ fontSize: 11, letterSpacing: 2, color: "#4a4a58", textAlign: "center", textTransform: "uppercase", marginBottom: 16 }}>Popular books</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {sampleBooks.slice(0, 6).map(b => (
                <div key={b} onClick={() => { setBookInput(b); setSuggestions([]); }}
                  style={{
                    padding: "6px 12px", background: "#14141c", border: "1px solid #2a2a38",
                    borderRadius: 20, fontSize: 12, color: "#8a8070", cursor: "pointer"
                  }}>
                  {b}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {screen === "tracker" && (
        <div style={{ padding: "0 0 80px", position: "relative", zIndex: 1 }}>
          {/* Header */}
          <div style={{ padding: "40px 24px 20px", borderBottom: "1px solid #1e1e28" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 11, letterSpacing: 2, color: "#8a8070", margin: "0 0 4px", textTransform: "uppercase" }}>Your plan for</p>
                <h2 style={{ fontSize: 20, margin: 0, color: "#c4a464", fontWeight: "normal" }}>{currentBook}</h2>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#c4a464" }}>{streak}</div>
                <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a4a58", textTransform: "uppercase" }}>day streak</div>
              </div>
            </div>

            {/* Core principle */}
            <div style={{ marginTop: 16, padding: "12px 14px", background: "#14141c", borderLeft: "2px solid #c4a464", borderRadius: "0 6px 6px 0" }}>
              <p style={{ fontSize: 13, color: "#a09080", margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>"{principle}"</p>
            </div>

            {/* Daily progress */}
            {dailyHabits.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, letterSpacing: 1, color: "#8a8070", textTransform: "uppercase" }}>Today's progress</span>
                  <span style={{ fontSize: 11, color: "#c4a464" }}>{dailyDone}/{dailyHabits.length}</span>
                </div>
                <div style={{ height: 4, background: "#1e1e28", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #c4a464, #e8c87a)", borderRadius: 2, transition: "width 0.4s ease" }} />
                </div>
              </div>
            )}
          </div>

          {/* Habits */}
          <div style={{ padding: "0 24px" }}>
            {[{ label: "Daily Habits", list: dailyHabits }, { label: "Weekly Habits", list: weeklyHabits }, { label: "One-Time Actions", list: onetimeHabits }]
              .filter(g => g.list.length > 0)
              .map(group => (
                <div key={group.label} style={{ marginTop: 28 }}>
                  <p style={{ fontSize: 10, letterSpacing: 2, color: "#4a4a58", textTransform: "uppercase", marginBottom: 12, margin: "0 0 12px" }}>{group.label}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {group.list.map(h => {
                      const done = todayCompletions[h.id];
                      return (
                        <div key={h.id} onClick={() => toggleHabit(h.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 14,
                            padding: "14px 16px", background: done ? "#14201a" : "#14141c",
                            border: `1px solid ${done ? "#2a4a32" : "#2a2a38"}`,
                            borderRadius: 10, cursor: "pointer", transition: "all 0.2s"
                          }}>
                          <div style={{ fontSize: 22, minWidth: 32, textAlign: "center" }}>{h.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, color: done ? "#6abf7a" : "#f0ece4", textDecoration: done ? "line-through" : "none", marginBottom: 2 }}>
                              {h.title}
                            </div>
                            <div style={{ fontSize: 11, color: "#5a5a68", lineHeight: 1.4 }}>{h.description}</div>
                          </div>
                          <div style={{
                            width: 22, height: 22, borderRadius: "50%", minWidth: 22,
                            border: `2px solid ${done ? "#6abf7a" : "#3a3a48"}`,
                            background: done ? "#6abf7a" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.2s"
                          }}>
                            {done && <span style={{ color: "#0a0a0f", fontSize: 12, fontWeight: "bold" }}>✓</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>

          {/* New book button */}
          <div style={{ padding: "32px 24px 0" }}>
            <button onClick={resetApp} style={{
              width: "100%", padding: "12px", background: "transparent",
              border: "1px solid #2a2a38", borderRadius: 8, color: "#5a5a68",
              fontSize: 12, letterSpacing: 2, fontFamily: "inherit", cursor: "pointer", textTransform: "uppercase"
            }}>
              Start a new book
            </button>
          </div>
        </div>
      )}
    </div>
  );
}