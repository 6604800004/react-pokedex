import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { getPokemonId, type Tdata } from "../data/pokemonData";

const VARIETY_OK = (name: string, isDefault: boolean) =>
  isDefault ||
  name.includes("-mega") ||
  name.includes("-gmax") ||
  name.includes("-galar") ||
  (name.includes("-alola") && !name.includes("-totem") && !name.includes("-cap"));

const filterByKeyword = (list: Tdata[], kw: string) => {
  const k = kw.toLowerCase().trim();
  if (!k) return list;
  return list.filter(
    (p) =>
      p.id.padStart(4, "0").includes(k) ||
      p.name.toLowerCase().includes(k) ||
      p.types.some((t) => t.toLowerCase().includes(k))
  );
};

const mergeData = (prev: Tdata[], incoming: Tdata[]) => {
  const map = new Map(prev.map((p) => [p.name, p]));
  incoming.forEach((p) => !map.has(p.name) && map.set(p.name, p));
  return [...map.values()].sort((a, b) => +a.id - +b.id);
};

const fetchBatch = async (offset: number) => {
  const list = await fetch(
    `https://pokeapi.co/api/v2/pokemon-species?limit=20&offset=${offset}`
  ).then((r) => r.json());

  const allSpecies = await Promise.all(
    list.results.map((s: { url: string }) => fetch(s.url).then((r) => r.json()))
  );

  const entries = allSpecies.flatMap((s, i) =>
    s.varieties
      .filter((v: { pokemon: { name: string }; is_default: boolean }) =>
        VARIETY_OK(v.pokemon.name, v.is_default) && !v.pokemon.name.includes("raichu-mega")
      )
      .map((v: { pokemon: { name: string; url: string } }) => ({
        name: v.pokemon.name,
        url: v.pokemon.url,
        speciesUrl: list.results[i].url,
      }))
  );

  const newData = await Promise.all(
    entries.map((e: { name: string; url: string; speciesUrl: string }) =>
      fetch(e.url)
        .then((r) => r.json())
        .then((p) => ({
          name: e.name,
          url: e.url,
          id: getPokemonId(e.speciesUrl),
          types: p.types.map((t: { type: { name: string } }) => t.type.name),
        }))
    )
  );

  return { newData, hasNext: !!list.next };
};

