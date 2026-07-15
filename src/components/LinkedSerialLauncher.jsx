import { useState } from "react";
import { linkedModeConfigured } from "../utils/linkedSession.js";

export default function LinkedSerialLauncher({ onCreate, onJoin, busy, error }) {
  const [code, setCode] = useState("");

  return (
    <section className="card linkedSerialLauncher">
      <div>
        <small>Optional two-laptop mode</small>
        <h2>Linked DS Serial</h2>
        <p>
          Create the serial on the trainee laptop, then enter its six-character
          code on the DS laptop. The existing solo modes remain unchanged.
        </p>
        {!linkedModeConfigured && (
          <p className="linkedError">
            Linked mode needs its Firebase website settings added before first use.
          </p>
        )}
        {error && <p className="linkedError">{error}</p>}
      </div>
      <div className="linkedSerialActions">
        <button disabled={busy || !linkedModeConfigured} onClick={onCreate}>
          Create as Trainee
        </button>
        <span>or</span>
        <input
          aria-label="Linked serial code"
          maxLength="6"
          placeholder="ABC234"
          value={code}
          onChange={(event) =>
            setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
          }
        />
        <button
          disabled={busy || code.length !== 6 || !linkedModeConfigured}
          onClick={() => onJoin(code)}
        >
          Join as DS
        </button>
      </div>
    </section>
  );
}
