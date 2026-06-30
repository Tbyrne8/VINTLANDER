export default function Home() {
  return (
    <main className="page">
      <h1>VINTAGE JTAC Trainer</h1>
      <p>Build individual skills, then combine them into full mission training.</p>

      <div className="grid">
        <div className="card">
          <h2>Training Centre</h2>
          <p>Practise check-ins, map reading, 9-lines, ISR and target work as standalone drills.</p>
        </div>

        <div className="card">
          <h2>Mission Workstation</h2>
          <p>Run a full CAS serial with check-in, air picture, targets, ISR, 9-line and BDA.</p>
        </div>

        <div className="card">
          <h2>Training Record</h2>
          <p>Scores, attempts, weak areas and progress tracking. Coming later.</p>
        </div>
      </div>
    </main>
  );
}
