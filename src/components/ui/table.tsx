"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => {
  const pathname = usePathname()
  const admin = pathname?.startsWith("/admin")
  const tableRef = React.useRef<HTMLTableElement | null>(null)
  React.useEffect(() => {
    if (!admin || !tableRef.current) return
    const table = tableRef.current
    const labelCells = () => {
      const headers = Array.from(table.querySelectorAll("thead tr:last-child th")).map(header =>
        header.textContent?.trim() || "Acciones"
      )
      table.querySelectorAll("tbody tr").forEach(row => {
        Array.from(row.children).forEach((cell, index) => {
          const label = cell.getAttribute("colspan") ? "" : headers[index] ?? ""
          if (cell.getAttribute("data-mobile-label") !== label) cell.setAttribute("data-mobile-label", label)
        })
      })
    }
    labelCells()
    const observer = new MutationObserver(labelCells)
    observer.observe(table, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [admin, props.children])
  return (
  <div className={cn("relative w-full overflow-auto", admin && "admin-responsive-table")}>
    <table
      ref={node => {
        tableRef.current = node
        if (typeof ref === "function") ref(node)
        else if (ref) ref.current = node
      }}
      className={cn("w-full caption-bottom text-sm border-separate border-spacing-0", className)}
      {...props}
    />
  </div>
  )
})
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-gm-surface [&_tr]:border-b [&_tr]:border-border [&_th]:border-b [&_th]:border-border",
      className
    )}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child_td]:border-b-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-border bg-gm-surface-2 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "transition-colors hover:bg-gm-surface-2/60 data-[state=selected]:bg-gm-surface-3",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-11 px-4 text-left align-middle text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-4 py-3 align-middle text-[13px] text-foreground border-b border-border [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
