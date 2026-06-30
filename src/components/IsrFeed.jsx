import { useState } from "react";
import * as mgrs from "mgrs";

export default function IsrFeed({ position, targets }) {
  const [open, setOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  const correctCode = "VINTAGE";

  const currentMgrs = mgrs
    .forward([position.lng, position.lat])
    .replace(/^(\d{1,2}[A-Z])([A-Z]{2})(\d{5})(\d{5})$/, "$1 $2 $3 $4");

  function unlockFeed() {
    if (accessCode.trim().toUpperCase() === correctCode) {
      setUnlocked(true);
    } else {
      alert("Incorrect ISR access code.");
    }
  }

  return (
    <div className={`vdlWindow ${open ? "open" : "closed"}`}>
      <button className="vdlHeader" onClick={() => setOpen(!open)}>
        <span>ISR FEED</span>
        <strong>{open ? "MINIMISE" : "OPEN"}</strong>
      </button>

      {open && (
        <div className="vdlBody">
          {!unlocked ? (
            <div className="vdlLocked">
              <h3>ACCESS REQUIRED</h3>
              <p>Enter downlink code from aircraft check-in.</p>

              <input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="Downlink code"
              />

              <button onClick={unlockFeed}>Unlock ISR Feed</button>
            </div>
          ) : (
            <>
              <div className="vdlFeed">
                <div className="vdlReticle"></div>
                <div className="vdlAircraftOrbit">ISR</div>
              </div>

              <div className="vdlData">
                <div>
                  <span>GRID</span>
                  <strong>{currentMgrs}</strong>
                </div>

                <div>
                  <span>PLATFORM</span>
                  <strong>REAPER 11</strong>
                </div>

                <div>
                  <span>ORBIT</span>
                  <strong>CIRCLE</strong>
                </div>

                <div>
                  <span>TRACKS</span>
                  <strong>{targets.length}</strong>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
