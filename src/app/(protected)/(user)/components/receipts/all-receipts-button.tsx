// GenerateReceiptsButton.tsx
'use client'

import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import { generateAllReceipts } from '@/utils/generate-all-receipts'
import { Customer, CustomerType } from '@/types/cutomer.type'
import { useSession } from 'next-auth/react'

export type GenerateReceiptsButtonProps = {
  type: CustomerType
  selectedDate?: Date
  onFinish: () => void
}

export default function GenerateReceiptsButton({
  type,
  selectedDate,
  onFinish,
}: GenerateReceiptsButtonProps) {
  const { data: session } = useSession();
  const handleGenerateAllReceipts = async () => {


    if (!selectedDate) {
      toast.error('Selecciona una fecha primero')
      return
    }

    try {
      await generateAllReceipts(type, selectedDate, session?.token)
      toast.success('Recibos generados e impresos correctamente')
      onFinish()
    } catch (error) {
      console.error('Error al generar todos los recibos:', error)
      toast.error('Error al generar los recibos')
    }
  }

  return (
    <Button onClick={handleGenerateAllReceipts} disabled={!selectedDate}>
      Confirmar e Imprimir
    </Button>
  )
}
