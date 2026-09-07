export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
import { FileSpreadsheet } from 'lucide-react';
import { getOwnerParkingTypes, getRenterParkingTypes } from '@/services/customers.service';
import { PageHeader } from '@/components/page-header';
import { ParkingTypeTable } from './components/parking-types-table';
import { ownerParkingTypeColumns } from './components/owner-parking-type-columns';
import { renterParkingTypeColumns } from './components/renter-parking-type-columns';
import { CreateOwnerParkingTypeDialog } from './components/create-owner-parking-type-dialog';
import { CreateRenterParkingTypeDialog } from './components/create-renter-parking-type-dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExportParkingExcel } from '../components/export-parking-excel';
import { PageTour } from '@/components/page-tour';

const TOUR_STEPS = [
  {
    key: 'tabs',
    selector: '[data-tour="parking-type-tabs"]',
    title: 'Dueños e inquilinos',
    desc: 'Los tipos de cochera se manejan por separado: una pestaña para los tipos de dueños, otra para los de inquilinos.',
    radius: 8,
  },
  {
    key: 'create',
    selector: '[data-tour="parking-type-create"]',
    title: 'Crear un tipo',
    desc: 'Definí un nuevo tipo de cochera (nombre y datos asociados) para asignar a dueños o inquilinos según la pestaña activa.',
    radius: 6,
  },
  {
    key: 'filter',
    selector: '[data-tour="parking-type-filter"]',
    title: 'Buscar un tipo',
    desc: 'Filtrá la lista escribiendo el nombre del tipo de cochera.',
    radius: 6,
  },
  {
    key: 'export',
    selector: '[data-tour="parking-type-export"]',
    title: 'Exportar a Excel',
    desc: 'Descargá el listado de tipos de dueños o de inquilinos en un archivo Excel.',
    radius: 6,
  },
];

export default async function ParkingTypePage() {
  const ownerParkingTypes = await getOwnerParkingTypes();
  const renterParkingTypes = await getRenterParkingTypes();

  return (
    <div className="container mx-auto px-4 py-4 sm:p-6">
      <PageHeader
        breadcrumb={['Estacionamiento', 'Administración', 'Tipos de Estacionamiento']}
        title="Tipos de Estacionamientos"
        description="Gestionar los tipos de estacionamientos, para dueños e inquilinos."
        actions={
          <div className="flex items-center gap-2">
            <PageTour steps={TOUR_STEPS} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2" data-tour="parking-type-export">
                  <FileSpreadsheet className="w-4 h-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <ExportParkingExcel parkings={ownerParkingTypes?.data || []} fileName="parking-duenos" />
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ExportParkingExcel parkings={renterParkingTypes?.data || []} fileName="parking-inquilinos" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <Tabs defaultValue="owners" className="mt-6">
        <TabsList data-tour="parking-type-tabs">
          <TabsTrigger value="owners">Dueños</TabsTrigger>
          <TabsTrigger value="renters">Inquilinos</TabsTrigger>
        </TabsList>

        <TabsContent value="owners" className="mt-4">
          <ParkingTypeTable
            columns={ownerParkingTypeColumns}
            data={ownerParkingTypes?.data || []}
            filterColumnId="name"
            filterPlaceholder="Filtrar por nombre..."
            createTrigger={<CreateOwnerParkingTypeDialog />}
          />
        </TabsContent>

        <TabsContent value="renters" className="mt-4">
          <ParkingTypeTable
            columns={renterParkingTypeColumns}
            data={renterParkingTypes?.data || []}
            filterColumnId="name"
            filterPlaceholder="Filtrar por nombre..."
            createTrigger={<CreateRenterParkingTypeDialog />}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
