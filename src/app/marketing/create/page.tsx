'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Megaphone, CalendarDays, CheckCircle2, Info } from "lucide-react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { generateReverseSchedule } from "@/lib/campaigns"
import { CampaignTemplateStep } from "@/types/campaigns"

// Mock templates for demonstration
const MOCK_TEMPLATES = [
    {
        id: 'tpl_mothers_day',
        name: 'Campanha de Varejo Sazonal',
        description: 'Ideal para Dia das Mães, Namorados, etc. Inclui produção audiovisual e gráfica.',
        steps: [
            { id: '1', template_id: 'tpl_mothers_day', name: 'Briefing da Campanha', category: 'Planejamento', days_offset: -45, color: '#9333ea', order_index: 1 },
            { id: '2', template_id: 'tpl_mothers_day', name: 'Aprovação de Roteiro e Peças', category: 'Aprovação', days_offset: -35, color: '#f59e0b', order_index: 2 },
            { id: '3', template_id: 'tpl_mothers_day', name: 'Produção Audiovisual', category: 'Produção', days_offset: -30, color: '#3b82f6', order_index: 3 },
            { id: '4', template_id: 'tpl_mothers_day', name: 'Aprovação Final PDV', category: 'Aprovação', days_offset: -20, color: '#f59e0b', order_index: 4 },
            { id: '5', template_id: 'tpl_mothers_day', name: 'Envio para Gráfica', category: 'Produção', days_offset: -18, color: '#3b82f6', order_index: 5 },
            { id: '6', template_id: 'tpl_mothers_day', name: 'Entrega de Material nas Lojas', category: 'Logística', days_offset: -7, color: '#10b981', order_index: 6 },
            { id: '7', template_id: 'tpl_mothers_day', name: 'Início da Mídia Paga', category: 'Mídia', days_offset: -5, color: '#ef4444', order_index: 7 },
        ] as CampaignTemplateStep[]
    },
    {
        id: 'tpl_liquida',
        name: 'Liquidação Rápida',
        description: 'Processo curto para saldões de final de semana.',
        steps: [
            { id: '1', template_id: 'tpl_liquida', name: 'Definição de Produtos/Preços', category: 'Planejamento', days_offset: -10, color: '#9333ea', order_index: 1 },
            { id: '2', template_id: 'tpl_liquida', name: 'Criação de Artes Digitais', category: 'Produção', days_offset: -7, color: '#3b82f6', order_index: 2 },
            { id: '3', template_id: 'tpl_liquida', name: 'Aprovação', category: 'Aprovação', days_offset: -5, color: '#f59e0b', order_index: 3 },
            { id: '4', template_id: 'tpl_liquida', name: 'Disparo WhatsApp / Email', category: 'Mídia', days_offset: -1, color: '#ef4444', order_index: 4 },
        ] as CampaignTemplateStep[]
    }
]

