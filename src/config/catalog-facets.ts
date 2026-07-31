/**
 * Fixed filter vocabulary for sizes/colours/materials/themes. Real filtering
 * still runs against whatever values the admin actually enters on each
 * product — this list only drives which filter chips/options are offered
 * in the UI, so the filter panel doesn't need an extra "distinct values"
 * query on every page render.
 */
export const sizeOptions = ["S", "M", "L", "XL"];

export const colorOptions = ["Black", "Red", "Blue", "Gold", "Silver", "Green"];

export const materialOptions = ["Latex", "Fabric", "Resin", "Polyester", "Synthetic leather", "PVC"];

export const themeOptions = ["Hero-Inspired", "Anime-Inspired", "Comic-Inspired", "Cartoon-Inspired", "Cosplay"];

export const priceRangeOptions = [
  { label: "Up to £50", min: undefined, max: 50 },
  { label: "£50 to £100", min: 50, max: 100 },
  { label: "£100 to £200", min: 100, max: 200 },
  { label: "Over £200", min: 200, max: undefined },
];
