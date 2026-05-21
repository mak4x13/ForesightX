import { useCallback, useRef, useState } from "react";

import { simulateStreamUrl } from "../lib/api.js";

const initialAgents = {
  orchestrator: {
    name: "Orchestrator",
    role: "Briefing engine",
    status: "idle",
    text: "",
  },
  optimist: {
    name: "Optimist",
    role: "Best-path mapper",
    status: "idle",
    text: "",
  },
  realist: {
    name: "Realist",
    role: "Likely trajectory",
    status: "idle",
    text: "",
  },
  pessimist: {
    name: "Pessimist",
    role: "Risk cascade",
    status: "idle",
    text: "",
  },
  synthesizer: {
    name: "Synthesizer",
    role: "Probability normalizer",
    status: "idle",
    text: "",
  },
};

export function useSimulation() {
  const sourceRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [agents, setAgents] = useState(initialAgents);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setStatus("idle");
    setAgents(initialAgents);
    setResult(null);
    setProgress(0);
    setError("");
  }, []);

  const applyEvent = useCallback((payload) => {
    if (payload.event === "pipeline_stage") {
      setProgress(payload.progress || 0);
      return;
    }

    if (payload.event === "agent_status") {
      setAgents((current) => ({
        ...current,
        [payload.agent]: {
          ...current[payload.agent],
          status: payload.status,
          message: payload.message || current[payload.agent]?.message || "",
        },
      }));
      return;
    }

    if (payload.event === "agent_output") {
      setAgents((current) => ({
        ...current,
        [payload.agent]: {
          ...current[payload.agent],
          text: `${current[payload.agent]?.text || ""}${payload.chunk || ""}`,
        },
      }));
      return;
    }

    if (payload.event === "error") {
      setAgents((current) => ({
        ...current,
        [payload.agent]: {
          ...(current[payload.agent] || {
            name: payload.agent,
            role: "Pipeline",
            text: "",
          }),
          status: payload.fallback ? "thinking" : "error",
          text: `${current[payload.agent]?.text || ""}\n${payload.message}`,
        },
      }));
      if (!payload.fallback) {
        setError(payload.message);
        setStatus("error");
      }
      return;
    }

    if (payload.event === "simulation_complete") {
      setProgress(100);
      setResult(payload.result);
      setStatus("complete");
      sourceRef.current?.close();
      sourceRef.current = null;
    }
  }, []);

  const startSimulation = useCallback(
    (input) => {
      reset();
      setStatus("running");
      const source = new EventSource(simulateStreamUrl(input));
      sourceRef.current = source;

      source.onmessage = (message) => {
        try {
          applyEvent(JSON.parse(message.data));
        } catch {
          setError("A malformed stream event was received.");
          setStatus("error");
        }
      };

      source.onerror = () => {
        setError("The simulation stream disconnected.");
        setStatus((current) => (current === "complete" ? current : "error"));
        source.close();
      };
    },
    [applyEvent, reset]
  );

  const loadResult = useCallback((savedResult) => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setAgents(
      Object.fromEntries(
        Object.entries(initialAgents).map(([key, agent]) => [
          key,
          { ...agent, status: "done", text: "Loaded from local session history." },
        ])
      )
    );
    setProgress(100);
    setResult(savedResult);
    setStatus("complete");
    setError("");
  }, []);

  return {
    status,
    agents,
    result,
    progress,
    error,
    reset,
    loadResult,
    startSimulation,
  };
}
