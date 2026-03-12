import WebApp from "@twa-dev/sdk";
import { useEffect, useMemo, useState } from "react";

type Topic = "javascript" | "typescript" | "react";

const topics: { id: Topic; title: string }[] = [
  { id: "javascript", title: "JavaScript" },
  { id: "typescript", title: "TypeScript" },
  { id: "react", title: "React" },
];

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

export default function App() {
  const initData = useMemo(() => WebApp.initData, []);
  const [userId, setUserId] = useState<string | null>(null);
  const [topic, setTopic] = useState<Topic>("javascript");
  const [question, setQuestion] = useState<{ id: string; topic: string; text: string } | null>(null);
  const [answer, setAnswer] = useState<{ answer: string } | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [selfScore, setSelfScore] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
  }, []);

  useEffect(() => {
    // MVP: просто регаем/апдейтим пользователя и сохраняем userId локально.
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/telegram`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ initData }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { user: { id: string } };
        setUserId(data.user.id);
      } catch {
        // ignore
      }
    })();
  }, [initData]);

  async function loadNextQuestion() {
    setStatus("Загружаю вопрос...");
    setShowAnswer(false);
    setAnswer(null);
    setUserAnswer("");

    const res = await fetch(`${API_BASE}/questions?topic=${encodeURIComponent(topic)}&limit=1`);
    if (!res.ok) {
      setStatus("Не удалось загрузить вопросы (API недоступен?)");
      return;
    }
    const data = (await res.json()) as { items: Array<{ id: string; topic: string; text: string }> };
    const q = data.items[0];
    if (!q) {
      setStatus("Пока нет вопросов по теме");
      setQuestion(null);
      return;
    }
    setQuestion(q);
    setStatus("");
  }

  async function revealAnswer() {
    if (!question) return;
    setStatus("Загружаю ответ...");
    const res = await fetch(`${API_BASE}/questions/${question.id}`);
    if (!res.ok) {
      setStatus("Не удалось загрузить ответ");
      return;
    }
    const data = (await res.json()) as { answer: string };
    setAnswer({ answer: data.answer });
    setShowAnswer(true);
    setStatus("");
  }

  async function saveAttempt() {
    if (!question) return;
    setStatus("Сохраняю попытку...");
    const res = await fetch(`${API_BASE}/attempts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        initData,
        questionId: question.id,
        userAnswer,
        selfScore,
      }),
    });
    if (!res.ok) {
      setStatus("Не удалось сохранить (возможно, API/БД не подняты)");
      return;
    }
    setStatus("Сохранено");
    setTimeout(() => setStatus(""), 800);
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <div className="title">Interview Prep</div>
          <div className="subtitle">JS / TS / React — практика вопросов</div>
        </div>
        <div className="pill">{userId ? "Авторизован" : "Офлайн"}</div>
      </header>

      <section className="card">
        <div className="row">
          <label className="label">Тема</label>
          <select className="select" value={topic} onChange={(e) => setTopic(e.target.value as Topic)}>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <button className="btn" onClick={loadNextQuestion}>
            Следующий вопрос
          </button>
        </div>

        {status ? <div className="status">{status}</div> : null}

        {question ? (
          <>
            <div className="question">{question.text}</div>

            <label className="label">Твой ответ</label>
            <textarea
              className="textarea"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Напиши своими словами..."
              rows={6}
            />

            <div className="row">
              <label className="label">Самооценка</label>
              <select
                className="select"
                value={selfScore}
                onChange={(e) => setSelfScore(Number(e.target.value) as any)}
              >
                <option value={1}>1 — не знаю</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5 — уверен</option>
              </select>
              <button className="btnSecondary" onClick={saveAttempt} disabled={!userAnswer.trim()}>
                Сохранить
              </button>
              <button className="btnGhost" onClick={revealAnswer}>
                Показать эталон
              </button>
            </div>

            {showAnswer && answer ? (
              <div className="answer">
                <div className="label">Эталонный ответ</div>
                <pre className="pre">{answer.answer.trim()}</pre>
              </div>
            ) : null}
          </>
        ) : (
          <div className="hint">Выбери тему и нажми «Следующий вопрос»</div>
        )}
      </section>
    </div>
  );
}

