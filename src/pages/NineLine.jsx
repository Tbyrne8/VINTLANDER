const fields = [
  "IP / BP",
  "Heading",
  "Distance",
  "Target elevation",
  "Target description",
  "Target location",
  "Mark",
  "Friendlies",
  "Egress",
  "Remarks / restrictions",
];

export default function NineLine() {
  return (
    <main className="page">
      <h1>9-Line / TACAM Trainer</h1>

      {fields.map((field, index) => (
        <label key={field} className="field">
          {index + 1}. {field}
          <textarea placeholder={`Enter ${field}`} />
        </label>
      ))}
    </main>
  );
}