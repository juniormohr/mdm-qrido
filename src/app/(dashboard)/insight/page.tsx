'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
} from 'recharts'

// Mock Data
const data = [
    { name: 'Jan', leads: 400, sales: 240 },
    { name: 'Feb', leads: 300, sales: 139 },
    { name: 'Mar', leads: 200, sales: 980 },
    { name: 'Apr', leads: 278, sales: 390 },
    { name: 'May', leads: 189, sales: 480 },
    { name: 'Jun', leads: 239, sales: 380 },
]

const funnelData = [
    { name: 'Visitantes', value: 4000 },
    { name: 'Leads', value: 3000 },
    { name: 'Qualificados', value: 2000 },
    { name: 'Negociação', value: 1000 },
    { name: 'Vendas', value: 500 },
]

export default function InsightPage() {
    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-4xl font-black tracking-tight text-slate-900 italic uppercase">MDM Insight</h1>
                <p className="text-slate-500 font-medium">Inteligência de dados para decisões estratégicas.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">Performance de Vendas</CardTitle>
                        <CardDescription>Leads vs Vendas por mês</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="leads" fill="#297CCB" radius={[6, 6, 0, 0]} name="Leads" />
                                <Bar dataKey="sales" fill="#E9592C" radius={[6, 6, 0, 0]} name="Vendas" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">Tendência de Crescimento</CardTitle>
                        <CardDescription>Evolução da base de contatos</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line type="monotone" dataKey="sales" stroke="#167657" strokeWidth={4} dot={{ r: 6, fill: '#167657', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">Funil de Conversão</CardTitle>
                    <CardDescription>Eficiência em cada etapa do processo comercial</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6 max-w-3xl mx-auto py-4">
                        {funnelData.map((stage, index) => {
                            const max = funnelData[0].value
                            const percentage = (stage.value / max) * 100
                            const colors = ['#297CCB', '#167657', '#F7AA1C', '#E9592C', '#6366f1']

                            return (
                                <div key={stage.name} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                                        <span className="uppercase tracking-wider">{stage.name}</span>
                                        <span className="bg-slate-50 px-3 py-1 rounded-full text-slate-500">{stage.value} ({Math.round(percentage)}%)</span>
                                    </div>
                                    <div className="h-4 w-full bg-slate-50 overflow-hidden rounded-full p-1 border border-slate-100">
                                        <div
                                            className="h-full transition-all duration-1000 ease-out rounded-full"
                                            style={{
                                                width: `${percentage}%`,
                                                backgroundColor: colors[index % colors.length]
                                            }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
