"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchHoldingDashboardDataAction } from "./actions";
import { HeatmapPixelChart, DailyDataPoint } from "@/components/holding/HeatmapPixelChart";
import { 
  Building2, 
  Store, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Award, 
  Plus,
  Search,
  Mail,
  Phone,
  Building,
  CheckCircle2,
  Clock,
  MessageCircle,
  Trash2,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type DateFilterPreset = "yesterday" | "last_7_days" | "last_30_days" | "custom";

interface GroupOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: "accepted" | "pending" | "rejected";
}

interface StoreOption {
  id: string;
  group_id?: string;
  name: string;
  group_name?: string;
  email?: string;
  phone?: string;
  created_at?: string;
  total_transactions?: number;
}

interface StoreRanking {
  store_id: string;
  store_name: string;
  total_sales: number;
  total_transactions: number;
}

function HoldingDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<string>("overview");

  useEffect(() => {
    if (tabParam && ["overview", "groups", "companies", "customers"].includes(tabParam)) {
      setActiveTab(tabParam);
    } else {
      setActiveTab("overview");
    }
  }, [tabParam]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/qrido/holding?tab=${tab}`);
  };

  const [preset, setPreset] = useState<DateFilterPreset>("last_30_days");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [acceptedGroups, setAcceptedGroups] = useState<GroupOption[]>([]);
  const [allInvitedGroups, setAllInvitedGroups] = useState<GroupOption[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [companySearchTerm, setCompanySearchTerm] = useState("");
  const [companySortOption, setCompanySortOption] = useState<"created_at" | "alphabetical" | "engagement">("created_at");

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [availableAllGroups, setAvailableAllGroups] = useState<any[]>([]);
  const [selectedInviteGroupId, setSelectedInviteGroupId] = useState("");

  const [loading, setLoading] = useState<boolean>(true);
  const [mktTemplate, setMktTemplate] = useState<string>('Olá {nome}, temos novidades na nossa rede!');

  useEffect(() => {
    async function loadMktTemplate() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: config } = await supabase.from('loyalty_configs').select('whatsapp_template').eq('user_id', user.id).maybeSingle();
      if (config?.whatsapp_template) {
        setMktTemplate(config.whatsapp_template);
      }
    }
    loadMktTemplate();
  }, []);

  const handleWhatsAppSend = (recipientName: string, phone?: string) => {
    if (!phone) {
      alert('Telefone não cadastrado.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const text = mktTemplate.replace(/{nome}/gi, recipientName).replace(/{pontos}/gi, '0');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };
  const [analyticsData, setAnalyticsData] = useState<{
    summary: {
      grand_total_sales: number;
      grand_points_earned: number;
      grand_points_redeemed: number;
      grand_total_transactions: number;
      active_days: number;
    };
    daily: DailyDataPoint[];
    stores: StoreRanking[];
  }>({
    summary: {
      grand_total_sales: 0,
      grand_points_earned: 0,
      grand_points_redeemed: 0,
      grand_total_transactions: 0,
      active_days: 0,
    },
    daily: [],
    stores: [],
  });

  useEffect(() => {
    const today = new Date();
    const isoToday = today.toISOString().split("T")[0];
    if (preset === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const iso = yesterday.toISOString().split("T")[0];
      setStartDate(iso);
      setEndDate(iso);
    } else if (preset === "last_7_days") {
      const d7 = new Date(today);
      d7.setDate(today.getDate() - 7);
      setStartDate(d7.toISOString().split("T")[0]);
      setEndDate(isoToday);
    } else if (preset === "last_30_days") {
      const d30 = new Date(today);
      d30.setDate(today.getDate() - 30);
      setStartDate(d30.toISOString().split("T")[0]);
      setEndDate(isoToday);
    }
  }, [preset]);

  const fetchHoldingData = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user is holding
    const { data: userProf } = await supabase.from('profiles').select('role, company_type').eq('id', user.id).single();
    if (userProf && userProf.role !== 'holding' && userProf.company_type !== 'holding' && userProf.role !== 'admin') {
      router.push('/qrido/company');
      return;
    }

    // Load groups, stores and customers via Server Action (bypassing RLS restriction on company_groups)
    const result = await fetchHoldingDashboardDataAction(user.id);
    if (result && !result.error) {
      setAllInvitedGroups(result.allInvitedGroups || []);
      setAcceptedGroups(result.acceptedGroups || []);
      setStores(result.stores || []);
      setCustomers(result.customers || []);
    }

    // Load available all groups for invite modal
    const { data: allMalls } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .or("company_type.eq.mall,role.eq.mall,role.eq.group");
    
    if (allMalls) {
      const invitedIds = (result.allInvitedGroups || []).map((inv: any) => inv.id);
      const uninvited = allMalls.filter(m => !invitedIds.includes(m.id));
      setAvailableAllGroups(uninvited);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchHoldingData();
  }, []);

  // Fetch analytics RPC/Fallback
  useEffect(() => {
    async function fetchAnalytics() {
      if (!startDate || !endDate) return;
      setLoading(true);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startIso = `${startDate}T00:00:00.000Z`;
      const endIso = `${endDate}T23:59:59.999Z`;

      let summary = {
        grand_total_sales: 0,
        grand_points_earned: 0,
        grand_points_redeemed: 0,
        grand_total_transactions: 0,
        active_days: 0,
      };
      let daily: any[] = [];
      let storeRankings: any[] = [];

      // Buscar analytics via Server Action admin (bypassing RLS em loyalty_transactions e company_groups)
      const targetStoreIds = selectedStoreId === "all" 
        ? (selectedGroupId === "all" ? stores.map(s => s.id) : stores.filter(s => s.group_id === selectedGroupId).map(s => s.id))
        : [selectedStoreId];

      if (targetStoreIds.length > 0) {
        const { fetchHoldingAnalyticsAction } = await import("./actions");
        const analyticsRes = await fetchHoldingAnalyticsAction(targetStoreIds, startIso, endIso);
        if (analyticsRes && !analyticsRes.error && analyticsRes.summary) {
          summary = analyticsRes.summary;
          daily = analyticsRes.daily || [];
          storeRankings = analyticsRes.stores || [];
        }
      }

      setAnalyticsData({
        summary,
        daily,
        stores: storeRankings,
      });
      setLoading(false);
    }

    fetchAnalytics();
  }, [startDate, endDate, selectedGroupId, selectedStoreId, stores]);

  const handleSendInvite = async () => {
    if (!selectedInviteGroupId) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Verificar se já existe um convite registrado para este grupo
    const { data: existing } = await supabase
      .from("holding_groups")
      .select("id, status")
      .eq("holding_id", user.id)
      .eq("group_id", selectedInviteGroupId)
      .maybeSingle();

    let error;
    if (existing) {
      if (existing.status === 'pending') {
        alert("Este convite já foi enviado anteriormente e está aguardando a confirmação do Grupo!");
        setShowInviteModal(false);
        return;
      }
      const res = await supabase.from("holding_groups").update({ status: "pending" }).eq("id", existing.id);
      error = res.error;
    } else {
      const res = await supabase.from("holding_groups").insert({
        holding_id: user.id,
        group_id: selectedInviteGroupId,
        status: "pending",
      });
      error = res.error;
    }

    if (error) {
      alert("Erro ao enviar convite: " + error.message);
    } else {
      alert("Convite enviado com sucesso para o Grupo!");
      setShowInviteModal(false);
      fetchHoldingData();
    }
  };

  const handleRemoveInvite = async (groupId: string) => {
    if (!confirm("Deseja remover este grupo da holding?")) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("holding_groups").delete().eq("holding_id", user.id).eq("group_id", groupId);
    fetchHoldingData();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#167657]/10 text-[#167657] text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
              PAINEL HOLDING
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1 uppercase italic">
            Gestão de Performance de Grupos & Lojas
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-0.5">
            Acompanhe o desempenho consolidado dos grupos e lojas conveniados.
          </p>
        </div>

        <Button className="btn-emerald h-11 px-6 rounded-2xl font-black italic uppercase text-xs shadow-md" onClick={() => setShowInviteModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> CONVIDAR GRUPO
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-slate-100/70 p-1.5 rounded-2xl w-fit border border-slate-200/50">
        <button
          onClick={() => handleTabChange("overview")}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === "overview" ? "bg-white text-[#167657] shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          DASHBOARD
        </button>
        <button
          onClick={() => handleTabChange("groups")}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === "groups" ? "bg-white text-[#167657] shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          MEUS GRUPOS ({allInvitedGroups.length})
        </button>
        <button
          onClick={() => handleTabChange("companies")}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === "companies" ? "bg-white text-[#167657] shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          MINHAS LOJAS ({stores.length})
        </button>
        <button
          onClick={() => handleTabChange("customers")}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === "customers" ? "bg-white text-[#167657] shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          CLIENTES ({customers.length})
        </button>
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Preset & Filters */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Filtrar Período:</span>
              <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <button onClick={() => setPreset("yesterday")} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${preset === "yesterday" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>Dia -1</button>
                <button onClick={() => setPreset("last_7_days")} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${preset === "last_7_days" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>Últimos 7 dias</button>
                <button onClick={() => setPreset("last_30_days")} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${preset === "last_30_days" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>Últimos 30 dias</button>
                <button onClick={() => setPreset("custom")} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${preset === "custom" ? "bg-[#167657] text-white shadow-sm" : "text-slate-600"}`}>Personalizado</button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#297CCB]" /> Grupo Conveniado
                </label>
                <select 
                  value={selectedGroupId} 
                  onChange={(e) => {
                    setSelectedGroupId(e.target.value);
                    setSelectedStoreId("all");
                  }} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#167657]"
                >
                  <option value="all">Todos os Grupos Aceitos</option>
                  {acceptedGroups.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-[#167657]" /> Loja Específica
                </label>
                <select value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#167657]">
                  <option value="all">Todas as Lojas</option>
                  {stores
                    .filter((s) => selectedGroupId === "all" || s.group_id === selectedGroupId)
                    .map((s) => (<option key={s.id} value={s.id}>{s.name} ({s.group_name})</option>))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" /> Data Início
                </label>
                <input type="date" disabled={preset !== "custom"} value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 disabled:opacity-50" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" /> Data Fim
                </label>
                <input type="date" disabled={preset !== "custom"} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 disabled:opacity-50" />
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="border-none shadow-xl bg-[#167657] text-white rounded-3xl p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-white/70">Vendas (R$)</span>
                <DollarSign className="w-5 h-5 text-white/80" />
              </div>
              <div className="text-3xl font-black italic">
                R$ {analyticsData.summary.grand_total_sales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </Card>

            <Card className="border-none shadow-xl bg-[#297CCB] text-white rounded-3xl p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-white/70">Pontos Emitidos</span>
                <Award className="w-5 h-5 text-white/80" />
              </div>
              <div className="text-3xl font-black italic">
                {analyticsData.summary.grand_points_earned.toLocaleString("pt-BR")} pts
              </div>
            </Card>

            <Card className="border-none shadow-xl bg-brand-orange text-white rounded-3xl p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-white/70">Pontos Resgatados</span>
                <Users className="w-5 h-5 text-white/80" />
              </div>
              <div className="text-3xl font-black italic">
                {analyticsData.summary.grand_points_redeemed.toLocaleString("pt-BR")} pts
              </div>
            </Card>

            <Card className="border-none shadow-xl bg-[#f7aa1c] text-white rounded-3xl p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-white/70">Transações</span>
                <TrendingUp className="w-5 h-5 text-white/80" />
              </div>
              <div className="text-3xl font-black italic">
                {analyticsData.summary.grand_total_transactions}
              </div>
            </Card>
          </div>

          {/* Heatmap Pixel Matrix */}
          <HeatmapPixelChart
            data={analyticsData.daily}
            startDate={startDate || "2026-07-01"}
            endDate={endDate || "2026-07-27"}
            title="Mapa de Venda"
            subtitle="Movimentação diária por volume de vendas respeitando a paleta oficial Qrido"
          />
        </div>
      )}

      {/* GROUPS TAB */}
      {activeTab === "groups" && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm overflow-hidden space-y-4">
            <h3 className="text-lg font-black italic uppercase text-slate-900">Grupos Convidados & Ativos</h3>
            {allInvitedGroups.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium">
                Nenhum grupo convidado ainda. Clique em "+ CONVIDAR GRUPO" para enviar um convite.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allInvitedGroups.map(grp => (
                  <Card key={grp.id} className="border border-slate-100 shadow-xs rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-[#167657]" />
                        <span className="font-black text-slate-900 uppercase italic text-sm">{grp.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {grp.phone && (
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold text-xs" title="Enviar mensagem via WhatsApp MKT" onClick={() => handleWhatsAppSend(grp.name, grp.phone)}>
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => handleRemoveInvite(grp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      {grp.email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {grp.email}</p>}
                      {grp.phone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {grp.phone}</p>}
                    </div>
                    <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Status Convite</span>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${grp.status === 'accepted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                        {grp.status === 'accepted' ? 'ACEITO' : 'PENDENTE'}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STORES TAB */}
      {activeTab === "companies" && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm overflow-hidden space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-lg font-black italic uppercase text-slate-900">Lojas Conveniadas dos Grupos Aceitos</h3>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 w-full">
                <Search className="h-4 w-4 text-slate-400 ml-1" />
                <Input
                  placeholder="Buscar loja por nome, e-mail ou grupo..."
                  className="border-none shadow-none focus-visible:ring-0 text-slate-600 font-medium placeholder:text-slate-400 text-xs bg-transparent"
                  value={companySearchTerm}
                  onChange={(e) => setCompanySearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 bg-slate-50 h-[46px] px-4 rounded-2xl border border-slate-100 shrink-0 w-full md:w-auto">
                <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Ordenar por:</span>
                <select
                  className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer pr-2 outline-none w-full md:w-auto"
                  value={companySortOption}
                  onChange={(e) => setCompanySortOption(e.target.value as any)}
                >
                  <option value="created_at">Ordem de Cadastro</option>
                  <option value="alphabetical">Ordem Alfabética (A-Z)</option>
                  <option value="engagement">Engajamento</option>
                </select>
              </div>
            </div>

            {stores.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium">
                Nenhuma loja vinculada aos grupos aceitos até o momento.
              </div>
            ) : (() => {
              const filteredStores = stores.filter(st => {
                const matchesSearch = st.name?.toLowerCase().includes(companySearchTerm.toLowerCase()) ||
                  st.email?.toLowerCase().includes(companySearchTerm.toLowerCase()) ||
                  st.group_name?.toLowerCase().includes(companySearchTerm.toLowerCase()) ||
                  st.phone?.includes(companySearchTerm);
                return matchesSearch;
              }).sort((a, b) => {
                if (companySortOption === "alphabetical") {
                  return (a.name || "").localeCompare(b.name || "", "pt", { sensitivity: "base" });
                }
                if (companySortOption === "engagement") {
                  return (b.total_transactions || 0) - (a.total_transactions || 0);
                }
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
              });

              if (filteredStores.length === 0) {
                return (
                  <div className="text-center py-12 text-slate-400 font-medium">
                    Nenhuma loja encontrada com o filtro selecionado.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStores.map(st => (
                    <Card key={st.id} className="border border-slate-100 shadow-xs rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Store className="w-5 h-5 text-[#297CCB]" />
                          <div>
                            <span className="font-black text-slate-900 uppercase italic text-sm block">{st.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Grupo: {st.group_name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-50">
                        {st.email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {st.email}</p>}
                        {st.phone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {st.phone}</p>}
                      </div>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* CUSTOMERS TAB */}
      {activeTab === "customers" && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm overflow-hidden space-y-4">
            <h3 className="text-lg font-black italic uppercase text-slate-900">Clientes Atendidos pela Rede</h3>
            {customers.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium">
                Nenhum cliente registrado nas lojas da holding.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Telefone</th>
                      <th className="py-3 px-4">Saldo Pontos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {customers.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{c.name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{c.phone || '-'}</td>
                        <td className="py-3.5 px-4 font-black text-[#167657]">{c.points_balance || 0} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INVITE GROUP MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-none shadow-2xl overflow-hidden rounded-[32px] animate-in zoom-in-95 bg-white">
            <CardHeader className="p-8 border-b border-slate-50">
              <CardTitle className="text-2xl font-black italic uppercase text-[#167657]">
                Convidar Grupo / Mercado
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selecione o Grupo</Label>
                <select
                  value={selectedInviteGroupId}
                  onChange={(e) => setSelectedInviteGroupId(e.target.value)}
                  className="w-full h-12 rounded-xl border border-slate-100 px-4 font-bold text-slate-600 bg-slate-50 outline-none focus:border-[#167657]"
                >
                  <option value="">Selecione um grupo disponível...</option>
                  {availableAllGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.full_name} ({g.email || 'Sem e-mail'})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <Button type="button" variant="ghost" className="font-bold uppercase text-xs" onClick={() => setShowInviteModal(false)}>Cancelar</Button>
                <Button type="button" className="btn-emerald h-12 px-8 rounded-xl font-black italic uppercase" onClick={handleSendInvite}>Enviar Convite</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function HoldingDashboardPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400 font-bold animate-pulse uppercase italic">Sincronizando Holding...</div>}>
      <HoldingDashboardContent />
    </React.Suspense>
  );
}
