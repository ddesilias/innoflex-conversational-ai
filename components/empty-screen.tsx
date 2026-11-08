export function EmptyScreen() {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="mt-10 flex flex-col gap-3 rounded-lg border bg-background p-8">
        <p className="text-sm font-medium text-muted-foreground">INNOFLEX · Assistant personnel</p>
        <h1 className="text-2xl font-semibold">Comment puis-je vous aider aujourd’hui ?</h1>
        <p className="leading-normal text-muted-foreground">
          Rédigez un message, explorez une idée, comprenez un sujet ou préparez votre prochaine étape.
          Décrivez votre objectif et les contraintes à prendre en compte.
        </p>
        <p className="text-sm text-muted-foreground">
          L’assistant prépare des réponses et des plans. Il n’exécute pas d’actions dans vos autres applications.
        </p>
      </div>
    </div>
  )
}
