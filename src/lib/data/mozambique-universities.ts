// Universities and higher education institutions in Mozambique
export const mozambiqueUniversities = [
    // Public Universities
    { value: "uem", label: "Universidade Eduardo Mondlane (UEM)" },
    { value: "up", label: "Universidade Pedagógica (UP)" },
    { value: "unizambeze", label: "Universidade Zambeze (UniZambeze)" },
    { value: "unilúrio", label: "Universidade Lúrio (UniLúrio)" },
    { value: "unitiva", label: "Universidade Save (UniSave)" },

    // Private Universities
    { value: "ucm", label: "Universidade Católica de Moçambique (UCM)" },
    { value: "ustm", label: "Universidade São Tomás de Moçambique (USTM)" },
    { value: "unirovuma", label: "Universidade Rovuma (UniRovuma)" },
    { value: "isarc", label: "Instituto Superior de Artes e Cultura (ISArC)" },
    { value: "isctem", label: "Instituto Superior de Ciências e Tecnologia de Moçambique (ISCTEM)" },
    { value: "isutc", label: "Instituto Superior de Transportes e Comunicações (ISUTC)" },
    { value: "isri", label: "Instituto Superior de Relações Internacionais (ISRI)" },
    { value: "acipol", label: "Academia de Ciências Policiais (ACIPOL)" },
    { value: "iscisa", label: "Instituto Superior de Ciências de Saúde (ISCISA)" },
    { value: "ispu", label: "Instituto Superior Politécnico e Universitário (ISPU)" },
    { value: "isgecof", label: "Instituto Superior de Gestão, Comércio e Finanças (ISGECOF)" },
    { value: "isctac", label: "Instituto Superior de Ciência e Tecnologia Alberto Chipande (ISCTAC)" },
    { value: "umbb", label: "Universidade Mussa Bin Bique (UMBB)" },
    { value: "unigranfic", label: "Universidade Técnica de Moçambique (UDM)" },
    { value: "ujc", label: "Universidade Joaquim Chissano (UJC)" },
    { value: "uniluanda", label: "Universidade Nachingwea (UN)" },
    { value: "ism", label: "Instituto Superior Monitor (ISM)" },
    { value: "ismma", label: "Instituto Superior Maria Mães de África (ISMMA)" },
    { value: "iscim", label: "Instituto Superior de Comunicação e Imagem de Moçambique (ISCIM)" },
    { value: "isc", label: "Instituto Superior de Contabilidade (ISC)" },
    { value: "eseg", label: "Escola Superior de Economia e Gestão (ESEG)" },
    { value: "ispt", label: "Instituto Superior Politécnico de Tete (ISPT)" },
    { value: "ispg", label: "Instituto Superior Politécnico de Gaza (ISPG)" },
    { value: "isps", label: "Instituto Superior Politécnico de Songo (ISPS)" },
    { value: "ispn", label: "Instituto Superior Politécnico de Nampula" },
    { value: "upmap", label: "Universidade Politécnica (A Politécnica)" },
    { value: "ises", label: "Instituto Superior de Estudos de Defesa (ISEDEF)" },
    { value: "am", label: "Academia Militar Marechal Samora Machel" },

    // Other option
    { value: "outro", label: "Outra" },
] as const;

export type MozambiqueUniversity = typeof mozambiqueUniversities[number]["value"];
