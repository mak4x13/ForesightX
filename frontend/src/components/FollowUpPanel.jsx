import { ChevronDown, Send } from "lucide-react";
import PropTypes from "prop-types";
import { useState } from "react";

import { followupUrl } from "../lib/api.js";

const MAX_QUESTION_LENGTH = 300;

async function streamFollowup({ question, result, onChunk }) {
  const response = await fetch(followupUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      question,
      simulation_context: result,
      session_id: result.simulation_id,
    }),
  });

  if (!response.ok) {
    throw new Error(`/simulate/followup returned ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() || "";

    for (const block of blocks) {
      const dataLine = block
        .split("\n")
        .find((line) => line.startsWith("data:"));
      if (!dataLine) {
        continue;
      }
      const payload = JSON.parse(dataLine.replace(/^data:\s?/, ""));
      if (payload.event === "analyst_chunk") {
        onChunk(payload.chunk);
      }
      if (payload.event === "error") {
        throw new Error(payload.message);
      }
    }
  }
}

export function FollowUpPanel({ result }) {
  const [question, setQuestion] = useState("");
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const id = crypto.randomUUID();
    setItems((current) => [...current, { id, question: trimmed, answer: "" }]);
    setQuestion("");
    setError("");
    setIsOpen(true);
    setIsLoading(true);

    try {
      await streamFollowup({
        question: trimmed,
        result,
        onChunk: (chunk) => {
          setItems((current) =>
            current.map((item) =>
              item.id === id ? { ...item, answer: `${item.answer}${chunk}` } : item
            )
          );
        },
      });
    } catch (followupError) {
      setError(followupError.message);
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                answer:
                  item.answer ||
                  "The analyst could not complete this follow-up. Try again in a moment.",
              }
            : item
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="shrink-0 rounded-lg border border-border bg-surface/60 p-3 backdrop-blur-xl">
      <form className="grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={submit}>
        <label className="block">
          <input
            className="w-full rounded-md border border-border bg-void/75 px-3 py-2 font-mono text-xs text-textPrimary outline-none transition focus:border-cyan focus:shadow-[0_0_0_3px_rgba(0,212,255,0.12)]"
            maxLength={MAX_QUESTION_LENGTH}
            placeholder="Ask a follow-up about this simulation..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <span className="mt-1 block text-right font-mono text-[0.62rem] text-textMuted">
            {question.length}/{MAX_QUESTION_LENGTH}
          </span>
        </label>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-amber px-4 font-display text-xs font-bold uppercase tracking-[0.18em] text-void transition duration-hover hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading || question.trim().length === 0}
          type="submit"
        >
          Ask
          <Send size={14} />
        </button>
      </form>

      {(items.length > 0 || error) && (
        <section className="mt-2 overflow-hidden rounded-md border border-cyan/40 bg-void/55">
          <button
            className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left"
            type="button"
            onClick={() => setIsOpen((current) => !current)}
          >
            <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-cyan">
              Follow-Up Analysis
            </span>
            <ChevronDown
              className={`text-cyan transition duration-hover ${isOpen ? "rotate-180" : ""}`}
              size={16}
            />
          </button>
          {isOpen && (
            <div className="max-h-32 space-y-3 overflow-y-auto p-3 scrollbar-hidden">
              {items.map((item) => (
                <article key={item.id} className="border-l-2 border-cyan pl-3">
                  <p className="font-ui text-[0.65rem] font-bold uppercase tracking-[0.18em] text-textMuted">
                    {item.question}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap font-mono text-xs leading-5 text-textPrimary">
                    {item.answer || "Analyst is thinking..."}
                  </p>
                </article>
              ))}
              {error && (
                <p className="font-mono text-xs text-pessimist">
                  {error}
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

FollowUpPanel.propTypes = {
  result: PropTypes.object.isRequired,
};
