'use client'

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Campaign, CampaignStep } from "@/types/campaigns"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock, Paperclip, MessageSquare, LayoutList, CalendarRange, Search } from "lucide-react"
import Link from "next/link"
import { format, parseISO, differenceInDays, eachDayOfInterval, eachMonthOfInterval, isSameMonth } from "date-fns"
import { ptBR } from "date-fns/locale"

// dnd-kit for drag and drop
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// MOCK DATA for demonstration
const MOCK_CAMPAIGN: Campaign = {
    id: '1',
    company_id: '123',
    name: 'Dia das Mães 2026',
    type: 'Sazonal',
    start_date: '2026-05-10',
    end_date: '2026-05-12',
    status: 'active',
    priority: 'critical',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
}

const MOCK_STEPS: CampaignStep[] = [
    { id: '1', campaign_id: '1', name: 'Briefing da Campanha', category: 'Planejamento', status: 'completed', target_date: '2026-03-25', color: '#9333ea', order_index: 1, created_at: '', updated_at: '' },
    { id: '2', campaign_id: '1', name: 'Aprovação de Roteiro', category: 'Aprovação', status: 'completed', target_date: '2026-04-05', color: '#f59e0b', order_index: 2, created_at: '', updated_at: '' },
    { id: '3', campaign_id: '1', name: 'Produção Audiovisual', category: 'Produção', status: 'delayed', target_date: '2026-04-10', color: '#3b82f6', order_index: 3, created_at: '', updated_at: '' },
    { id: '4', campaign_id: '1', name: 'Aprovação Final PDV', category: 'Aprovação', status: 'pending', target_date: '2026-04-20', color: '#f59e0b', order_index: 4, created_at: '', updated_at: '' },
    { id: '5', campaign_id: '1', name: 'Envio para Gráfica', category: 'Produção', status: 'pending', target_date: '2026-04-22', color: '#3b82f6', order_index: 5, created_at: '', updated_at: '' },
]

