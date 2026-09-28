'use client';
import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BoxListDialog } from '@/components/box-list-dialog';

export function PlanillaButton() {
  const [open, setOpen] = useState(false);
  return <><Button type="button" variant="outline" onClick={() => setOpen(true)}><FileText className="size-4" />Planilla diaria</Button><BoxListDialog open={open} setOpen={setOpen} /></>;
}
