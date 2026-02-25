// All 11 provinces of Mozambique
export const mozambiqueProvinces = [
    { value: "maputo-cidade", label: "Maputo Cidade" },
    { value: "maputo-provincia", label: "Maputo Província" },
    { value: "gaza", label: "Gaza" },
    { value: "inhambane", label: "Inhambane" },
    { value: "sofala", label: "Sofala" },
    { value: "manica", label: "Manica" },
    { value: "tete", label: "Tete" },
    { value: "zambezia", label: "Zambézia" },
    { value: "nampula", label: "Nampula" },
    { value: "niassa", label: "Niassa" },
    { value: "cabo-delgado", label: "Cabo Delgado" },
] as const;

export type MozambiqueProvince = typeof mozambiqueProvinces[number]["value"];
