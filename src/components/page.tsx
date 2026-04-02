import { cn } from "@/lib/utils"

interface PageProps {
  children: React.ReactNode
  className?: string
}

export function Page({ children, className }: PageProps) {
  return (
    <div className={cn("flex flex-col gap-4 py-4 px-4 md:gap-6 md:py-6 lg:px-6", className)}>
      {children}
    </div>
  )
}

export function PageHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {children}
    </div>
  )
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
}