function SortableStepRow({ step }: { step: CampaignStep }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`flex items-center gap-4 p-4 bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors ${isDragging ? 'shadow-xl rounded-xl border border-brand-orange' : ''}`}
        >
            <div 
                {...attributes} 
                {...listeners}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-400"
            >
                ⋮⋮
            </div>
            <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                <div className="col-span-5 flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: step.color }} />
                    <span className="font-bold text-slate-800">{step.name}</span>
                </div>
                <div className="col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                        {step.category}
                    </span>
                </div>
                <div className="col-span-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase ${
                        step.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                        step.status === 'delayed' ? 'bg-red-50 text-red-600' :
                        step.status === 'in_progress' ? 'bg-blue-50 text-blue-600' :
                        'bg-slate-100 text-slate-500'
                    }`}>
                        {step.status === 'completed' ? 'Concluído' :
                         step.status === 'delayed' ? 'Atrasado' :
                         step.status === 'in_progress' ? 'Em Progresso' : 'Pendente'}
                    </span>
                </div>
                <div className="col-span-2 flex items-center text-sm font-semibold text-slate-700">
                    <Clock className="w-4 h-4 mr-2 text-slate-400" />
                    {format(parseISO(step.target_date), "dd MMM", { locale: ptBR })}
                </div>
                <div className="col-span-1 flex justify-end gap-2 text-slate-400">
                    <MessageSquare className="w-4 h-4 cursor-pointer hover:text-brand-orange" />
                    <Paperclip className="w-4 h-4 cursor-pointer hover:text-brand-orange" />
                </div>
            </div>
        </div>
    );
}

export default function CampaignDetail() {
    const params = useParams()
    const [campaign, setCampaign] = useState<Campaign | null>(null)
    const [steps, setSteps] = useState<CampaignStep[]>([])
    const [view, setView] = useState<'list' | 'gantt'>('list')

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        // Fetch campaign details and steps from DB using params.id
        // Mocking for now:
        setTimeout(() => {
            setCampaign(MOCK_CAMPAIGN)
            setSteps(MOCK_STEPS)
        }, 300)
    }, [params.id])

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setSteps((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    if (!campaign) return (
        <div className="p-8 flex justify-center"><div className="animate-pulse h-8 w-32 bg-slate-200 rounded-xl"></div></div>
    )

    // Calculate Gantt Timeline
    const startDate = parseISO(steps[0]?.target_date || campaign.start_date)
    const endDate = parseISO(campaign.start_date)
    const totalDays = Math.max(1, differenceInDays(endDate, startDate) + 5) // Add 5 days padding

    return (
        <div className="p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto pb-32">
            <Link href="/marketing" className="flex items-center text-slate-500 hover:text-slate-800 font-semibold mb-2 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
            </Link>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-orange/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-black uppercase tracking-widest text-brand-orange bg-orange-50 px-3 py-1 rounded-lg">
                            {campaign.type}
                        </span>
                        <span className={`text-xs font-bold px-3 py-1 rounded-lg uppercase ${
                            campaign.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                            {campaign.status === 'active' ? 'Ativa' : 'Rascunho'}
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">{campaign.name}</h1>
                    <p className="text-slate-500 font-medium mt-2 flex items-center gap-4">
                        <span>Lançamento: <strong className="text-slate-700">{format(parseISO(campaign.start_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}</strong></span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span>Prioridade: <strong className="text-amber-600 uppercase">Alta</strong></span>
                    </p>
                </div>

                <div className="flex gap-2 relative z-10">
                    <Button variant="outline" className="rounded-xl font-bold h-11 border-slate-200">
                        <Paperclip className="w-4 h-4 mr-2" /> Arquivos
                    </Button>
                    <Button className="rounded-xl font-bold h-11 bg-slate-900 hover:bg-slate-800 text-white">
                        Editar Campanha
                    </Button>
                </div>
            </div>

            {/* View Controls */}
            <div className="flex items-center justify-between mt-8 mb-4">
                <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
                    <button 
                        onClick={() => setView('list')}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'list' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <LayoutList className="w-4 h-4 mr-2" /> Lista
                    </button>
                    <button 
                        onClick={() => setView('gantt')}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'gantt' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <CalendarRange className="w-4 h-4 mr-2" /> Linha do Tempo
                    </button>
                </div>

                <div className="flex items-center bg-white rounded-xl border border-slate-200 px-3 py-2 w-64 shadow-sm">
                    <Search className="w-4 h-4 text-slate-400 mr-2" />
                    <input type="text" placeholder="Buscar etapa..." className="bg-transparent border-none outline-none text-sm font-medium w-full" />
                </div>
            </div>

            {/* Content Area */}
            <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
                {view === 'list' ? (
                    <div className="w-full">
                        <div className="grid grid-cols-12 gap-4 px-12 py-4 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <div className="col-span-5">Etapa / Tarefa</div>
                            <div className="col-span-2">Categoria</div>
                            <div className="col-span-2">Status</div>
                            <div className="col-span-2">Prazo</div>
                            <div className="col-span-1 text-right">Ações</div>
                        </div>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                {steps.map(step => (
                                    <SortableStepRow key={step.id} step={step} />
                                ))}
                            </SortableContext>
                        </DndContext>
                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <Button variant="ghost" className="text-brand-orange font-bold hover:bg-orange-50 hover:text-brand-orange">
                                + Adicionar Etapa
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <div className="min-w-max p-6 relative">
                            <div className="flex flex-col w-full mb-4">
                                {/* Months Row */}
                                <div className="flex border-b border-slate-50 bg-slate-50/50 ml-[250px]">
                                    {(() => {
                                        const viewStartDate = startDate;
                                        const viewEndDate = endDate;
                                        const days = eachDayOfInterval({ start: viewStartDate, end: viewEndDate })
                                        const months = eachMonthOfInterval({ start: viewStartDate, end: viewEndDate })
                                        const DAY_WIDTH = 40;

                                        return months.map(month => {
                                            const daysInMonth = days.filter(d => isSameMonth(d, month)).length;
                                            if (daysInMonth === 0) return null;
                                            return (
                                                <div 
                                                    key={month.toString()} 
                                                    className="py-2 px-4 text-xs font-black text-slate-700 uppercase tracking-widest border-r border-slate-100 last:border-none"
                                                    style={{ width: `${daysInMonth * DAY_WIDTH}px` }}
                                                >
                                                    {format(month, 'MMMM yyyy', { locale: ptBR })}
                                                </div>
                                            )
                                        })
                                    })()}
                                </div>
                                {/* Days Row */}
                                <div className="flex bg-white ml-[250px]">
                                    {(() => {
                                        const viewStartDate = startDate;
                                        const viewEndDate = endDate;
                                        const days = eachDayOfInterval({ start: viewStartDate, end: viewEndDate })
                                        const DAY_WIDTH = 40;

                                        return days.map(day => {
                                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                            return (
                                                <div 
                                                    key={day.toString()} 
                                                    className={`flex flex-col items-center justify-center py-2 border-r border-slate-100 last:border-none shrink-0 ${isWeekend ? 'bg-slate-50/50 text-slate-400' : 'text-slate-600'}`}
                                                    style={{ width: `${DAY_WIDTH}px` }}
                                                >
                                                    <span className="text-[9px] uppercase font-bold">{format(day, 'EEE', { locale: ptBR }).substring(0, 3)}</span>
                                                    <span className="text-sm font-semibold">{format(day, 'dd')}</span>
                                                </div>
                                            )
                                        })
                                    })()}
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                {steps.map((step) => {
                                    const targetDate = parseISO(step.target_date)
                                    const dayIndex = differenceInDays(targetDate, startDate)
                                    const DAY_WIDTH = 40;
                                    const visualDurationDays = 4;
                                    const leftOffset = 250 + ((dayIndex - visualDurationDays + 1) * DAY_WIDTH);
                                    const width = visualDurationDays * DAY_WIDTH;
                                    
                                    return (
                                        <div key={step.id} className="flex items-center relative group hover:bg-slate-50/50 h-10">
                                            <div className="sticky left-0 z-10 w-[250px] shrink-0 truncate text-xs font-bold text-slate-700 bg-white border-r border-slate-100 flex items-center pr-4 pl-2 h-full">
                                                <div className="w-2 h-2 rounded-full mr-3 shrink-0" style={{ backgroundColor: step.color }} />
                                                {step.name}
                                            </div>
                                            
                                            <div 
                                                className="absolute top-1 bottom-1 rounded-xl shadow-sm flex items-center px-3 cursor-pointer hover:shadow-md transition-all group-hover:scale-[1.01] border border-black/10"
                                                style={{ 
                                                    left: `${leftOffset}px`, 
                                                    width: `${width}px`,
                                                    backgroundColor: step.color,
                                                    color: 'white'
                                                }}
                                            >
                                                <span className="text-[10px] font-black truncate drop-shadow-md">{format(targetDate, "dd MMM", { locale: ptBR })}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { height: 12px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; border: 3px solid #f1f5f9; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />
        </div>
    )
}
