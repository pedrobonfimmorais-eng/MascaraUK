/**
 * Fixed filter vocabulary for sizes/colors/materials/themes. Real filtering
 * still runs against whatever values the admin actually enters on each
 * product — this list only drives which filter chips/options are offered
 * in the UI, so the filter panel doesn't need an extra "distinct values"
 * query on every page render.
 */
export const sizeOptions = ["P", "M", "G", "GG"];

export const colorOptions = ["Preta", "Vermelha", "Azul", "Dourada", "Prateada", "Verde"];

export const materialOptions = ["Látex", "Tecido", "Resina", "Poliéster", "Couro sintético", "PVC"];

export const themeOptions = ["Heróis", "Anime", "Quadrinhos", "Desenhos", "Cosplay"];

export const priceRangeOptions = [
  { label: "Até R$ 50", min: undefined, max: 50 },
  { label: "R$ 50 a R$ 100", min: 50, max: 100 },
  { label: "R$ 100 a R$ 200", min: 100, max: 200 },
  { label: "Acima de R$ 200", min: 200, max: undefined },
];
