export const enemyUnitTypes = [
  { value: "infantry", label: "Infantry" },
  { value: "mechanized-infantry", label: "Mechanized Infantry" },
  { value: "armour", label: "Armour" },
  { value: "artillery", label: "Artillery" },
  { value: "reconnaissance", label: "Reconnaissance" },
  { value: "air-defence", label: "Air Defence" },
  { value: "engineer", label: "Engineer" },
  { value: "special-forces", label: "Special Forces" },
];

export function getEnemyUnitLabel(value) {
  return (
    enemyUnitTypes.find((unitType) => unitType.value === value)?.label ||
    "Infantry"
  );
}
