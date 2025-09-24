import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Vocab.css";

type VocabWord = {
  id: number;
  word: string;
  meaning: string;
  example?: string;
  known: boolean;
  createdAt?: string;
};

type ApiError = { message?: string };

// ✅ 항상 Headers 객체를 반환 (타입 에러 해결)
const authHeaders = (): Headers => {
  const h = new Headers();
  const t = localStorage.getItem("token");
  if (t) h.set("Authorization", `Bearer ${t}`);

  const email = localStorage.getItem("email");
  if (email) h.set("X-Email", email);

  return h;
};

// JSON 요청용 헤더 (Content-Type 추가)
const jsonHeaders = (): Headers => {
  const h = authHeaders();
  h.set("Content-Type", "application/json");
  return h;
};

async function fetchJSON<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (res.ok) return (await res.json()) as T;

  let errMsg = `HTTP ${res.status}`;
  try {
    const data = (await res.json()) as ApiError;
    if (data?.message) errMsg = data.message;
  } catch {
    try {
      const txt = await res.text();
      if (txt) errMsg = txt;
    } catch {}
  }
  const e = new Error(errMsg) as Error & { status?: number };
  e.status = res.status;
  throw e;
}

export default function Vocab() {
  const nav = useNavigate();

  const [words, setWords] = useState<VocabWord[]>([]);
  const [newWord, setNewWord] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [newExample, setNewExample] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 초기 로드
  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("token");
      const email = localStorage.getItem("email");   // ★ 추가
      if (!token || !email) {                        // ★ 추가
        setLoading(false);
        nav("/login");
        return;
      }
      try {
        const data = await fetchJSON<VocabWord[]>("/api/vocab", {
          headers: authHeaders(),
        });
        setWords(data);
      } catch (e: any) {
        if (e?.status === 401) nav("/login");
        else setError(e?.message || "단어 목록을 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  const resetForm = () => {
    setNewWord("");
    setNewMeaning("");
    setNewExample("");
  };

  const onAdd = async () => {
    const w = newWord.trim();
    const m = newMeaning.trim();
    const ex = newExample.trim();
    if (!w || !m) {
      setError("단어와 뜻을 입력해 주세요.");
      return;
    }
    setError(null);
    try {
      const created = await fetchJSON<VocabWord>("/api/vocab", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ word: w, meaning: m, example: ex }),
      });
      setWords((prev) => [created, ...prev]);
      resetForm();
    } catch (e: any) {
      if (e?.status === 401) nav("/login");
      else setError(e?.message || "저장에 실패했습니다.");
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAdd();
    }
  };

  const toggleKnown = async (index: number) => {
    const item = words[index];
    try {
      const updated = await fetchJSON<VocabWord>(`/api/vocab/${item.id}`, {
        method: "PATCH",
        headers: jsonHeaders(),
        body: JSON.stringify({ known: !item.known }),
      });
      setWords((prev) => prev.map((w, i) => (i === index ? updated : w)));
    } catch (e: any) {
      if (e?.status === 401) nav("/login");
      else setError(e?.message || "체크 상태 변경에 실패했습니다.");
    }
  };

  const onDelete = async (index: number) => {
    const id = words[index].id;
    try {
      const r = await fetch(`/api/vocab/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!r.ok) {
        let msg = `HTTP ${r.status}`;
        try {
          const j = (await r.json()) as ApiError;
          if (j?.message) msg = j.message;
        } catch {}
        const e = new Error(msg) as Error & { status?: number };
        e.status = r.status;
        throw e;
      }
      setWords((prev) => prev.filter((_, i) => i !== index));
    } catch (e: any) {
      if (e?.status === 401) nav("/login");
      else setError(e?.message || "삭제에 실패했습니다.");
    }
  };

  return (
    <div className="vocab-container">
      <div className="vocab-box">
        <div className="vocab-header">
          <button className="back-button" onClick={() => nav("/home")}>
            &lt;
          </button>
          <h2>📚 단어장</h2>
        </div>

        {/* 입력 폼 */}
        <div className="vocab-form">
          <input
            className="vocab-input"
            placeholder="단어 (예: appreciate)"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <input
            className="vocab-input"
            placeholder="뜻 (예: 고맙게 여기다)"
            value={newMeaning}
            onChange={(e) => setNewMeaning(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <input
            className="vocab-input"
            placeholder="예문 (선택)"
            value={newExample}
            onChange={(e) => setNewExample(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button className="add-btn" onClick={onAdd}>
            추가
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}
        {loading ? (
          <p>불러오는 중…</p>
        ) : words.length === 0 ? (
          <p>저장된 단어가 없습니다.</p>
        ) : (
          <ul className="vocab-list">
            {words.map((w, i) => (
              <li key={w.id} className={`vocab-item ${w.known ? "known" : ""}`}>
                <div className="vocab-top-row">
                  <h3>{w.word}</h3>
                  <div className="vocab-actions">
                    <label>
                      <input
                        type="checkbox"
                        checked={w.known}
                        onChange={() => toggleKnown(i)}
                      />
                      <span className="checkbox-label">아는 단어</span>
                    </label>
                    <button className="delete-btn" onClick={() => onDelete(i)}>
                      삭제
                    </button>
                  </div>
                </div>
                <p>📖 뜻: {w.meaning}</p>
                {w.example && <p>✏️ 예문: {w.example}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
