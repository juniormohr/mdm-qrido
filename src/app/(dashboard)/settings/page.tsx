import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Check } from 'lucide-react'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .single()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configurações</h1>
                <p className="text-slate-500">Gerencie sua conta e assinatura.</p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Sua Assinatura</CardTitle>
                        <CardDescription>Gerencie seu plano atual e método de pagamento.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <div className="text-sm font-medium">Plano Atual</div>
                                <div className="text-2xl font-bold capitalize text-indigo-600">
                                    {subscription?.plan || 'Gratuito / Inativo'}
                                </div>
                                <div className="text-xs text-slate-500">
                                    Status: <span className={subscription?.status === 'active' ? 'text-green-600' : 'text-slate-500'}>
                                        {subscription?.status || 'Sem assinatura'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 border-t bg-slate-50 px-6 py-4">
                        <Button variant="outline">Gerenciar no Stripe</Button>
                    </CardFooter>
                </Card>

                {(!subscription || subscription.status !== 'active') && (
                    <div className="grid gap-6 md:grid-cols-3">
                        {['Start', 'Pro', 'Master'].map((plan) => (
                            <Card key={plan} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle>{plan}</CardTitle>
                                    <CardDescription>Para impulsionar seu negócio</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-green-500" />
                                            <span>Acesso ao módulo QRido</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-green-500" />
                                            <span>Gestão de Leads</span>
                                        </li>
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full">Assinar {plan}</Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
