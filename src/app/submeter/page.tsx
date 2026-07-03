const categories = [
  "Concertos",
  "DJ Sets",
  "Cinema",
  "Exposições",
  "Mercados",
  "Workshops",
  "Teatro",
  "Outros",
];

const cities = [
  "Pombal",
  "Leiria",
  "Coimbra",
  "Figueira da Foz",
  "Caldas da Rainha",
  "Marinha Grande",
];

export default function SubmitEventPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Submeter evento
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Mete o teu evento no mapa.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Concertos, DJ sets, cinema, exposições, mercados, workshops e cultura
          que ainda mexe.
        </p>

        <form className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Nome do evento
            </label>
            <input
              type="text"
              placeholder="Ex: Noise Night"
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Cidade
            </label>
            <select className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900">
              {cities.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Categoria
            </label>
            <select className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900">
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Data
              </label>
              <input
                type="date"
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Hora
              </label>
              <input
                type="time"
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Local / espaço
            </label>
            <input
              type="text"
              placeholder="Ex: Armazém, Pombal"
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Preço
            </label>
            <input
              type="text"
              placeholder="Entrada livre, 5€, 10€..."
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Descrição
            </label>
            <textarea
              rows={6}
              placeholder="Explica o evento sem parecer comunicado da câmara."
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Link de bilhetes / Instagram
            </label>
            <input
              type="url"
              placeholder="https://..."
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <button
            type="button"
            className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black"
          >
            Submeter para aprovação
          </button>

          <p className="text-center text-xs text-zinc-600">
            Primeira versão: formulário visual. Depois ligamos isto ao Supabase
            e ao admin Paranoid.
          </p>
        </form>
      </section>
    </main>
  );
}