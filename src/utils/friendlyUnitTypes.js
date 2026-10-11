export const friendlyUnitTypes = [
  { value: "infantry", label: "Infantry" },
  { value: "armour", label: "Armour" },
  { value: "artillery", label: "Artillery" },
  { value: "reconnaissance", label: "Reconnaissance" },
  { value: "air-defence", label: "Air Defence" },
  { value: "tacp", label: "TACP" },
];

export function getFriendlyUnitLabel(value) {
  return (
    friendlyUnitTypes.find((unitType) => unitType.value === value)?.label ||
    "Infantry"
  );
}
