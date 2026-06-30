import { useEffect, useState } from "react";
import * as mgrs from "mgrs";

export default function IsrFeed({ position, targets, platforms }) {
  const [open, setOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [unlockedPlatform, setUnlockedPlatform] = useState(null);

  const currentMgrs = mgrs
    .forward([position.lng, position.lat])
    .replace(/^(\d{1,2}[A-Z])([A-Z]{2})(\d{5})(\d{5})$/, "$1 $2 $3 $4");

  useEffect(() => {
    if (
      unlockedPlatform &&
      !platforms.some((platform) => platform.id === unlockedPlatform.id)
    ) {
      setUnlockedPlatform(null);
      setAccessCode("");
    }
  }, [platforms, unlockedPlatform]);

  function unlockFeed() {
    const enteredCode = accessCode.trim();
    const platform = platforms.find(
      (item) => item.downlinkCode === enteredCode
    );

    if (platform) {
      setUnlockedPlatform(platform);
      return;
    }

    alert("No checked-in aircraft matches that downlink code.");
  }

  return (
    <div className={`vdlWindow ${open ? "open" : "closed"}`}>
      <button className="vdlHeader" onClick={() => setOpen(!open)}>
        <span>ISR FEED</span>
        <strong>{open ? "MINIMISE" : "OPEN"}</strong>
      </button>

      {open && (
        <div className="vdlBody">
          {!unlockedPlatform ? (
            <div className="vdlLocked">
              <h3>ACCESS REQUIRED</h3>
              <p>Enter the downlink code from a checked-in aircraft.</p>

              <input
                value={accessCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "");
                  if (value.length <= 4) {
                    setAccessCode(value);
                  }
                }}
                placeholder="4-digit downlink code"
              />

              <button onClick={unlockFeed}>Unlock ISR Feed</button>

              {platforms.length === 0 && (
                <p className="emptyText">No aircraft are checked in yet.</p>
              )}
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
                  <strong>{unlockedPlatform.callsign}</strong>
                </div>

                <div>
                  <span>AIRCRAFT</span>
                  <strong>{unlockedPlatform.aircraft}</strong>
                </div>

                <div>
                  <span>CAPABILITY</span>
                  <strong>{unlockedPlatform.capabilities}</strong>
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
