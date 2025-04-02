'use server'

import { z } from 'zod'
import postgres from 'postgres'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' })

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['paid', 'pending']),
    date: z.string()
})

const CreateInvoice = FormSchema.omit({
    id: true,
    date: true,
})

export const createInvoice = async (data: FormData) => {
    try {
        const { customerId, amount, status } = CreateInvoice.parse({
            customerId: data.get('customerId'),
            amount: data.get('amount'),
            status: data.get('status'),
        })
        const amountInCents = amount * 100
        const date = new Date().toISOString().slice(0, 10)

        await sql`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;

        revalidatePath('/dashboard/invoices')
    } catch (error) {
        console.log(error)
    }
    redirect('/dashboard/invoices')
}

export async function updateInvoice(id: string, formData: FormData) {
    try {

        const { customerId, amount, status } = CreateInvoice.parse({
            customerId: formData.get('customerId'),
            amount: formData.get('amount'),
            status: formData.get('status'),
        });

        const amountInCents = amount * 100;

        await sql`
          UPDATE invoices
          SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
          WHERE id = ${id}
        `;

        revalidatePath('/dashboard/invoices');
    } catch (error) {
        console.log(error)
    }
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
}