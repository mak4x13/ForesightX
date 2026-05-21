import html2canvas from "html2canvas";
import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";

import { whatIfUrl } from "../lib/api.js";
import { FollowUpPanel } from "./FollowUpPanel.jsx";
import { ShareSnapshot } from "./ShareSnapshot.jsx";
import { TimelineCard } from "./TimelineCard.jsx";

async function streamWhatIf({ modification, result, onComplete }) {
  const response = await fetch(whatIfUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      modification,
      original_briefing: result.meta?.briefing || { context: result.input },
      session_id: result.simulation_id,
    }),
  });

  if (!response.ok) {
    throw new Error(`/simulate/whatif returned ${response.status}`);
  }
  if (!response.body) {
    throw new Error("What-if stream did not open.");
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
      if (payload.event === "whatif_complete") {
        onComplete(payload.result);
      }
      if (payload.event === "error") {
        throw new Error(payload.message);
      }
    }
  }
}

export function TimelineResults({ result = null, onAgain }) {
  const [displayResult, setDisplayResult] = useState(result);
  const [openWhatIf, setOpenWhatIf] = useState(null);
  const [updatingVariant, setUpdatingVariant] = useState(null);
  const [modifiedLabels, setModifiedLabels] = useState({});
  const [whatIfError, setWhatIfError] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const snapshotRef = useRef(null);

  useEffect(() => {
    setDisplayResult(result);
    setOpenWhatIf(null);
    setUpdatingVariant(null);
    setModifiedLabels({});
    setWhatIfError("");
  }, [result]);

  if (!displayResult) {
    return null;
  }

  const submitWhatIf = async (variant, modification) => {
    if (updatingVariant) {
      return;
    }
    setUpdatingVariant(variant);
    setWhatIfError("");
    try {
      await streamWhatIf({
        modification,
        result: displayResult,
        onComplete: (updatedResult) => {
          setDisplayResult(updatedResult);
          setModifiedLabels({ [variant]: modification });
        },
      });
      setOpenWhatIf(null);
    } catch (error) {
      setWhatIfError(error.message || "What-if rerun failed.");
    } finally {
      setUpdatingVariant(null);
    }
  };

  const shareSimulation = async () => {
    if (!snapshotRef.current || isSharing) {
      return;
    }
    setIsSharing(true);
    try {
      const canvas = await html2canvas(snapshotRef.current, {
        backgroundColor: "#050810",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = "foresightx-simulation.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col pt-3 lg:overflow-hidden">
      <ShareSnapshot ref={snapshotRef} result={displayResult} />
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-3 lg:overflow-hidden">
        <TimelineCard
          delay={0}
          isUpdating={updatingVariant === "optimistic"}
          isWhatIfOpen={openWhatIf === "optimistic"}
          modifiedLabel={modifiedLabels.optimistic}
          outcome={displayResult.outcomes.optimistic}
          variant="optimistic"
          onOpenWhatIf={setOpenWhatIf}
          onSubmitWhatIf={submitWhatIf}
        />
        <TimelineCard
          delay={150}
          isUpdating={updatingVariant === "realistic"}
          isWhatIfOpen={openWhatIf === "realistic"}
          modifiedLabel={modifiedLabels.realistic}
          outcome={displayResult.outcomes.realistic}
          variant="realistic"
          onOpenWhatIf={setOpenWhatIf}
          onSubmitWhatIf={submitWhatIf}
        />
        <TimelineCard
          delay={300}
          isUpdating={updatingVariant === "pessimistic"}
          isWhatIfOpen={openWhatIf === "pessimistic"}
          modifiedLabel={modifiedLabels.pessimistic}
          outcome={displayResult.outcomes.pessimistic}
          variant="pessimistic"
          onOpenWhatIf={setOpenWhatIf}
          onSubmitWhatIf={submitWhatIf}
        />
      </div>
      {whatIfError && (
        <p className="mt-2 rounded-md border border-pessimist/60 bg-pessimist/10 px-3 py-2 font-mono text-xs text-pessimist">
          {whatIfError}
        </p>
      )}
      <div className="pt-3">
        <FollowUpPanel result={displayResult} />
      </div>
      <div className="flex shrink-0 flex-wrap justify-center gap-3 py-3">
        <button
          className="rounded-md bg-amber px-5 py-3 font-display text-xs font-bold uppercase tracking-[0.2em] text-void transition duration-hover hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(245,166,35,0.4)]"
          type="button"
          onClick={onAgain}
        >
          Simulate Again
        </button>
        <button
          className="rounded-md border border-cyan px-5 py-3 font-display text-xs font-bold uppercase tracking-[0.2em] text-cyan transition duration-hover hover:scale-[1.03] hover:bg-cyan/10 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSharing}
          type="button"
          onClick={shareSimulation}
        >
          {isSharing ? "Rendering" : "Share"}
        </button>
      </div>
    </section>
  );
}

TimelineResults.propTypes = {
  onAgain: PropTypes.func.isRequired,
  result: PropTypes.object,
};
