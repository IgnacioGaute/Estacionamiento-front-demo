"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"
import { Segmento } from "@/components/ui/segmento"

// Las pestañas de shadcn con la barra de Rubber Segment (ui/segmento), sin cambiar cómo se usan:
// Tabs lleva el valor (propio o el que le pasen) para que la barra y los paneles de Radix muestren
// lo mismo, y TabsList arma la barra con los TabsTrigger que recibe.
type TabsCtx = { value: string; setValue: (value: string) => void }
const TabsContext = React.createContext<TabsCtx | null>(null)

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ value, defaultValue, onValueChange, ...props }, ref) => {
  const [propio, setPropio] = React.useState(defaultValue ?? "")
  const actual = value ?? propio
  const setValue = React.useCallback(
    (next: string) => {
      if (value === undefined) setPropio(next)
      onValueChange?.(next)
    },
    [value, onValueChange]
  )
  return (
    <TabsContext.Provider value={{ value: actual, setValue }}>
      <TabsPrimitive.Root ref={ref} value={actual} onValueChange={setValue} {...props} />
    </TabsContext.Provider>
  )
})
Tabs.displayName = TabsPrimitive.Root.displayName

type TriggerProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(TabsContext)
  const items = React.Children.toArray(children)
    .filter((child): child is React.ReactElement<TriggerProps> => React.isValidElement(child))
    .map((child) => ({ value: child.props.value, label: child.props.children }))
  return (
    // Se queda con el ancho y los márgenes que le den; el estilo de la barra lo pone el segmentado.
    <div ref={ref} className={cn(className, "block h-auto bg-transparent p-0")}>
      <Segmento
        items={items}
        value={ctx?.value ?? items[0]?.value ?? ""}
        onChange={(next) => ctx?.setValue(next)}
        ancho
        aria-label={props["aria-label"]}
      />
    </div>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

// Solo describe la pestaña: TabsList la dibuja dentro del segmentado.
const TabsTrigger = (props: TriggerProps) => <TabsPrimitive.Trigger {...props} />
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