function PokemonList() {
  const nav = useNavigate();
  const [data, setData] = useState<Tdata[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [visibleCount, setVisibleCount] = useState(16);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);
  const offsetRef = useRef(0);
  const isFetching = useRef(false);
  const dataRef = useRef<Tdata[]>([]);

  const filteredData = useMemo(
    () => filterByKeyword(data, searchKeyword),
    [data, searchKeyword]
  );
  const visibleData = useMemo(
    () => filteredData.slice(0, visibleCount),
    [filteredData, visibleCount]
  );
  const hasMoreCached = visibleCount < filteredData.length;
  const showLoadMore = !loading && (hasMoreCached || hasMore);

  const withFetch = async (fn: () => Promise<void>) => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    try { await fn(); } catch (e) { console.error(e); } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  const applyBatch = (merged: Tdata[], hasNext: boolean) => {
    if (!hasNext) setHasMore(false);
    dataRef.current = merged;
    setData([...merged]);
  };

  const fetchSpecies = (offset: number) =>
    withFetch(async () => {
      const { newData, hasNext } = await fetchBatch(offset);
      offsetRef.current = offset;
      applyBatch(mergeData(dataRef.current, newData), hasNext);
    });

  const fetchUntilEnough = (keyword: string, needed: number) =>
    withFetch(async () => {
      let cur = [...dataRef.current];
      while (filterByKeyword(cur, keyword).length < needed) {
        const next = offsetRef.current + 20;
        const { newData, hasNext } = await fetchBatch(next);
        offsetRef.current = next;
        cur = mergeData(cur, newData);
        applyBatch(cur, hasNext);
        if (!hasNext) break;
      }
    });

  const handleSearch = () => {
    const kw = inputText.trim();
    if (kw === searchKeyword) return;
    setSearchKeyword(kw);
    setVisibleCount(16);
    if (kw && filterByKeyword(dataRef.current, kw).length < 16)
      fetchUntilEnough(kw, 16);
  };

  const loadMore = () => {
    if (loading || isFetching.current) return;
    const next = visibleCount + 16;
    if (searchKeyword) {
      if (filteredData.length >= next || !hasMore) setVisibleCount(next);
      else fetchUntilEnough(searchKeyword, next).then(() => setVisibleCount(next));
    } else {
      if (hasMoreCached) setVisibleCount(next);
      else if (hasMore) fetchSpecies(offsetRef.current + 20).then(() => setVisibleCount(next));
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchSpecies(0);
  }, []);

  return (
    <>
      <header className="flex items-center justify-center min-h-[60px] bg-white">
        <div className="logo__" />
      </header>

      <div className="bg-[#1b252f]">
        <div className="relative max-w-[1400px] mx-auto">

          <div className="relative">
            <div className="absolute cursor-pointer top-10 left-1/2 -translate-x-1/2 text-[28px] text-black z-10 whitespace-nowrap px-[200px]">
              โปเกเด็กซ์
            </div>

            <img
              src="https://th.portal-pokemon.com/play/resources/pokedex/img/list_top_bg.jpg"
              alt="Pokedex banner"
              className="w-full block"
            />

            <img
              src="https://th.portal-pokemon.com/play/resources/pokedex/img/pokedex_bg.png"
              className="absolute inset-0 w-auto h-auto object-cover object-center pointer-events-none select-none"
              aria-hidden="true"
            />

            <div className="absolute bottom-[150px] left-[150px] right-10 z-10">
              <div className="search-panel absolute">
                <img
  src="https://th.portal-pokemon.com/play/resources/pokedex/img/random_center_bg.png"
  className="absolute bottom-0 left-[550px] -translate-x-1/2 w-[250px] h-[550px] object-contain pointer-events-none select-none z-10"
  aria-hidden="true"
/>
                <p className="text-[#b3eafe] text-xl pb-4 pl-1 [filter:drop-shadow(0_0_5px_#fdfdfd)]">
                  ค้นหาด้วยชื่อ หรือ หมายเลขโปเกเด็กซ์
                </p>
                <div className="flex rounded-full overflow-hidden bg-white shadow-lg [filter:drop-shadow(0_0_2px_#fdfdfd)]">
                  <input
                    type="text"
                    value={inputText}
                    className="search-input flex-1 min-w-0 py-2 pl-[90px] pr-[245px] text-[22px] border-none outline-none bg-white"
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") handleSearch(); }}
                  />
                  <button
                    onClick={handleSearch}
                    className="flex items-center justify-center w-[100px] bg-[#b3eafe] border-none cursor-pointer shrink-0 hover:bg-[#8fd8f8] transition-colors"
                  >
                    <img
                      src="https://th.portal-pokemon.com/play/resources/pokedex/img/icon_magnifying_glass.png"
                      alt="search"
                      className="w-7 h-7 object-contain"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="list-section-bg max-w-[1400px] w-full mx-auto px-10 pt-5 pb-10 min-h-screen">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 font-[Noto_Sans,Arial,sans-serif]">
            {visibleData.map((pokemon) => (
              <div
                key={pokemon.name}
                onClick={() => nav(`/PokeDex/${getPokemonId(pokemon.url).padStart(4, "0")}`)}
                className="pokemon-card-bg flex flex-col items-center cursor-pointer overflow-hidden relative rounded-lg"
                style={{ aspectRatio: "2 / 3" }}
              >
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${getPokemonId(pokemon.url)}.png`}
                  alt={pokemon.name}
                  className="w-[60%] h-[60%] object-contain p-[5px] [filter:drop-shadow(0_0_1.5px_#fdfdfd)]"
                />
                <div className="flex flex-col w-[75%] gap-2 flex-1 font-semibold">
                  <span className="text-[#b3eafe] text-[18px]">{pokemon.id.padStart(4, "0")}</span>
                  <span className="font-bold text-[22px] text-white leading-tight whitespace-pre-line">
                    {pokemon.name.toUpperCase().replace(/-/, "\n").replace(/-/g, " ")}
                  </span>
                </div>
                <div className="absolute bottom-[8%] left-10 right-10 z-10 flex gap-3">
                  {pokemon.types.map((type) => (
                    <span key={type} className={`type type--${type}`}>{type}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center w-full max-w-[600px] h-20 mx-auto my-5">
            {loading ? (
              <div className="loading-gif w-16 h-16" />
            ) : (
              showLoadMore && (
                <button
                  onClick={loadMore}
                  className="load-more-btn w-full h-[75px] text-[#b3eafe] cursor-pointer [text-shadow:0_0_5px_#b3eafe] hover:text-black transition-colors text-[19px]"
                >
                  ค้นหาเพิ่มเติม
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default PokemonList;