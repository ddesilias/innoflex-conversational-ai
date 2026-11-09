export function EmptyScreen() {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="mt-10 flex flex-col gap-3 rounded-lg border bg-background p-8">
        <p className="text-sm font-medium text-muted-foreground">
          Trading & Investissement · Assistant IA
        </p>
        <h1 className="text-2xl font-semibold">
          Quelle analyse souhaitez-vous approfondir ?
        </h1>
        <p className="leading-normal text-muted-foreground">
          Expliquez un concept, structurez une analyse ou préparez votre revue
          de séance. Décrivez votre objectif et les contraintes à prendre en
          compte.
        </p>
        <p className="text-sm text-muted-foreground">
          Cet espace est une conversation avec l’IA. Pour échanger avec une
          autre personne, utilisez Messages privés. Votre journal n’est pas
          transmis automatiquement à l’assistant.
        </p>
      </div>
    </div>
  )
}
