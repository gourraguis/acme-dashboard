'use server'

import { z } from 'zod'
import postgres from 'postgres'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' })

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer'
    }),
    amount: z.coerce.number().gt(0, {
        message: 'Please enter a valid amount'
    }),
    status: z.enum(['paid', 'pending'], {
        invalid_type_error: 'Please select a status for the invoice'
    }),
    date: z.string()
})

const CreateInvoice = FormSchema.omit({
    id: true,
    date: true,
})

export type CreateInvoiceState = {
    errors?: {
        customerId?: string[]
        amount?: string[]
        status?: string[]
    }

    message?: string | null
}

export const createInvoice = async (prevState: CreateInvoiceState, data: FormData) => {
    const validatedFields = CreateInvoice.safeParse({
        customerId: data.get('customerId'),
        amount: data.get('amount'),
        status: data.get('status'),
    })

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        };
    }

    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100
    const date = new Date().toISOString().slice(0, 10)

    await sql`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;

    revalidatePath('/dashboard/invoices')
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