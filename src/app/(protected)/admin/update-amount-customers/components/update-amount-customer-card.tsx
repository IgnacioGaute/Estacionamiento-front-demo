"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useTransition, useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateAmountCustomerAction } from "@/actions/customers/update-amount-customer.action";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { amountCustomerSchema, AmountCustomerSchemaType } from "@/schemas/amount-customer.schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from "@/components/ui/switch";
import { RenterParkingType } from "@/types/renter-parking-type";

export default function UpdateAmountCustomerCard({ className, renterParkingTypes }: { className?: string; renterParkingTypes: RenterParkingType[] }) {
    const [error, setError] = useState<string | undefined>('');
    const [success, setSuccess] = useState<string | undefined>('');
    const [isPending, startTransition] = useTransition();
    const [isNegative, setIsNegative] = useState<boolean>(false);

    const form = useForm<AmountCustomerSchemaType>({
        resolver: zodResolver(amountCustomerSchema),
        defaultValues: {
            amount: undefined,
            customerType: 'RENTER',
            ownerTypeOfRenter: '',
        },
    });


    const onSubmit = (values: AmountCustomerSchemaType) => {
        setError(undefined);
        setSuccess(undefined);

        const finalAmount = isNegative ? -Math.abs(values.amount) : Math.abs(values.amount);

        startTransition(() => {
            updateAmountCustomerAction({ ...values, amount: finalAmount })
                .then((data) => {
                    if (data.error) {
                        setError(data.error);
                        toast.error(data.error);
                    } else {
                        setSuccess(data.success);
                        toast.success('Montos actualizados exitosamente');
                    }
                })
                .catch((error) => {
                    console.error(error);
                    setError('Error al actualizar el monto');
                    toast.error(error.message || 'Error desconocido');
                });
        });
    };

    return (
        <Card className={`w-full sm:w-3/5 h-full flex flex-col ${className} mx-auto my-auto justify-center`}>
            <CardHeader>
                <CardTitle>Actualizar Monto Inquilinos</CardTitle>
                <CardDescription>Elegir tipo de propietario y si el monto va a ser negativo o positivo</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex flex-col h-full">

                            <FormField
                                control={form.control}
                                name="ownerTypeOfRenter"
                                render={({ field }) => (
                                    <FormItem data-tour="amount-owner-type">
                                        <FormLabel>Tipo de Propietario</FormLabel>
                                        <FormControl>
                                            <Select
                                                disabled={isPending}
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona un propietario" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                {renterParkingTypes.map((type) => (
                                                    <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                                                ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex items-center justify-between" data-tour="amount-negative">
                            <FormLabel>Convertir en negativo</FormLabel>
                            <div className={`p-1 rounded-full ${isNegative ? 'bg-red-700' : 'bg-black'} transition-colors`}>
                                <Switch
                                checked={isNegative}
                                onCheckedChange={setIsNegative}
                                disabled={isPending}
                                />
                            </div>
                            </div>


                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem data-tour="amount-value">
                                    <FormLabel>Ingrese el monto</FormLabel>
                                    <FormControl>
                                        <Input disabled={isPending} {...field} type="number" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex-grow"></div>

                        <Button className="w-full mt-auto" type="submit" disabled={isPending} data-tour="amount-save">
                            Guardar cambios
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
