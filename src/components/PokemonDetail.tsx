import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";

function PokemonDetail() {
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);
  const { id } = useParams();

  useEffect(() => {
    if (!id) {
      nav("/404", { replace: true });
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      try {
        const res = await fetch(
          `https://pokeapi.co/api/v2/pokemon/${parseInt(id, 10)}`
        );
        if (!res.ok) {
          if (!cancelled) nav("/404", { replace: true });
          return;
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) nav("/404", { replace: true });
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [id, nav]);

  if (!data) return null;

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-center min-h-[70px] px-4 bg-white">
        <div className="logo__" />
      </header>

      {/* Detail content */}
      <div className="detail-section-bg max-w-[1400px] w-full mx-auto px-5 py-5 min-h-screen font-[Noto_Sans,Arial,sans-serif]">
        <div className="flex justify-center mt-[22px]">
          <button
            onClick={() => nav(-1)}
            className="cursor-pointer text-black text-2xl text-center no-underline px-[200px] py-[5px] bg-transparent border-none"
          >
            โปเกเด็กซ์
          </button>
        </div>

        <div className="flex flex-col items-center">
          <img
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${data.id}.png`}
            alt={data.name}
            className="w-64 h-64 object-contain"
          />
          <h2 className="text-white text-2xl font-bold mt-4">{data.name}</h2>
          <div className="flex gap-3 mt-3">
            {data.types.map((t: { type: { name: string } }) => (
              <span key={t.type.name} className={`type type--${t.type.name}`}>
                {t.type.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default PokemonDetail;