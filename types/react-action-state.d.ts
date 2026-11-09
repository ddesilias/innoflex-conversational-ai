import 'react'

// Next 15 App Router supplies React's useActionState at runtime. The project
// still uses React 18 declarations, so describe this supported hook explicitly
// until the full React dependency/type migration is completed.
declare module 'react' {
  export function useActionState<State, Payload>(
    action: (state: Awaited<State>, payload: Payload) => State | Promise<State>,
    initialState: Awaited<State>,
    permalink?: string
  ): [
    state: Awaited<State>,
    dispatch: (payload: Payload) => void,
    isPending: boolean
  ]
}
