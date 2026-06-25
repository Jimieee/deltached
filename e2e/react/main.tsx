import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useDeltached } from "@deltached/react";
import { exposeTestHandle } from "../shared/handle";

function App() {
  const { sourceRef, targetRef, enter, leave, controller } = useDeltached();

  useEffect(() => {
    if (controller) exposeTestHandle(controller);
  }, [controller]);

  return (
    <>
      <button
        id="trigger"
        type="button"
        ref={sourceRef}
        onClick={() => void enter()}
      >
        Open
      </button>

      <div id="panel" ref={targetRef}>
        <button data-close type="button" onClick={() => void leave()}>
          Close
        </button>
        <h2>Panel</h2>
      </div>
    </>
  );
}

createRoot(document.getElementById("app")!).render(<App />);
