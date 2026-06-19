export type Tdata = {
    name: string;
    url: string;
    id: string;
    types: string[];
};

export type TypePokemon = {
    types: {
        slot: number,
        type: {
            name: string,
            url: string
        }
    }[];
}
export const getPokemonId = (url: string) => {
    const parts = url.split('/').filter(Boolean);
    return parts[parts.length - 1];
};