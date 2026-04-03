"use client"

import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react"

interface HeaderContent {
  title?: React.ReactNode
  actions?: React.ReactNode
  back?: string
}

// Split into two contexts so SetHeader (writer) doesn't re-render when content changes
const HeaderContentContext = createContext<HeaderContent>({})
const HeaderSetContext = createContext<Dispatch<SetStateAction<HeaderContent>>>(() => { })

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<HeaderContent>({})
  return (
    <HeaderSetContext.Provider value={setContent}>
      <HeaderContentContext.Provider value={content}>
        {children}
      </HeaderContentContext.Provider>
    </HeaderSetContext.Provider>
  )
}

export function useHeaderContext() {
  return useContext(HeaderContentContext)
}

function useSetHeader(patch: HeaderContent) {
  const setContent = useContext(HeaderSetContext)

  const useIsomorphicEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect

  useIsomorphicEffect(() => {
    setContent((prev) => ({ ...prev, ...patch }))
  })

  useEffect(() => {
    return () => setContent((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(patch) as (keyof HeaderContent)[]) {
        delete next[key]
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setContent])
}

export function SetHeader({ children, back }: { children?: React.ReactNode; back?: string }) {
  useSetHeader({ title: children, back })
  return null
}

export function SetActions({ children }: { children?: React.ReactNode }) {
  useSetHeader({ actions: children })
  return null
}
