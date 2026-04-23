import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  category: z.string().min(1),
  subCategory: z.string().min(1),
  factorValue: z.number({ message: 'Must be number' }),
  unit: z.string().min(1),
  source: z.string().min(1),
  year: z.number().int().min(1900),
  region: z.string().min(1),
  scope: z.string().min(1),
  notes: z.string().optional(),
});
export type FactorFormValues = z.infer<typeof schema>;

type Props = {
  initial?: Partial<FactorFormValues>;
  onSubmit: (values: FactorFormValues) => void | Promise<void>;
  onCancel: () => void;
};

export default function FactorForm({ initial, onSubmit, onCancel }: Props) {
  const { register, handleSubmit, setValue, formState: { errors } } =
    useForm<FactorFormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (initial) {
      (Object.entries(initial) as [keyof FactorFormValues, FactorFormValues[keyof FactorFormValues]][])
        .forEach(([k, v]) => {
          if (v !== undefined) {
            setValue(k, v);
          }
        });
    }
  }, [initial, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display:'grid', gap:12, width: 520 }}>
      <input placeholder="Category" {...register('category')} />
      {errors.category && <small>{errors.category.message}</small>}

      <input placeholder="SubCategory" {...register('subCategory')} />
      {errors.subCategory && <small>{errors.subCategory.message}</small>}

      <input placeholder="Factor Value" type="number" step="any"
             {...register('factorValue', { valueAsNumber: true })} />
      {errors.factorValue && <small>{errors.factorValue.message}</small>}

      <input placeholder="Unit (e.g. kgCO2e/kWh)" {...register('unit')} />
      <input placeholder="Source" {...register('source')} />

      <input placeholder="Year" type="number" {...register('year', { valueAsNumber: true })} />
      <input placeholder="Region" {...register('region')} />
      <input placeholder="Scope" {...register('scope')} />
      <input placeholder="Notes (optional)" {...register('notes')} />

      <div style={{ display:'flex', gap:12 }}>
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
