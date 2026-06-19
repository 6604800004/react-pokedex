import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { getPokemonId } from "../data/pokemonData";
import { type Tdata } from "../data/pokemonData";
import "../css/App.css";

function PokemonList() {
  const nav = useNavigate();
  const [data, setData] = useState<Tdata[]>([]); //เก็บ List โปเกมอน
  const [inputText, setInputText] = useState(""); //search pokemon
  const [visibleCount, setVisibleCount] = useState(16); //แสดง 4x4หรือจำนวน pokemon ที่ตั้งไว้
  const [offset, setOffset] = useState(0); //ข้อมูลตัวถัดไป
  const [hasMore, setHasMore] = useState(true); //เช็คข้อมูลว่ามีให้โหลดเพิ่มมั้ย
  const [loading, setLoading] = useState(false); //กำลังโหลดอยู่มั้ย
  const hasFetched = useRef(false); //กัน fetch ซ้ำ

  // เงื่อนไขค้นหา ใช้ร่วมกันทั้ง filterData และ useEffect
  const matchSearch = (p: Tdata) =>
    p.id.padStart(4, "0").includes(inputText) ||
    p.name.toLowerCase().includes(inputText.toLowerCase()) ||
    p.types.some((type) => type.toLowerCase().includes(inputText.toLowerCase()));

  //พิมพ์ค้นหา (กรอง)
  const filterData = useMemo(
    () => data.filter(matchSearch).slice(0, visibleCount),
    [data, inputText, visibleCount],
  );

  const fetchSpecies = async (currentOffset: number) => {
    setLoading(true);
    const res = await fetch(
      `https://pokeapi.co/api/v2/pokemon-species?limit=20&offset=${currentOffset}`,
    );
    const speciesListData = await res.json();
    if (!speciesListData.next) setHasMore(false);

    //filter เอาตัว default, mega, gmax, alola, galar
    const allVarieties = await Promise.all(
      speciesListData.results.map(async (species: { url: string }) => {
        const sRes = await fetch(species.url);
        const sData = await sRes.json();
        return Promise.all(
          sData.varieties.filter(
              (v: { pokemon: { name: string }; is_default: boolean }) =>
                v.is_default ||
                v.pokemon.name.includes("-mega") ||
                v.pokemon.name.includes("-gmax") ||
                (v.pokemon.name.includes("-alola") &&
                  !v.pokemon.name.includes("-totem") &&
                  !v.pokemon.name.includes("-cap")) ||
                v.pokemon.name.includes("-galar"),
            )
            .filter((v: { pokemon: { name: string } }) => 
              !v.pokemon.name.includes("raichu-mega"),

            ).map(async (v: { pokemon: { name: string; url: string } }) => {
              const pRes = await fetch(v.pokemon.url);
              const pData = await pRes.json();
              return {
                name: v.pokemon.name,
                url: v.pokemon.url,
                id: getPokemonId(species.url),
                types: pData.types.map(
                  (t: { type: { name: string } }) => t.type.name,
                ),
              };
            }),
        );
      }),
    );

    //รวมข้อมูลเก่า/ใหม่ กันชื่อซ้ำ แล้วเรียงตาม id
    const sorted = allVarieties.flat();
    setData((prev) =>
      [...prev, ...sorted]
        .filter((v, i, arr) => arr.findIndex((p) => p.name === v.name) === i)
        .sort((a, b) => parseInt(a.id) - parseInt(b.id)),
    );
    setLoading(false);
  };

  //เพิ่มจำนวนที่แสดงผล พร้อมไปขอข้อมูลใหม่จาก api ในรอบถัดไป
  const loadMore = () => {
    setVisibleCount((prev) => prev + 16);
    const newOffset = offset + 20;
    setOffset(newOffset);
    fetchSpecies(newOffset);
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchSpecies(0);
  }, []);

  useEffect(() => {
    if (inputText && hasMore && !loading) {
      const matched = data.filter(matchSearch).length;

      if (matched < 16) {
        const newOffset = offset + 20;
        setOffset(newOffset);
        fetchSpecies(newOffset);
      }
    }
  }, [data, inputText]);

  return (
    <>
      <div className="header">
        <div className="logo__" />
        <div className="header__nav"></div>
      </div>

      <div className="pokemon-list-contents">
        <div className="pokemon-list__search">
          <div className="pokemon-search_from__text">
            ค้นหาด้วยชื่อ หรือ หมายเลขโปเกเด็กซ์
          </div>
          <input
            type="text"
            className="pokemon-search_from__text__input"
            onChange={(e) => {
              setInputText(e.target.value);
              setVisibleCount(16);
            }}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder=""
          />
        </div>
        <img
                src={`https://th.portal-pokemon.com/play/resources/pokedex/img/list_top_bg.jpg`}
              />
      </div>

      <div className="search-container">
        <div className="pokemon-list">
          {filterData.map((pokemon) => (
            <div
              key={pokemon.name}
              onClick={() =>
                nav(`/PokeDex/${getPokemonId(pokemon.url).padStart(4, "0")}`)
              }
              className="pokemon-list--box"
            >
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${getPokemonId(pokemon.url)}.png`}
                alt={pokemon.name}
              />
              <div className="pokemon-list--box__no">
                {pokemon.id.padStart(4, "0")}
              </div>
              <div className="pokemon-list--box__name">{pokemon.name}</div>
              <div className="pokemon-list--box__types__size">
                <div className="pokemon-list--box__types">
                  {pokemon.types.map((type) => (
                    <span key={type} className={`type type--${type}`}>
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pokemon-list-load-more__button">
          {loading ? (
            <div className="loading" />
          ) : (
            hasMore &&
            (!inputText || filterData.length > 0) && (
              <button className="load-more" onClick={loadMore}>
                ค้นหาเพิ่มเติม
              </button>
            )
          )}
        </div>
      </div>
    </>
  );
}

export default PokemonList;