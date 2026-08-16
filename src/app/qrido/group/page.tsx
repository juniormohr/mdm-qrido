"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HeatmapPixelChart, DailyDataPoint } from "@/components/holding/HeatmapPixelChart";
import { 
  Store, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Award, 
  Plus,
  Mail,
  Phone,
  MessageCircle,
  Trash2,
  Filter,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type DateFilterPreset = "yesterday" | "last_7_days" | "last_30_days" | "custom";

interface StoreOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: "accepted" | "pending" | "rejected";
  created_at?: string;
  total_transactions?: number;
}

interface StoreRanking {
  store_id: string;
  store_name: string;
  total_sales: number;
  total_transactions: number;
}

function GroupDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<string>("overview");

  useEffect(() => {
    if (tabParam && ["overview", "companies", "customers"].includes(tabParam)) {
      setActiveTab(tabParam);
    } else {
      setActiveTab("overview");
    }
  }, [tabParam]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/qrido/group?tab=${tab}`);
  };

  const [preset, setPreset] = useState<DateFilterPreset>("last_30_days");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [acceptedStores, setAcceptedStores] = useState<StoreOption[]>([]);
  const [allInvitedStores, setAllInvitedStores] = useState<StoreOption[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  const [companySearchTerm, setCompanySearchTerm] = useState("");
  const [companySortOption, setCompanySortOption] = useState<"created_at" | "alphabetical" | "engagement">("created_at");

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [availableStoresForInvite, setAvailableStoresForInvite] = useState<any[]>([]);
  const [selectedInviteStoreId, setSelectedInviteStoreId] = useState("");

  const [loading, setLoading] = useState<boolean>(true);
  const [mktTemplate, setMktTemplate] = useState<string>('Olá {nome}, tudo bem? Temos novidades exclusivas na nossa rede! 🎁');

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
    };
    daily: DailyDataPoint[];
    stores: StoreRanking[];
  }>({
    summary: {
      grand_total_sales: 0,
      grand_points_earned: 0,
      grand_points_redeemed: 0,
      grand_total_transactions: 0,
    },
    daily: [],
    stores: [],
  });

  useEffect(() => {
    const today = new Date();
    if (preset === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const iso = yesterday.toISOString().split("T")[0];
      setStartDate(iso);
      setEndDate(iso);
    } else if (preset === "last_7_days") {
      const d7 = new Date(today);
      d7.setDate(today.getDate() - 7);
      const d1 = new Date(today);
      d1.setDate(today.getDate() - 1);
      setStartDate(d7.toISOString().split("T")[0]);
      setEndDate(d1.toISOString().split("T")[0]);
    } else if (preset === "last_30_days") {
      const d30 = new Date(today);
      d30.setDate(today.getDate() - 30);
      const d1 = new Date(today);
      d1.setDate(today.getDate() - 1);
      setStartDate(d30.toISOString().split("T")[0]);
      setEndDate(d1.toISOString().split("T")[0]);
    }
  }, [preset]);

  const [customerSearchTerm, setCustomerSearchTerm] = useState("");

  const fetchGroupData = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { fetchGroupDashboardDataAction } = await import("./actions");
    const res = await fetchGroupDashboardDataAction(user.id);

    if (res.error) {
      console.error("Erro ao carregar dados do grupo:", res.error);
      setLoading(false);
      return;
    }

    if (res.allInvitedStores) setAllInvitedStores(res.allInvitedStores);
    if (res.acceptedStores) setAcceptedStores(res.acceptedStores);
    if (res.customers) setCustomers(res.customers);
    if (res.availableStoresForInvite) setAvailableStoresForInvite(res.availableStoresForInvite);

    setLoading(false);
  };

  useEffect(() => {
    fetchGroupData();
  }, []);

  // Fetch analytics for accepted stores ONLY via Motor de Analytics
  useEffect(() => {
    async function fetchAnalytics() {
      if (!startDate || !endDate) return;
      setLoading(true);

      const supabase = createClient();
      const startIso = `${startDate}T00:00:00.000Z`;
      const endIso = `${endDate}T23:59:59.999Z`;

      const targetStoreIds = selectedStoreId === "all"
        ? acceptedStores.map(s => s.id)
        : [selectedStoreId];

      if (targetStoreIds.length === 0) {
        setAnalyticsData({
          summary: { grand_total_sales: 0, grand_points_earned: 0, grand_points_redeemed: 0, grand_total_transactions: 0 },
          daily: [],
          stores: [],
        });
        setLoading(false);
        return;
      }

      const { fetchAnalyticsData } = await import("@/lib/analytics");
      const result = await fetchAnalyticsData(supabase, targetStoreIds, startIso, endIso);

      setAnalyticsData(result);
      setLoading(false);
    }

    fetchAnalytics();
  }, [startDate, endDate, selectedStoreId, acceptedStores]);

  const handleSendInvite = async () => {
    if (!selectedInviteStoreId) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("company_groups").insert({
      mall_id: user.id,
      store_id: selectedInviteStoreId,
      status: "pending",
    });

    if (error) {
      alert("Erro ao enviar convite: " + error.message);
    } else {
      alert("Convite enviado com sucesso para a Loja!");
      setShowInviteModal(false);
      fetchGroupData();
    }
  };

  const handleRemoveInvite = async (storeId: string) => {
    if (!confirm("Deseja remover esta loja do grupo?")) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("company_groups").delete().eq("mall_id", user.id).eq("store_id", storeId);
    fetchGroupData();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#297CCB]/10 text-[#297CCB] text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
              PAINEL GRUPO / MERCADO
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1 uppercase italic">
            Gestão de Lojas & Mercado Conveniado
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-0.5">
            Acompanhe o desempenho consolidado das lojas participantes do grupo.
          </p>
        </div>

        <Button className="btn-blue h-11 px-6 rounded-2xl font-black italic uppercase text-xs shadow-md" onClick={() => setShowInviteModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> CONVIDAR LOJA
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-slate-100/70 p-1.5 rounded-2xl w-fit border border-slate-200/50">
        <button
          onClick={() => handleTabChange("overview")}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === "overview" ? "bg-white text-[#297CCB] shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          DASHBOARD
        </button>
        <button
          onClick={() => handleTabChange("companies")}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === "companies" ? "bg-white text-[#297CCB] shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          MINHAS LOJAS ({allInvitedStores.length})
        </button>
        <button
          onClick={() => handleTabChange("customers")}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === "customers" ? "bg-white text-[#297CCB] shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          CLIENTES ({customers.length})
        </button>
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Filtrar Período:</span>
              <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <button onClick={() => setPreset("yesterday")} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${preset === "yesterday" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>Dia -1</button>
                <button onClick={() => setPreset("last_7_days")} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${preset === "last_7_days" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>Últimos 7 dias</button>
                <button onClick={() => setPreset("last_30_days")} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${preset === "last_30_days" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>Últimos 30 dias</button>
                <button onClick={() => setPreset("custom")} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${preset === "custom" ? "bg-[#297CCB] text-white shadow-sm" : "text-slate-600"}`}>Personalizado</button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-[#297CCB]" /> Loja Conveniada
                </label>
                <select value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#297CCB]">
                  <option value="all">Todas as Lojas Aceitas</option>
                  {acceptedStores.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
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

          <HeatmapPixelChart
            data={analyticsData.daily}
            startDate={startDate || "2026-07-01"}
            endDate={endDate || "2026-07-27"}
            title="Mapa de Venda"
            subtitle="Movimentação diária por volume de vendas das lojas conveniadas"
          />
        </div>
      )}

      {/* STORES TAB */}
      {activeTab === "companies" && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm overflow-hidden space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-lg font-black italic uppercase text-slate-900">Lojas Convidadas & Ativas do Grupo</h3>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 w-full">
                <Search className="h-4 w-4 text-slate-400 ml-1" />
                <Input
                  placeholder="Buscar loja por nome, e-mail ou telefone..."
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

            {allInvitedStores.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium">
                Nenhuma loja convidada ainda. Clique em "+ CONVIDAR LOJA" para enviar um convite.
              </div>
            ) : (() => {
              const filteredStores = allInvitedStores.filter(st => {
                const matchesSearch = st.name?.toLowerCase().includes(companySearchTerm.toLowerCase()) ||
                  st.email?.toLowerCase().includes(companySearchTerm.toLowerCase()) ||
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
                          <span className="font-black text-slate-900 uppercase italic text-sm">{st.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {st.phone && (
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold text-xs" title="Enviar mensagem via WhatsApp MKT" onClick={() => handleWhatsAppSend(st.name, st.phone)}>
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => handleRemoveInvite(st.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 space-y-1">
                        {st.email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {st.email}</p>}
                        {st.phone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {st.phone}</p>}
                      </div>
                      <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Status Convite</span>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${st.status === 'accepted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                          {st.status === 'accepted' ? 'ACEITO' : 'PENDENTE'}
                        </span>
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black italic uppercase text-slate-900">Clientes Atendidos pelas Lojas do Grupo</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Pontos unificados acumulados exclusivamente nas lojas deste grupo.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="rounded-2xl font-bold text-xs gap-2 border-slate-200"
                  onClick={() => {
                    if (customers.length === 0) return;
                    const headers = ['Nome', 'Telefone', 'Email', 'Pontos Unificados Grupo'];
                    const csv = [
                      headers.join(','),
                      ...customers.map(c => [
                        `"${c.name || ''}"`,
                        `"${c.phone || ''}"`,
                        `"${c.email || ''}"`,
                        c.points_balance || 0
                      ].join(','))
                    ].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute('download', `clientes_grupo_${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  Exportar CSV
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <Search className="h-4 w-4 text-slate-400 ml-1" />
              <Input
                placeholder="Buscar cliente por nome, telefone ou e-mail..."
                className="border-none shadow-none focus-visible:ring-0 text-slate-600 font-medium placeholder:text-slate-400 text-xs bg-transparent"
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
              />
            </div>

            {(() => {
              const filtered = customers.filter(c => {
                const term = customerSearchTerm.toLowerCase();
                return (c.name || '').toLowerCase().includes(term) ||
                  (c.phone || '').includes(term) ||
                  (c.email || '').toLowerCase().includes(term);
              });

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-12 text-slate-400 font-medium">
                    {customers.length === 0 ? "Nenhum cliente registrado nas lojas participantes." : "Nenhum cliente encontrado com a busca digitada."}
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Cliente</th>
                        <th className="py-3 px-4">Contato</th>
                        <th className="py-3 px-4 text-center">Saldo de Pontos no Grupo</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filtered.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/80">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{c.name}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col text-xs">
                              <span className="text-slate-700 font-bold">{c.phone || '-'}</span>
                              {c.email && <span className="text-slate-400">{c.email}</span>}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center rounded-xl bg-[#297CCB]/10 px-3 py-1 text-xs font-black text-[#297CCB] border border-[#297CCB]/20">
                              {c.points_balance || 0} pts
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {c.phone && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold text-xs"
                                onClick={() => handleWhatsAppSend(c.name, c.phone)}
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                WhatsApp
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* INVITE STORE MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-none shadow-2xl overflow-hidden rounded-[32px] animate-in zoom-in-95 bg-white">
            <CardHeader className="p-8 border-b border-slate-50">
              <CardTitle className="text-2xl font-black italic uppercase text-[#297CCB]">
                Convidar Loja Parceira
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selecione a Loja</Label>
                <select
                  value={selectedInviteStoreId}
                  onChange={(e) => setSelectedInviteStoreId(e.target.value)}
                  className="w-full h-12 rounded-xl border border-slate-100 px-4 font-bold text-slate-600 bg-slate-50 outline-none focus:border-[#297CCB]"
                >
                  <option value="">Selecione uma loja disponível...</option>
                  {availableStoresForInvite.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.email || 'Sem e-mail'})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <Button type="button" variant="ghost" className="font-bold uppercase text-xs" onClick={() => setShowInviteModal(false)}>Cancelar</Button>
                <Button type="button" className="btn-blue h-12 px-8 rounded-xl font-black italic uppercase" onClick={handleSendInvite}>Enviar Convite</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function GroupDashboardPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400 font-bold animate-pulse uppercase italic">Sincronizando Grupo...</div>}>
      <GroupDashboardContent />
    </React.Suspense>
  );
}
