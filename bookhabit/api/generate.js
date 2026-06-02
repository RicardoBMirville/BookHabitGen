export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { bookTitle } = req.body;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
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

  const data = await response.json();
  res.status(200).json(data);
}
