export default function Home({
  onNavigate,
  onStartSerial,
  onStartSelfLedSerial,
  onClearTrainingData,
}) {
  return (
    <main className="page">
      <h1>VINTAGE JTAC Trainer</h1>
      <p>Build individual skills, then combine them into full mission training.</p>

      <section className="homeHero card">
        <div>
          <h2>Full Mission Serial</h2>
          <p>
            Run the immersive DS-led exercise flow from situation update through
            check-in, OP placement, target development, 9-line and BDA.
          </p>
        </div>
        <button onClick={onStartSerial}>Start Full Serial</button>
      </section>

      <section className="homeHero card">
        <div>
          <h2>Self-Led Full Serial</h2>
          <p>
            Set the situation, OP and IP/BP grids first, then launch straight
            into an auto-generated aircraft check-in without a live DS.
          </p>
        </div>
        <button onClick={onStartSelfLedSerial}>Start Self-Led Serial</button>
      </section>

      <div className="grid homeLauncherGrid">
        <button className="launcherCard" onClick={() => onNavigate("checkin")}>
          <strong>Check-In</strong>
          <span>Aircraft check-in and platform management.</span>
        </button>

        <button className="launcherCard" onClick={() => onNavigate("map")}>
          <strong>Map Trainer</strong>
          <span>OPs, targets, grids, air picture and ISR feed.</span>
        </button>

        <button className="launcherCard" onClick={() => onNavigate("nine")}>
          <strong>9-Line / TACAM</strong>
          <span>Build and save attack briefs as a standalone drill.</span>
        </button>

        <button className="launcherCard" onClick={() => onNavigate("tacp")}>
          <strong>TACP Training</strong>
          <span>Open the mission trainer without full-screen serial mode.</span>
        </button>
      </div>

      <section className="card clearTrainingCard">
        <div>
          <h2>Reset Training Elements</h2>
          <p>
            Clear checked-in aircraft, OPs, targets, intel injects, attack briefs
            and saved serial logs from this browser.
          </p>
        </div>
        <button className="clearMission" onClick={onClearTrainingData}>
          Clear All Training Data
        </button>
      </section>
    </main>
  );
}
