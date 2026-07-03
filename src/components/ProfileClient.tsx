"use client";

import { useEffect, useState } from "react";

const cities = [
  "Pombal",
  "Leiria",
  "Coimbra",
  "Figueira da Foz",
  "Caldas da Rainha",
  "Marinha Grande",
];

const categories = [
  "Concertos",
  "DJ Sets",
  "Cinema",
  "Exposições",
  "Mercados",
  "Workshops",
];

export function ProfileClient() {
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    setSelectedCities(
      JSON.parse(localStorage.getItem("preferredCities") || "[]")
    );

    setSelectedCategories(
      JSON.parse(localStorage.getItem("preferredCategories") || "[]")
    );

    setSavedCount(JSON.parse(localStorage.getItem("savedEvents") || "[]").length);
  }, []);

  function toggleCity(city: string) {
    const next = selectedCities.includes(city)
      ? selectedCities.filter((item) => item !== city)
      : [...selectedCities, city];

    setSelectedCities(next);
    localStorage.setItem("preferredCities", JSON.stringify(next));
  }

  function toggleCategory(category: string) {
    const next = selectedCategories.includes(category)
      ? selectedCategories.filter((item) => item !== category)
      : [...selectedCategories, category];

    setSelectedCategories(next);
    localStorage.setItem("preferredCategories", JSON.stringify(next));
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
        <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
          Estado
        </p>

        <h2 className="text-2xl font-black">Visitante Paranoid</h2>

        <p className="mt-2 text-sm text-zinc-500">
          Sem login ainda. Preferências guardadas neste browser até ligarmos
          Supabase Auth.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-black p-3 text-center">
            <p className="text-2xl font-black">{savedCount}</p>
            <p className="text-[10px] uppercase text-zinc-600">Guardados</p>
          </div>

          <div className="rounded-2xl bg-black p-3 text-center">
            <p className="text-2xl font-black">{selectedCities.length}</p>
            <p className="text-[10px] uppercase text-zinc-600">Cidades</p>
          </div>

          <div className="rounded-2xl bg-black p-3 text-center">
            <p className="text-2xl font-black">{selectedCategories.length}</p>
            <p className="text-[10px] uppercase text-zinc-600">Categorias</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-black">Cidades</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Escolhe onde queres apanhar movimento.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {cities.map((city) => {
            const active = selectedCities.includes(city);

            return (
              <button
                key={city}
                type="button"
                onClick={() => toggleCity(city)}
                className={`rounded-full border px-4 py-2 text-sm font-bold ${
                  active
                    ? "border-red-800 bg-red-950 text-[#f2f1ec]"
                    : "border-zinc-700 text-zinc-400"
                }`}
              >
                {city}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-black">Categorias</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Diz à Paranoid que tipo de ruído te interessa.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = selectedCategories.includes(category);

            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                className={`rounded-full border px-4 py-2 text-sm font-bold ${
                  active
                    ? "border-red-800 bg-red-950 text-[#f2f1ec]"
                    : "border-zinc-700 text-zinc-400"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-red-700">
          Próximo passo
        </p>

        <h2 className="text-2xl font-black">Feed Para ti</h2>

        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          A seguir usamos estas preferências para mostrar eventos recomendados
          na Home.
        </p>
      </section>
    </div>
  );
}