'use client'

import { useState, useEffect } from "react"
import { Campaign, CampaignStep } from "@/types/campaigns"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Search, Filter } from "lucide-react"
import Link from "next/link"
import { format, parseISO, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, isSameMonth, isToday, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"

// MOCK DATA BASED ON RETAIL CALENDAR (JAN-OUT 2026)
const MOCK_CAMPAIGNS: Campaign[] = [
    { id: '1', company_id: '123', name: 'LIQUIDA', type: 'Liquidação', start_date: '2026-01-01', end_date: '2026-07-21', status: 'active', priority: 'high', created_at: '', updated_at: '' },
    { id: '2', company_id: '123', name: 'VOLTA AS AULAS', type: 'Sazonal', start_date: '2026-01-15', end_date: '2026-02-15', status: 'active', priority: 'high', created_at: '', updated_at: '' },
    { id: '3', company_id: '123', name: 'CARNAVAL / NOVIDADES', type: 'Sazonal', start_date: '2026-01-01', end_date: '2026-03-10', status: 'active', priority: 'medium', created_at: '', updated_at: '' },
    { id: '4', company_id: '123', name: 'PREVIEW OUTONO/INVERNO', type: 'Lançamento', start_date: '2026-02-11', end_date: '2026-04-01', status: 'draft', priority: 'high', created_at: '', updated_at: '' },
    { id: '5', company_id: '123', name: 'COLEÇÃO INVERNO', type: 'Lançamento', start_date: '2026-02-24', end_date: '2026-06-30', status: 'draft', priority: 'critical', created_at: '', updated_at: '' },
    { id: '6', company_id: '123', name: 'DIA DAS MÃES', type: 'Sazonal', start_date: '2026-03-02', end_date: '2026-05-10', status: 'draft', priority: 'critical', created_at: '', updated_at: '' },
    { id: '7', company_id: '123', name: 'NAMORADOS', type: 'Sazonal', start_date: '2026-04-01', end_date: '2026-06-12', status: 'draft', priority: 'high', created_at: '', updated_at: '' },
    { id: '8', company_id: '123', name: 'PREVIEW VERÃO', type: 'Lançamento', start_date: '2026-05-23', end_date: '2026-08-31', status: 'draft', priority: 'medium', created_at: '', updated_at: '' },
    { id: '9', company_id: '123', name: 'DIA DOS PAIS', type: 'Sazonal', start_date: '2026-06-01', end_date: '2026-08-09', status: 'draft', priority: 'critical', created_at: '', updated_at: '' },
    { id: '10', company_id: '123', name: 'CLÁSSICOS', type: 'Perene', start_date: '2026-07-23', end_date: '2026-08-09', status: 'draft', priority: 'medium', created_at: '', updated_at: '' },
    { id: '11', company_id: '123', name: 'VERÃO 1 E 2', type: 'Lançamento', start_date: '2026-07-01', end_date: '2026-10-31', status: 'draft', priority: 'high', created_at: '', updated_at: '' },
    { id: '12', company_id: '123', name: 'DIA DAS CRIANÇAS', type: 'Sazonal', start_date: '2026-07-21', end_date: '2026-10-12', status: 'draft', priority: 'critical', created_at: '', updated_at: '' },
    { id: '13', company_id: '123', name: 'ANIVERSÁRIO PASSALETTI', type: 'Promoção', start_date: '2026-09-02', end_date: '2026-09-21', status: 'draft', priority: 'critical', created_at: '', updated_at: '' },
    { id: '14', company_id: '123', name: 'PREVIEW FESTAS/NATAL', type: 'Lançamento', start_date: '2026-09-23', end_date: '2026-12-31', status: 'draft', priority: 'high', created_at: '', updated_at: '' },
    { id: '15', company_id: '123', name: 'BLACK FRIDAY', type: 'Promoção', start_date: '2026-10-23', end_date: '2026-11-30', status: 'draft', priority: 'critical', created_at: '', updated_at: '' },
    { id: '16', company_id: '123', name: 'VOLTA AS AULAS 2027', type: 'Sazonal', start_date: '2026-11-01', end_date: '2026-12-31', status: 'draft', priority: 'high', created_at: '', updated_at: '' },
    { id: '17', company_id: '123', name: 'CARNAVAL 2027', type: 'Sazonal', start_date: '2026-11-09', end_date: '2026-12-22', status: 'draft', priority: 'high', created_at: '', updated_at: '' },
]

const MOCK_STEPS: CampaignStep[] = [
    // LIQUIDA (Jan e Julho)
    { id: 's1', campaign_id: '1', name: 'Veiculação PDV', category: 'Veiculação', status: 'pending', target_date: '2026-01-31', color: '#ef4444', order_index: 1, created_at: '', updated_at: '' },
    { id: 's1b', campaign_id: '1', name: 'Call de VM', category: 'Planejamento', status: 'pending', target_date: '2026-06-22', color: '#ef4444', order_index: 2, created_at: '', updated_at: '' },
    { id: 's1c', campaign_id: '1', name: 'Veiculação PDV (Julho)', category: 'Veiculação', status: 'pending', target_date: '2026-07-21', color: '#ef4444', order_index: 3, created_at: '', updated_at: '' },
    
    // VOLTA AS AULAS
    { id: 's2', campaign_id: '2', name: 'Veiculação PDV', category: 'Veiculação', status: 'pending', target_date: '2026-02-15', color: '#3b82f6', order_index: 1, created_at: '', updated_at: '' },
    
    // CARNAVAL / NOVIDADES
    { id: 's3', campaign_id: '3', name: 'Produção Gráfica PDV', category: 'Produção', status: 'pending', target_date: '2026-01-09', color: '#22c55e', order_index: 1, created_at: '', updated_at: '' },
    { id: 's4', campaign_id: '3', name: 'Entrega Áudio Visual', category: 'Produção', status: 'pending', target_date: '2026-01-14', color: '#22c55e', order_index: 2, created_at: '', updated_at: '' },
    { id: 's5', campaign_id: '3', name: 'Entrega PDV no CD', category: 'Logística', status: 'pending', target_date: '2026-01-19', color: '#22c55e', order_index: 3, created_at: '', updated_at: '' },
    { id: 's6', campaign_id: '3', name: 'Veiculação PDV / Mídia', category: 'Veiculação', status: 'pending', target_date: '2026-03-10', color: '#22c55e', order_index: 4, created_at: '', updated_at: '' },
    
    // PREVIEW OUTONO/INVERNO
    { id: 's7', campaign_id: '4', name: 'Gravação Campanha', category: 'Produção', status: 'pending', target_date: '2026-02-12', color: '#eab308', order_index: 1, created_at: '', updated_at: '' },
    { id: 's8', campaign_id: '4', name: 'Gabarito Aprovação Final', category: 'Aprovação', status: 'pending', target_date: '2026-02-18', color: '#eab308', order_index: 2, created_at: '', updated_at: '' },
    { id: 's9', campaign_id: '4', name: 'Entrega Áudio Visual', category: 'Produção', status: 'pending', target_date: '2026-02-19', color: '#eab308', order_index: 3, created_at: '', updated_at: '' },
    { id: 's10', campaign_id: '4', name: 'Produção Gráfica PDV', category: 'Produção', status: 'pending', target_date: '2026-02-21', color: '#eab308', order_index: 4, created_at: '', updated_at: '' },
    { id: 's11', campaign_id: '4', name: 'Entrega PDV no CD', category: 'Logística', status: 'pending', target_date: '2026-02-21', color: '#eab308', order_index: 5, created_at: '', updated_at: '' },
    { id: 's12', campaign_id: '4', name: 'Call de VM', category: 'Planejamento', status: 'pending', target_date: '2026-03-02', color: '#eab308', order_index: 6, created_at: '', updated_at: '' },
    { id: 's13', campaign_id: '4', name: 'Veiculação PDV', category: 'Veiculação', status: 'pending', target_date: '2026-04-01', color: '#eab308', order_index: 7, created_at: '', updated_at: '' },

    // COLEÇÃO INVERNO
    { id: 's14', campaign_id: '5', name: 'Gravação Campanha', category: 'Produção', status: 'pending', target_date: '2026-02-26', color: '#92400e', order_index: 1, created_at: '', updated_at: '' },
    { id: 's15', campaign_id: '5', name: 'Gabarito Aprovação Final', category: 'Aprovação', status: 'pending', target_date: '2026-03-02', color: '#92400e', order_index: 2, created_at: '', updated_at: '' },
    { id: 's16', campaign_id: '5', name: 'Entrega Áudio Visual', category: 'Produção', status: 'pending', target_date: '2026-03-06', color: '#92400e', order_index: 3, created_at: '', updated_at: '' },
    { id: 's17', campaign_id: '5', name: 'Produção Gráfica PDV', category: 'Produção', status: 'pending', target_date: '2026-03-08', color: '#92400e', order_index: 4, created_at: '', updated_at: '' },
    { id: 's18', campaign_id: '5', name: 'Entrega PDV no CD', category: 'Logística', status: 'pending', target_date: '2026-03-09', color: '#92400e', order_index: 5, created_at: '', updated_at: '' },
    { id: 's19', campaign_id: '5', name: 'Veiculação PDV Momento 1', category: 'Veiculação', status: 'pending', target_date: '2026-04-30', color: '#92400e', order_index: 6, created_at: '', updated_at: '' },
    { id: 's20', campaign_id: '5', name: 'Call de VM', category: 'Planejamento', status: 'pending', target_date: '2026-05-04', color: '#92400e', order_index: 7, created_at: '', updated_at: '' },
    { id: 's21', campaign_id: '5', name: 'Veiculação PDV Momento 2', category: 'Veiculação', status: 'pending', target_date: '2026-05-31', color: '#92400e', order_index: 8, created_at: '', updated_at: '' },
    { id: 's21b', campaign_id: '5', name: 'Call de VM (Junho)', category: 'Planejamento', status: 'pending', target_date: '2026-06-08', color: '#92400e', order_index: 9, created_at: '', updated_at: '' },
    { id: 's21c', campaign_id: '5', name: 'Veiculação PDV Momento 2/3', category: 'Veiculação', status: 'pending', target_date: '2026-06-30', color: '#92400e', order_index: 10, created_at: '', updated_at: '' },

    // DIA DAS MÃES
    { id: 's22', campaign_id: '6', name: 'Reunião de Briefing', category: 'Planejamento', status: 'pending', target_date: '2026-03-02', color: '#f472b6', order_index: 1, created_at: '', updated_at: '' },
    { id: 's23', campaign_id: '6', name: 'Criação PDV/Roteiro', category: 'Criação', status: 'pending', target_date: '2026-03-06', color: '#f472b6', order_index: 2, created_at: '', updated_at: '' },
    { id: 's24', campaign_id: '6', name: 'Gravação Campanha', category: 'Produção', status: 'pending', target_date: '2026-03-14', color: '#f472b6', order_index: 3, created_at: '', updated_at: '' },
    { id: 's25', campaign_id: '6', name: 'Gabarito Aprovação', category: 'Aprovação', status: 'pending', target_date: '2026-03-17', color: '#f472b6', order_index: 4, created_at: '', updated_at: '' },
    { id: 's26', campaign_id: '6', name: 'Entrega Áudio Visual', category: 'Produção', status: 'pending', target_date: '2026-03-24', color: '#f472b6', order_index: 5, created_at: '', updated_at: '' },
    { id: 's27', campaign_id: '6', name: 'Produção Gráfica PDV', category: 'Produção', status: 'pending', target_date: '2026-03-27', color: '#f472b6', order_index: 6, created_at: '', updated_at: '' },
    { id: 's28', campaign_id: '6', name: 'Entrega PDV no CD', category: 'Logística', status: 'pending', target_date: '2026-03-28', color: '#f472b6', order_index: 7, created_at: '', updated_at: '' },
    { id: 's29', campaign_id: '6', name: 'Call de VM', category: 'Planejamento', status: 'pending', target_date: '2026-04-13', color: '#f472b6', order_index: 8, created_at: '', updated_at: '' },
    { id: 's30', campaign_id: '6', name: 'Veiculação PDV', category: 'Veiculação', status: 'pending', target_date: '2026-05-10', color: '#f472b6', order_index: 9, created_at: '', updated_at: '' },

    // NAMORADOS
    { id: 's31', campaign_id: '7', name: 'Reunião de Briefing', category: 'Planejamento', status: 'pending', target_date: '2026-04-01', color: '#10b981', order_index: 1, created_at: '', updated_at: '' },
    { id: 's32', campaign_id: '7', name: 'Criação PDV/Roteiro', category: 'Criação', status: 'pending', target_date: '2026-04-20', color: '#10b981', order_index: 2, created_at: '', updated_at: '' },
    { id: 's33', campaign_id: '7', name: 'Gravação Campanha', category: 'Produção', status: 'pending', target_date: '2026-04-27', color: '#10b981', order_index: 3, created_at: '', updated_at: '' },
    { id: 's34', campaign_id: '7', name: 'Gabarito Aprovação Final', category: 'Aprovação', status: 'pending', target_date: '2026-05-02', color: '#10b981', order_index: 4, created_at: '', updated_at: '' },
    { id: 's35', campaign_id: '7', name: 'Produção Gráfica PDV', category: 'Produção', status: 'pending', target_date: '2026-05-05', color: '#10b981', order_index: 5, created_at: '', updated_at: '' },
    { id: 's36', campaign_id: '7', name: 'Entrega PDV no CD', category: 'Logística', status: 'pending', target_date: '2026-05-06', color: '#10b981', order_index: 6, created_at: '', updated_at: '' },
    { id: 's37', campaign_id: '7', name: 'Call de VM', category: 'Planejamento', status: 'pending', target_date: '2026-05-17', color: '#10b981', order_index: 7, created_at: '', updated_at: '' },
    { id: 's38', campaign_id: '7', name: 'Veiculação PDV', category: 'Veiculação', status: 'pending', target_date: '2026-06-12', color: '#10b981', order_index: 8, created_at: '', updated_at: '' },

    // PREVIEW VERÃO
    { id: 's39', campaign_id: '8', name: 'Reunião de Briefing', category: 'Planejamento', status: 'pending', target_date: '2026-05-23', color: '#eab308', order_index: 1, created_at: '', updated_at: '' },
    { id: 's40', campaign_id: '8', name: 'Criação PDV/Roteiro', category: 'Criação', status: 'pending', target_date: '2026-05-26', color: '#eab308', order_index: 2, created_at: '', updated_at: '' },
    { id: 's40a', campaign_id: '8', name: 'Gravação Campanha', category: 'Produção', status: 'pending', target_date: '2026-06-11', color: '#eab308', order_index: 3, created_at: '', updated_at: '' },
    { id: 's40b', campaign_id: '8', name: 'Gabarito Aprovação Final', category: 'Aprovação', status: 'pending', target_date: '2026-06-16', color: '#eab308', order_index: 4, created_at: '', updated_at: '' },
    { id: 's40c', campaign_id: '8', name: 'Produção Gráfica PDV', category: 'Produção', status: 'pending', target_date: '2026-06-25', color: '#eab308', order_index: 5, created_at: '', updated_at: '' },
    { id: 's40d', campaign_id: '8', name: 'Entrega Áudio Visual', category: 'Produção', status: 'pending', target_date: '2026-06-27', color: '#eab308', order_index: 6, created_at: '', updated_at: '' },
    { id: 's40e', campaign_id: '8', name: 'Entrega PDV no CD', category: 'Logística', status: 'pending', target_date: '2026-07-18', color: '#eab308', order_index: 7, created_at: '', updated_at: '' },
    { id: 's40f', campaign_id: '8', name: 'Veiculação PDV', category: 'Veiculação', status: 'pending', target_date: '2026-08-31', color: '#eab308', order_index: 8, created_at: '', updated_at: '' },

    // DIA DOS PAIS
    { id: 's41', campaign_id: '9', name: 'Reunião de Briefing', category: 'Planejamento', status: 'pending', target_date: '2026-06-01', color: '#1e3a8a', order_index: 1, created_at: '', updated_at: '' },
    { id: 's42', campaign_id: '9', name: 'Criação PDV/Roteiro', category: 'Criação', status: 'pending', target_date: '2026-06-06', color: '#1e3a8a', order_index: 2, created_at: '', updated_at: '' },
    { id: 's43', campaign_id: '9', name: 'Gravação Campanha', category: 'Produção', status: 'pending', target_date: '2026-06-20', color: '#1e3a8a', order_index: 3, created_at: '', updated_at: '' },
    { id: 's44', campaign_id: '9', name: 'Gabarito Aprovação Final', category: 'Aprovação', status: 'pending', target_date: '2026-06-24', color: '#1e3a8a', order_index: 4, created_at: '', updated_at: '' },
    { id: 's45', campaign_id: '9', name: 'Produção Gráfica PDV', category: 'Produção', status: 'pending', target_date: '2026-06-30', color: '#1e3a8a', order_index: 5, created_at: '', updated_at: '' },
    { id: 's46', campaign_id: '9', name: 'Entrega Áudio Visual', category: 'Produção', status: 'pending', target_date: '2026-06-29', color: '#1e3a8a', order_index: 6, created_at: '', updated_at: '' },
    { id: 's47', campaign_id: '9', name: 'Entrega PDV no CD', category: 'Logística', status: 'pending', target_date: '2026-07-01', color: '#1e3a8a', order_index: 7, created_at: '', updated_at: '' },
    { id: 's48', campaign_id: '9', name: 'Veiculação PDV', category: 'Veiculação', status: 'pending', target_date: '2026-08-09', color: '#1e3a8a', order_index: 8, created_at: '', updated_at: '' },

    // CLÁSSICOS
    { id: 's49', campaign_id: '10', name: 'Veiculação PDV', category: 'Veiculação', status: 'pending', target_date: '2026-08-09', color: '#a855f7', order_index: 1, created_at: '', updated_at: '' },

    // VERÃO 1 E 2
    { id: 's50', campaign_id: '11', name: 'Reunião de Briefing', category: 'Planejamento', status: 'pending', target_date: '2026-07-02', color: '#c084fc', order_index: 1, created_at: '', updated_at: '' },
    { id: 's51', campaign_id: '11', name: 'Criação Filme/Enxoval', category: 'Criação', status: 'pending', target_date: '2026-07-06', color: '#c084fc', order_index: 2, created_at: '', updated_at: '' },
    { id: 's52', campaign_id: '11', name: 'Produção Filme/Spot', category: 'Produção', status: 'pending', target_date: '2026-07-27', color: '#c084fc', order_index: 3, created_at: '', updated_at: '' },
    { id: 's53', campaign_id: '11', name: 'Produção Enxoval PDV', category: 'Produção', status: 'pending', target_date: '2026-08-06', color: '#c084fc', order_index: 4, created_at: '', updated_at: '' },
    { id: 's54', campaign_id: '11', name: 'Aprovar Filme e Enxoval', category: 'Aprovação', status: 'pending', target_date: '2026-08-13', color: '#c084fc', order_index: 5, created_at: '', updated_at: '' },
    { id: 's55', campaign_id: '11', name: 'Produção Gráfica PDV', category: 'Produção', status: 'pending', target_date: '2026-08-19', color: '#c084fc', order_index: 6, created_at: '', updated_at: '' },
    { id: 's56', campaign_id: '11', name: 'Entrega em Loja PDV', category: 'Logística', status: 'pending', target_date: '2026-08-25', color: '#c084fc', order_index: 7, created_at: '', updated_at: '' },
    { id: 's57', campaign_id: '11', name: 'Veiculação Filme', category: 'Veiculação', status: 'pending', target_date: '2026-09-30', color: '#c084fc', order_index: 8, created_at: '', updated_at: '' },
    { id: 's58', campaign_id: '11', name: 'Veiculação Capsula 2', category: 'Veiculação', status: 'pending', target_date: '2026-10-31', color: '#c084fc', order_index: 9, created_at: '', updated_at: '' },

    // DIA DAS CRIANÇAS
    { id: 's59', campaign_id: '12', name: 'Reunião de Briefing', category: 'Planejamento', status: 'pending', target_date: '2026-07-21', color: '#86efac', order_index: 1, created_at: '', updated_at: '' },
    { id: 's60', campaign_id: '12', name: 'Criação PDV e Roteiro', category: 'Criação', status: 'pending', target_date: '2026-07-27', color: '#86efac', order_index: 2, created_at: '', updated_at: '' },
    { id: 's61', campaign_id: '12', name: 'Produção Fotos/Online', category: 'Produção', status: 'pending', target_date: '2026-08-14', color: '#86efac', order_index: 3, created_at: '', updated_at: '' },
    { id: 's62', campaign_id: '12', name: 'Produção Enxoval PDV', category: 'Produção', status: 'pending', target_date: '2026-08-19', color: '#86efac', order_index: 4, created_at: '', updated_at: '' },
    { id: 's63', campaign_id: '12', name: 'Produção Gráfica PDV', category: 'Produção', status: 'pending', target_date: '2026-08-28', color: '#86efac', order_index: 5, created_at: '', updated_at: '' },
    { id: 's64', campaign_id: '12', name: 'Entrega em Loja PDV', category: 'Logística', status: 'pending', target_date: '2026-09-20', color: '#86efac', order_index: 6, created_at: '', updated_at: '' },
    { id: 's65', campaign_id: '12', name: 'Veiculação PDV/SPOT', category: 'Veiculação', status: 'pending', target_date: '2026-10-12', color: '#86efac', order_index: 7, created_at: '', updated_at: '' },

    // ANIVERSÁRIO PASSALETTI
    { id: 's66', campaign_id: '13', name: 'Veiculação PDV/SPOT', category: 'Veiculação', status: 'pending', target_date: '2026-09-21', color: '#dc2626', order_index: 1, created_at: '', updated_at: '' },

    // PREVIEW FESTAS/NATAL
    { id: 's67', campaign_id: '14', name: 'Reunião de Briefing', category: 'Planejamento', status: 'pending', target_date: '2026-09-24', color: '#fdba74', order_index: 1, created_at: '', updated_at: '' },
    { id: 's68', campaign_id: '14', name: 'Criação de PDV/Roteiro', category: 'Criação', status: 'pending', target_date: '2026-09-30', color: '#fdba74', order_index: 2, created_at: '', updated_at: '' },
    { id: 's69', campaign_id: '14', name: 'Produção Fotos/Online', category: 'Produção', status: 'pending', target_date: '2026-10-11', color: '#fdba74', order_index: 3, created_at: '', updated_at: '' },
    { id: 's70', campaign_id: '14', name: 'Produção Enxoval PDV', category: 'Produção', status: 'pending', target_date: '2026-10-17', color: '#fdba74', order_index: 4, created_at: '', updated_at: '' },
    { id: 's71', campaign_id: '14', name: 'Produção Gráfica PDV', category: 'Produção', status: 'pending', target_date: '2026-10-24', color: '#fdba74', order_index: 5, created_at: '', updated_at: '' },
    { id: 's72', campaign_id: '14', name: 'Entrega Loja PDV CD', category: 'Logística', status: 'pending', target_date: '2026-10-31', color: '#fdba74', order_index: 6, created_at: '', updated_at: '' },

    // BLACK FRIDAY
    { id: 's73', campaign_id: '15', name: 'Produção Enxoval PDV', category: 'Produção', status: 'pending', target_date: '2026-10-24', color: '#4b5563', order_index: 1, created_at: '', updated_at: '' },
    { id: 's74', campaign_id: '15', name: 'Produção Gráfica PDV Lojas', category: 'Produção', status: 'pending', target_date: '2026-10-31', color: '#4b5563', order_index: 2, created_at: '', updated_at: '' },
    { id: 's75', campaign_id: '15', name: 'Entrega em Loja PDV CD', category: 'Logística', status: 'pending', target_date: '2026-11-14', color: '#4b5563', order_index: 3, created_at: '', updated_at: '' },
    { id: 's76', campaign_id: '15', name: 'Veiculação PDV/SPOT', category: 'Veiculação', status: 'pending', target_date: '2026-11-30', color: '#4b5563', order_index: 4, created_at: '', updated_at: '' },

    // VOLTA AS AULAS 2027
    { id: 's77', campaign_id: '16', name: 'Reunião de Briefing', category: 'Planejamento', status: 'pending', target_date: '2026-11-01', color: '#93c5fd', order_index: 1, created_at: '', updated_at: '' },
    { id: 's78', campaign_id: '16', name: 'Criação Enxoval Completo', category: 'Criação', status: 'pending', target_date: '2026-11-13', color: '#93c5fd', order_index: 2, created_at: '', updated_at: '' },
    { id: 's79', campaign_id: '16', name: 'Produção Fotos/Online', category: 'Produção', status: 'pending', target_date: '2026-11-30', color: '#93c5fd', order_index: 3, created_at: '', updated_at: '' },
    { id: 's80', campaign_id: '16', name: 'Produção Enxoval/Aprovar', category: 'Produção', status: 'pending', target_date: '2026-12-10', color: '#93c5fd', order_index: 4, created_at: '', updated_at: '' },
    { id: 's81', campaign_id: '16', name: 'Produção Gráfica PDV', category: 'Produção', status: 'pending', target_date: '2026-12-22', color: '#93c5fd', order_index: 5, created_at: '', updated_at: '' },
    { id: 's82', campaign_id: '16', name: 'Entrega em Loja PDV', category: 'Logística', status: 'pending', target_date: '2026-12-31', color: '#93c5fd', order_index: 6, created_at: '', updated_at: '' },

    // CARNAVAL 2027
    { id: 's83', campaign_id: '17', name: 'Reunião de Briefing', category: 'Planejamento', status: 'pending', target_date: '2026-11-09', color: '#f0abfc', order_index: 1, created_at: '', updated_at: '' },
    { id: 's84', campaign_id: '17', name: 'Criação Enxoval Completo', category: 'Criação', status: 'pending', target_date: '2026-11-13', color: '#f0abfc', order_index: 2, created_at: '', updated_at: '' },
    { id: 's85', campaign_id: '17', name: 'Produção Fotos/Online', category: 'Produção', status: 'pending', target_date: '2026-11-30', color: '#f0abfc', order_index: 3, created_at: '', updated_at: '' },
    { id: 's86', campaign_id: '17', name: 'Produção Enxoval/Aprovar', category: 'Produção', status: 'pending', target_date: '2026-12-08', color: '#f0abfc', order_index: 4, created_at: '', updated_at: '' },
    { id: 's87', campaign_id: '17', name: 'Produção Gráfica PDV', category: 'Produção', status: 'pending', target_date: '2026-12-16', color: '#f0abfc', order_index: 5, created_at: '', updated_at: '' },
    { id: 's88', campaign_id: '17', name: 'Entrega em Loja PDV', category: 'Logística', status: 'pending', target_date: '2026-12-22', color: '#f0abfc', order_index: 6, created_at: '', updated_at: '' },
]

export default function MarketingCalendar() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [steps, setSteps] = useState<CampaignStep[]>([])
    const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(MOCK_CAMPAIGNS.map(c => c.id))
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setTimeout(() => {
            setCampaigns(MOCK_CAMPAIGNS)
            setSteps(MOCK_STEPS)
            setLoading(false)
        }, 300)
    }, [])

    if (loading) return <div className="p-8 flex justify-center"><div className="animate-pulse h-8 w-32 bg-slate-200 rounded-xl"></div></div>

    // Timeline calculations
    // For the timeline, let's show from 15 days before the earliest step, to 30 days after the latest step
    const allDates = steps.map(s => parseISO(s.target_date))
    const earliestDate = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date()
    const latestDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date()
    
    const viewStartDate = subDays(earliestDate, 10)
    const viewEndDate = addDays(latestDate, 30)

    const days = eachDayOfInterval({ start: viewStartDate, end: viewEndDate })
    const months = eachMonthOfInterval({ start: viewStartDate, end: viewEndDate })

    // Cell width in pixels
    const DAY_WIDTH = 40;

    const filteredSteps = steps.filter(s => selectedCampaigns.includes(s.campaign_id))

    return (
        <div className="p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto pb-32">
            <Link href="/marketing" className="flex items-center text-slate-500 hover:text-slate-800 font-semibold mb-2 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
            </Link>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">Calendário Global</h1>
                    <p className="text-slate-500 font-medium mt-1">Acompanhe e cruze os cronogramas de todas as campanhas.</p>
                </div>
            </div>

            {/* Filters */}
            <Card className="p-4 rounded-2xl border border-slate-100 shadow-sm bg-white mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex items-center text-sm font-bold text-slate-500 mr-2">
                    <Filter className="w-4 h-4 mr-2" /> Filtros:
                </div>
                
                {campaigns.map(camp => (
                    <button
                        key={camp.id}
                        onClick={() => {
                            if (selectedCampaigns.includes(camp.id)) {
                                setSelectedCampaigns(selectedCampaigns.filter(id => id !== camp.id))
                            } else {
                                setSelectedCampaigns([...selectedCampaigns, camp.id])
                            }
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            selectedCampaigns.includes(camp.id) 
                                ? 'bg-brand-orange text-white border-brand-orange shadow-md shadow-orange-500/20' 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        {camp.name}
                    </button>
                ))}

                <Button 
                    variant="ghost" 
                    onClick={() => setSelectedCampaigns(selectedCampaigns.length === campaigns.length ? [] : campaigns.map(c => c.id))}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 ml-auto"
                >
                    {selectedCampaigns.length === campaigns.length ? 'Limpar Filtros' : 'Selecionar Todas'}
                </Button>
            </Card>

            {/* Advanced Gantt Chart */}
            <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <div className="min-w-max pb-8 relative">
                        
                        {/* Header: Months and Days */}
                        <div className="sticky top-0 z-20 bg-white border-b border-slate-100 pl-[250px] flex shadow-sm">
                            <div className="flex flex-col w-full">
                                {/* Months Row */}
                                <div className="flex border-b border-slate-50 bg-slate-50/50">
                                    {months.map(month => {
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
                                    })}
                                </div>
                                {/* Days Row */}
                                <div className="flex bg-white">
                                    {days.map(day => {
                                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                        const isCurrentDay = isToday(day);
                                        return (
                                            <div 
                                                key={day.toString()} 
                                                className={`flex flex-col items-center justify-center py-2 border-r border-slate-100 last:border-none shrink-0 ${isWeekend ? 'bg-slate-50/50 text-slate-400' : 'text-slate-600'} ${isCurrentDay ? 'bg-orange-50 text-brand-orange font-bold' : ''}`}
                                                style={{ width: `${DAY_WIDTH}px` }}
                                            >
                                                <span className="text-[9px] uppercase font-bold">{format(day, 'EEE', { locale: ptBR }).substring(0, 3)}</span>
                                                <span className={`text-sm ${isCurrentDay ? 'font-black' : 'font-semibold'}`}>{format(day, 'dd')}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Content: Campaigns and Steps */}
                        <div className="relative pt-4">
                            {/* Today Indicator Line */}
                            {days.findIndex(d => isToday(d)) !== -1 && (
                                <div 
                                    className="absolute top-0 bottom-0 w-0.5 bg-brand-orange z-10 opacity-50"
                                    style={{ left: `${250 + (days.findIndex(d => isToday(d)) * DAY_WIDTH) + (DAY_WIDTH / 2)}px` }}
                                />
                            )}

                            {campaigns.filter(c => selectedCampaigns.includes(c.id)).map(camp => (
                                <div key={camp.id} className="mb-8">
                                    {/* Campaign Header Row */}
                                    <div className="sticky left-0 z-10 w-[250px] bg-white border-r border-slate-100 py-3 pl-6 pr-4 mb-2 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                        <h3 className="font-black text-slate-800 uppercase tracking-tight">{camp.name}</h3>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded">{camp.type}</span>
                                    </div>

                                    {/* Steps for this campaign */}
                                    <div className="space-y-3">
                                        {filteredSteps.filter(s => s.campaign_id === camp.id).map(step => {
                                            const targetDate = parseISO(step.target_date)
                                            // The start index of the bar
                                            const dayIndex = differenceInDays(targetDate, viewStartDate)
                                            
                                            if (dayIndex < 0) return null; // Outside view

                                            // To make it look like a Gantt bar instead of a single dot, 
                                            // we will give each task a default duration of 3 days visually, ending on the target date.
                                            const visualDurationDays = 4;
                                            const leftOffset = 250 + ((dayIndex - visualDurationDays + 1) * DAY_WIDTH);
                                            const width = visualDurationDays * DAY_WIDTH;

                                            return (
                                                <div key={step.id} className="flex relative h-10 group hover:bg-slate-50/50 transition-colors">
                                                    {/* Frozen Sidebar */}
                                                    <div className="sticky left-0 z-10 w-[250px] bg-white border-r border-slate-100 flex items-center pl-8 pr-4 group-hover:bg-slate-50 transition-colors">
                                                        <div className="w-2 h-2 rounded-full mr-3 shrink-0" style={{ backgroundColor: step.color }} />
                                                        <span className="text-xs font-bold text-slate-600 truncate">{step.name}</span>
                                                    </div>

                                                    {/* Background Grid Lines */}
                                                    <div className="absolute left-[250px] right-0 top-0 bottom-0 flex z-0 pointer-events-none">
                                                        {days.map((d, i) => (
                                                            <div key={i} className="border-r border-slate-100/50" style={{ width: `${DAY_WIDTH}px` }} />
                                                        ))}
                                                    </div>

                                                    {/* The Bar */}
                                                    <div 
                                                        className="absolute top-1 bottom-1 rounded-xl shadow-sm flex items-center px-3 cursor-pointer hover:shadow-md transition-all group-hover:scale-[1.01] group-hover:z-20 border border-black/10"
                                                        style={{ 
                                                            left: `${leftOffset}px`, 
                                                            width: `${width}px`,
                                                            backgroundColor: step.color,
                                                            color: 'white'
                                                        }}
                                                    >
                                                        <span className="text-[10px] font-black uppercase tracking-wider truncate drop-shadow-md">
                                                            {format(targetDate, "dd MMM", { locale: ptBR })}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>

            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar {
                    height: 12px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 8px;
                    border: 3px solid #f1f5f9;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}} />
        </div>
    )
}
