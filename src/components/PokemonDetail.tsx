import { useState, useEffect } from "react";
import { useNavigate, useParams } from 'react-router';
import "../css/App-Detail.css"

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
                const numericId = parseInt(id, 10);
                const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${numericId}`);
                if (!res.ok) {
                    if (!cancelled) nav("/404", { replace: true });
                    return;
                }
                const json = await res.json();
                if (!cancelled) setData(json);
            } catch (err) {
                if (!cancelled) nav("/404", { replace: true });
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, [id, nav]);

    if (!data) return null;

    return (
        <>
            <div className="header">
                <div className="logo__" />
            </div>

            <div className="pokemon-detail-contents">
                <div className="pokedex-detail__header">
                    <a className="pokemon-detail__header__back-to-top" onClick={() => nav(-1)}>
                        โปเกเด็กซ์
                    </a>
                </div>

                <div className="pokemon-detail-box">
                    <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${data.id}.png`}
                        alt={data.name}
                    />
                    <h2>{data.name}</h2>
                    <div className="pokemon-detail__types">
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