import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { getPokemonId, type Tdata } from "../data/pokemonData";

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
  const lastFetchedKeyword = useRef("");

  const filteredData = useMemo(() => {
    const keyword = searchKeyword.toLowerCase().trim();
    if (!keyword) return data;
    return data.filter(
      (p) =>
        p.id.padStart(4, "0").includes(keyword) ||
        p.name.toLowerCase().includes(keyword) ||
        p.types.some((t) => t.toLowerCase().includes(keyword))
    );
  }, [data, searchKeyword]);

  const visibleData = useMemo(
    () => filteredData.slice(0, visibleCount),
    [filteredData, visibleCount]
  );

  const hasMoreCached = visibleCount < filteredData.length;
  const showLoadMore = !loading && (hasMoreCached || hasMore);

  const fetchBatch = async (offset: number): Promise<{ newData: Tdata[]; hasNext: boolean }> => {
    const res = await fetch(
      `https://pokeapi.co/api/v2/pokemon-species?limit=20&offset=${offset}`
    );
    const speciesListData = await res.json();
    const hasNext = !!speciesListData.next;

    //filter เอาตัว default, mega, gmax, alola, galar
    const allVarieties = await Promise.all(
      speciesListData.results.map(async (species: { url: string }) => {
        const sRes = await fetch(species.url);
        const sData = await sRes.json();
        return Promise.all(
          sData.varieties
            .filter((v: { pokemon: { name: string }; is_default: boolean }) =>
              v.is_default ||
              v.pokemon.name.includes("-mega") ||
              v.pokemon.name.includes("-gmax") ||
              (v.pokemon.name.includes("-alola") &&
                !v.pokemon.name.includes("-totem") &&
                !v.pokemon.name.includes("-cap")) ||
              v.pokemon.name.includes("-galar")
            )
            .filter(
              (v: { pokemon: { name: string } }) =>
                !v.pokemon.name.includes("raichu-mega")
            )
            .map(async (v: { pokemon: { name: string; url: string } }) => {
              const pRes = await fetch(v.pokemon.url);
              const pData = await pRes.json();
              return {
                name: v.pokemon.name,
                url: v.pokemon.url,
                id: getPokemonId(species.url),
                types: pData.types.map(
                  (t: { type: { name: string } }) => t.type.name
                ),
              };
            })
        );
      })
    );

    return { newData: allVarieties.flat(), hasNext };
  };

  const mergeData = (prev: Tdata[], incoming: Tdata[]): Tdata[] =>
    [...prev, ...incoming]
      .filter((v, i, arr) => arr.findIndex((p) => p.name === v.name) === i)
      .sort((a, b) => parseInt(a.id) - parseInt(b.id));

  const filterByKeyword = (list: Tdata[], keyword: string): Tdata[] => {
    const kw = keyword.toLowerCase().trim();
    if (!kw) return list;
    return list.filter(
      (p) =>
        p.id.padStart(4, "0").includes(kw) ||
        p.name.toLowerCase().includes(kw) ||
        p.types.some((t) => t.toLowerCase().includes(kw))
    );
  };

  const fetchSpecies = async (currentOffset: number) => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    try {
      const { newData, hasNext } = await fetchBatch(currentOffset);
      if (!hasNext) setHasMore(false);
      offsetRef.current = currentOffset;
      const merged = mergeData(dataRef.current, newData);
      dataRef.current = merged;
      setData([...merged]);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  const fetchUntilEnough = async (keyword: string, neededCount: number): Promise<void> => {
    if (isFetching.current) return; // ถ้า return ตรงนี้ .then() จะไม่ทำงาน
    isFetching.current = true;
    setLoading(true);

    try {
      let currentData = [...dataRef.current];
      let currentOffset = offsetRef.current;

      while (true) {
        const filtered = filterByKeyword(currentData, keyword);
        if (filtered.length >= neededCount) break;

        const nextOffset = currentOffset + 20;
        const { newData, hasNext } = await fetchBatch(nextOffset);
        currentOffset = nextOffset;
        offsetRef.current = nextOffset;

        currentData = mergeData(currentData, newData);
        dataRef.current = currentData;
        setData([...currentData]);

        if (!hasNext) {
          setHasMore(false);
          break;
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  const handleSearch = () => {
    const keyword = inputText.trim();
    if (keyword === searchKeyword) return;
    setSearchKeyword(keyword);
    setVisibleCount(16);
    lastFetchedKeyword.current = "";

    if (!keyword) return;
    if (filterByKeyword(dataRef.current, keyword).length < 16) {
      fetchUntilEnough(keyword, 16);
      lastFetchedKeyword.current = keyword;
    }
  };

  const loadMore = () => {
    if (loading || isFetching.current) return;
    const nextCount = visibleCount + 16;

    if (searchKeyword) {
      if (filteredData.length >= nextCount) {
        setVisibleCount(nextCount);
      } else if (hasMore) {
        fetchUntilEnough(searchKeyword, nextCount).then(() => {
          setVisibleCount(nextCount);
        });
      } else {
        setVisibleCount(nextCount);
      }
    } else {
      if (hasMoreCached) {
        setVisibleCount(nextCount);
      } else if (hasMore) {
        fetchSpecies(offsetRef.current + 20).then(() => {
          setVisibleCount(nextCount);
        });
      }
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchSpecies(0);
  }, []);

  return (
    <>
      <header className="flex items-center justify-center min-h-[70px] px-4 bg-white">
        <div className="logo__" />
      </header>

      <div className="bg-[#1b252f]">
        <div className="relative max-w-[1400px] mx-auto">
          <div className="absolute left-[150px] top-[450px] z-10">
            <p className="text-[#b3eafe] text-xl pb-3 pl-1 [filter:drop-shadow(0_0_5px_#fdfdfd)]">
              ค้นหาด้วยชื่อ หรือ หมายเลขโปเกเด็กซ์
            </p>
            <div className="relative w-[650px] flex rounded-full overflow-hidden bg-white">
              <input
                type="text"
                value={inputText}
                className="search-input flex-1 pt-[10px] pb-[10px] pl-[50px] pr-[10px] text-[22px] border-none outline-none bg-white"
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") handleSearch();
                }}
              />

              <button
                onClick={handleSearch}
                className="flex items-center justify-center w-[90px] bg-[#b3eafe] border-none cursor-pointer shrink-0"
              >
                <img
                  src="https://th.portal-pokemon.com/play/resources/pokedex/img/icon_magnifying_glass.png"
                  alt="search"
                  className="w-6 h-6 object-contain"
                />
              </button>
            </div>
          </div>
          <img
            src="https://th.portal-pokemon.com/play/resources/pokedex/img/list_top_bg.jpg"
            alt="Pokedex banner"
            className="w-full"
          />
        </div>
        
        

        <div className="list-section-bg max-w-[1400px] w-full mx-auto px-5 py-5 min-h-screen">
          <div className="grid grid-cols-4 gap-y-[25px] m-5 font-[Noto_Sans,Arial,sans-serif]">
            {visibleData.map((pokemon) => (
              <div
                key={pokemon.name}
                onClick={() =>
                  nav(`/PokeDex/${getPokemonId(pokemon.url).padStart(4, "0")}`)
                }
                className="pokemon-card-bg flex flex-col items-center cursor-pointer overflow-hidden relative"
                style={{ aspectRatio: "2 / 3" }}
              >
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${getPokemonId(pokemon.url)}.png`}
                  alt={pokemon.name}
                  className="w-[60%] h-[60%] object-contain p-[5px] [filter:drop-shadow(0_0_1.5px_#fdfdfd)]"
                />
                <div className="flex flex-col w-[75%] px-0 gap-3 flex-1 font-semibold pt-2">
                  <span className="text-[#b3eafe] text-base">
                    {pokemon.id.padStart(4, "0")}
                  </span>
                  <span className="font-bold text-[22px] text-white leading-tight whitespace-pre-line">
                    {pokemon.name.toUpperCase().replace(/-/, "\n").replace(/-/g, " ")}
                  </span>
                </div>

                <div className="absolute bottom-10 left-10 flex flex-wrap gap-5">
                  {pokemon.types.map((type) => (
                    <span key={type} className={`type type--${type}`}>
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center w-[600px] h-20 mx-auto my-5">
            {loading ? (
              <div className="loading-gif w-16 h-16" />
            ) : (
              showLoadMore && (
                <button
                  onClick={loadMore}
                  className="load-more-btn w-[600px] h-20 text-[#b3eafe] border-none text-xl cursor-pointer [text-shadow:0_0_5px_#b3eafe] hover:text-black"
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