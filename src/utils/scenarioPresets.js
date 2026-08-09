export const scenarioPresets = [
  {
    id: "copehill-down",
    name: "Copehill Down Village",
    description: "OP overlooking Copehill Down Village with east/west fixed-wing IPs and southern helicopter BPs.",
    opName: "OP COPEHILL",
    opGrid: "30U WB 71301 73353",
    controlPoints: [
      { type: "ip", name: "WEST", grid: "30U WB 61298 73221" },
      { type: "ip", name: "EAST", grid: "30U WB 81305 73499" },
      { type: "bp", name: "BADGER", grid: "30U WB 68352 69773" },
      { type: "bp", name: "LYNX", grid: "30U WB 74349 69856" },
    ],
  },
  {
    id: "urban-east",
    name: "Urban East",
    description: "OP west of the urban area with two fixed-wing IPs and two helicopter BPs.",
    opName: "OP HAWK",
    opGrid: "30U WB 43508 92788",
    controlPoints: [
      { type: "ip", name: "COD", grid: "30U WB 45508 93788" },
      { type: "ip", name: "DART", grid: "30U WB 41800 94500" },
      { type: "bp", name: "ANVIL", grid: "30U WB 44150 90550" },
      { type: "bp", name: "LION", grid: "30U WB 46200 91800" },
    ],
  },
  {
    id: "northern-valley",
    name: "Northern Valley",
    description: "Elevated OP south of the valley with east/west IPs and concealed BPs.",
    opName: "OP EAGLE",
    opGrid: "30U WB 43150 94950",
    controlPoints: [
      { type: "ip", name: "MACE", grid: "30U WB 39750 95750" },
      { type: "ip", name: "SABRE", grid: "30U WB 46950 95500" },
      { type: "bp", name: "FERRET", grid: "30U WB 42000 93200" },
      { type: "bp", name: "BADGER", grid: "30U WB 45000 93400" },
    ],
  },
  {
    id: "southern-route",
    name: "Southern Route",
    description: "OP overlooking the southern approach with offset IPs and close helicopter BPs.",
    opName: "OP FOX",
    opGrid: "30U WB 44750 90800",
    controlPoints: [
      { type: "ip", name: "PUMA", grid: "30U WB 41000 89750" },
      { type: "ip", name: "VIPER", grid: "30U WB 47800 90250" },
      { type: "bp", name: "COBRA", grid: "30U WB 43000 91900" },
      { type: "bp", name: "LYNX", grid: "30U WB 46000 92050" },
    ],
  },
];

export function getScenarioPreset(scenarioId) {
  return scenarioPresets.find((scenario) => scenario.id === scenarioId) || null;
}