export default function CreateCampaign() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        name: '',
        type: 'Sazonal',
        start_date: '', // The main date
        end_date: '',
        priority: 'medium',
        template_id: ''
    })

    const selectedTemplate = MOCK_TEMPLATES.find(t => t.id === formData.template_id)
    const generatedSteps = (formData.start_date && selectedTemplate) 
        ? generateReverseSchedule('draft', formData.start_date, selectedTemplate.steps) 
        : []

    const handleNext = () => setStep(s => s + 1)
    const handleBack = () => setStep(s => s - 1)

    const handleSave = async () => {
        // Here we would insert the campaign and its steps into Supabase.
        // const supabase = createClient()
        // const { data: camp } = await supabase.from('campaigns').insert({...}).select().single()
        // await supabase.from('campaign_steps').insert(generatedSteps.map(s => ({...s, campaign_id: camp.id})))
        
        router.push('/marketing') // Simulate success
    }

    return (
        <div className="p-4 sm:p-8 max-w-4xl mx-auto pb-32">
            <Link href="/marketing" className="flex items-center text-slate-500 hover:text-slate-800 font-semibold mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
            </Link>

            <div className="mb-8">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Nova Campanha</h1>
                <p className="text-slate-500 font-medium mt-1">Siga os passos para automatizar seu cronograma reverso.</p>
            </div>

            {/* Stepper Progress */}
            <div className="flex items-center mb-8">
                <div className={`flex-1 h-2 rounded-l-full ${step >= 1 ? 'bg-brand-orange' : 'bg-slate-200'}`} />
                <div className={`flex-1 h-2 ${step >= 2 ? 'bg-brand-orange' : 'bg-slate-200'}`} />
                <div className={`flex-1 h-2 rounded-r-full ${step >= 3 ? 'bg-brand-orange' : 'bg-slate-200'}`} />
            </div>

            <Card className="p-6 md:p-10 rounded-3xl border-none shadow-xl bg-white">
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="text-2xl font-black text-slate-800 mb-6">Informações Básicas</h2>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-slate-600 font-bold">Nome da Campanha</Label>
                                <Input 
                                    id="name" 
                                    placeholder="Ex: Dia das Mães 2026" 
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-brand-orange text-lg"
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type" className="text-slate-600 font-bold">Tipo</Label>
                                    <select 
                                        id="type"
                                        value={formData.type}
                                        onChange={e => setFormData({...formData, type: e.target.value})}
                                        className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                                    >
                                        <option value="Sazonal">Sazonal</option>
                                        <option value="Liquidação">Liquidação</option>
                                        <option value="Institucional">Institucional</option>
                                        <option value="Evento">Evento</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="priority" className="text-slate-600 font-bold">Prioridade</Label>
                                    <select 
                                        id="priority"
                                        value={formData.priority}
                                        onChange={e => setFormData({...formData, priority: e.target.value})}
                                        className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                                    >
                                        <option value="low">Baixa</option>
                                        <option value="medium">Média</option>
                                        <option value="high">Alta</option>
                                        <option value="critical">Crítica</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start_date" className="text-slate-600 font-bold">Data Principal (Início da Ação)</Label>
                                    <Input 
                                        id="start_date" 
                                        type="date"
                                        value={formData.start_date}
                                        onChange={e => setFormData({...formData, start_date: e.target.value})}
                                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-brand-orange"
                                    />
                                    <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-1">
                                        <Info className="w-3 h-3"/> O cronograma reverso calculará os prazos a partir desta data.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end_date" className="text-slate-600 font-bold">Data de Término</Label>
                                    <Input 
                                        id="end_date" 
                                        type="date"
                                        value={formData.end_date}
                                        onChange={e => setFormData({...formData, end_date: e.target.value})}
                                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-brand-orange"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-6">
                            <Button 
                                onClick={handleNext} 
                                disabled={!formData.name || !formData.start_date}
                                className="bg-brand-orange hover:bg-orange-600 text-white font-bold rounded-xl h-12 px-8"
                            >
                                Avançar
                            </Button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="text-2xl font-black text-slate-800 mb-6">Selecione o Template</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {MOCK_TEMPLATES.map(template => (
                                <div 
                                    key={template.id}
                                    onClick={() => setFormData({...formData, template_id: template.id})}
                                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${formData.template_id === template.id ? 'border-brand-orange bg-orange-50/50' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg text-slate-800">{template.name}</h3>
                                        {formData.template_id === template.id && <CheckCircle2 className="w-5 h-5 text-brand-orange" />}
                                    </div>
                                    <p className="text-sm text-slate-500 mb-4 h-10">{template.description}</p>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">
                                        {template.steps.length} Etapas Automáticas
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between pt-6">
                            <Button variant="ghost" onClick={handleBack} className="font-bold rounded-xl h-12 px-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100">
                                Voltar
                            </Button>
                            <Button 
                                onClick={handleNext} 
                                disabled={!formData.template_id}
                                className="bg-brand-orange hover:bg-orange-600 text-white font-bold rounded-xl h-12 px-8"
                            >
                                Avançar
                            </Button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="text-2xl font-black text-slate-800 mb-2">Revisão do Cronograma</h2>
                        <p className="text-slate-500">Baseado no template escolhido e na data de início, criamos este fluxo de produção:</p>

                        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 mt-6 relative before:absolute before:left-10 before:top-12 before:bottom-12 before:w-0.5 before:bg-slate-200">
                            {generatedSteps.map((s, idx) => (
                                <div key={idx} className="flex gap-6 mb-6 relative z-10">
                                    <div 
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-md border-4 border-slate-50"
                                        style={{ backgroundColor: s.color || '#3b82f6' }}
                                    >
                                        <span className="font-bold text-sm">{idx + 1}</span>
                                    </div>
                                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-slate-800">{s.name}</h4>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 mt-1 inline-block">
                                                    {s.category}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-slate-700">
                                                    {s.target_date ? format(parseISO(s.target_date), "dd 'de' MMMM", { locale: ptBR }) : ''}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {selectedTemplate?.steps[idx].days_offset} dias da ação
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between pt-6">
                            <Button variant="ghost" onClick={handleBack} className="font-bold rounded-xl h-12 px-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100">
                                Voltar
                            </Button>
                            <Button 
                                onClick={handleSave} 
                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase italic tracking-widest rounded-xl h-12 px-8 shadow-lg shadow-emerald-500/30"
                            >
                                Salvar e Gerar Painel
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    )
}
