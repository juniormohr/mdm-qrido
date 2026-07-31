"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  Trash2
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
  name: string;
  group_name?: string;
  email?: string;
  phone?: string;
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

    // Load groups linked to this holding
    const { data: hgData } = await supabase
      .from("holding_groups")
      .select("group_id, status")
      .eq("holding_id", user.id);

    const allInvited: GroupOption[] = [];
    const accepted: GroupOption[] = [];
    const acceptedGroupIds: string[] = [];

    if (hgData && hgData.length > 0) {
      const groupIds = hgData.map((item: any) => item.group_id);
      const { data: groupProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", groupIds);

      const groupMap = new Map((groupProfiles || []).map(p => [p.id, p]));

      hgData.forEach((item: any) => {
        const prof = groupMap.get(item.group_id);
        const grp: GroupOption = {
          id: item.group_id,
          name: prof?.full_name || "Grupo Sem Nome",
          email: prof?.email,
          phone: prof?.phone,
          status: item.status || "accepted",
        };
        allInvited.push(grp);
        if (item.status === "accepted" || item.status === "active" || !item.status) {
          accepted.push(grp);
          acceptedGroupIds.push(item.group_id);
        }
      });
    }

    setAllInvitedGroups(allInvited);
    setAcceptedGroups(accepted);

    // Fetch stores of all linked groups
    let acceptedStores: StoreOption[] = [];
    let acceptedStoreIds: string[] = [];
    const groupSearchIds = allInvited.map(g => g.id);

    if (groupSearchIds.length > 0) {
      const { data: cgData } = await supabase
        .from("company_groups")
        .select("store_id, mall_id, status")
        .in("mall_id", groupSearchIds);

      if (cgData && cgData.length > 0) {
        const storeIds = cgData.map((item: any) => item.store_id);
        const { data: storeProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", storeIds);

        const storeMap = new Map((storeProfiles || []).map(p => [p.id, p]));

        cgData.forEach((item: any) => {
          const prof = storeMap.get(item.store_id);
          const parentGroup = allInvited.find(g => g.id === item.mall_id);
          acceptedStores.push({
            id: item.store_id,
            name: prof?.full_name || "Loja",
            group_name: parentGroup?.name || "Grupo",
            email: prof?.email,
            phone: prof?.phone,
          });
          acceptedStoreIds.push(item.store_id);
        });
      }
    }
    setStores(acceptedStores);

    // Load clients of accepted stores
    if (acceptedStoreIds.length > 0) {
      const { data: storeCusts } = await supabase
        .from("customers")
        .select("*, profiles:user_id(full_name)")
        .in("user_id", acceptedStoreIds);

      if (storeCusts) {
        setCustomers(storeCusts);
      }
    } else {
      setCustomers([]);
    }

    // Load available all groups for invite modal
    const { data: allMalls } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .or("company_type.eq.mall,role.eq.mall,role.eq.group");
    
    if (allMalls) {
      const uninvited = allMalls.filter(m => !allInvited.some(inv => inv.id === m.id));
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

      const { data: rpcData, error } = await supabase.rpc("get_holding_analytics", {
        p_holding_id: user.id,
        p_start_date: startIso,
        p_end_date: endIso,
        p_group_id: selectedGroupId === "all" ? null : selectedGroupId,
        p_store_id: selectedStoreId === "all" ? null : selectedStoreId,
      });

      let summary = {
        grand_total_sales: Number(rpcData?.summary?.grand_total_sales || 0),
        grand_points_earned: Number(rpcData?.summary?.grand_points_earned || 0),
        grand_points_redeemed: Number(rpcData?.summary?.grand_points_redeemed || 0),
        grand_total_transactions: Number(rpcData?.summary?.grand_total_transactions || 0),
        active_days: Number(rpcData?.summary?.active_days || 0),
      };
      let daily = (rpcData?.daily || []).map((d: any) => ({
        date: d.stat_date,
        sales: Number(d.total_sales || 0),
        transactions: Number(d.total_transactions || 0),
      }));
      let storeRankings = (rpcData?.stores || []).map((s: any) => ({
        store_id: s.store_id,
        store_name: s.store_name || "Loja",
        total_sales: Number(s.total_sales || 0),
        total_transactions: Number(s.total_transactions || 0),
      }));

      // Fallback: Se a RPC retornar 0 mas houver lojas carregadas na Holding, calcular diretamente via loyalty_transactions
      const targetStoreIds = stores.map(s => s.id);
      if (summary.grand_total_sales === 0 && targetStoreIds.length > 0) {
        const { data: txs } = await supabase
          .from("loyalty_transactions")
          .select("created_at, sale_amount, points, type, user_id")
          .in("user_id", targetStoreIds)
          .gte("created_at", startIso)
          .lte("created_at", endIso);

        if (txs && txs.length > 0) {
          let sales = 0;
          let earned = 0;
          let redeemed = 0;
          const dailyMap = new Map<string, { sales: number; transactions: number }>();

          txs.forEach((t: any) => {
            const amount = Number(t.sale_amount || 0);
            const pts = Number(t.points || 0);
            const dateStr = new Date(t.created_at).toISOString().split("T")[0];

            if (t.type === "earn") {
              sales += amount;
              earned += pts;
            } else if (t.type === "redeem") {
              redeemed += pts;
            }

            const curr = dailyMap.get(dateStr) || { sales: 0, transactions: 0 };
            curr.sales += amount;
            curr.transactions += 1;
            dailyMap.set(dateStr, curr);
          });

          summary = {
            grand_total_sales: sales,
            grand_points_earned: earned,
            grand_points_redeemed: redeemed,
            grand_total_transactions: txs.length,
            active_days: dailyMap.size,
          };
          daily = Array.from(dailyMap.entries()).map(([date, val]) => ({
            date,
            sales: val.sales,
            transactions: val.transactions,
          }));
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
                <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#167657]">
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
                  {stores.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
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
            <h3 className="text-lg font-black italic uppercase text-slate-900">Lojas Conveniadas dos Grupos Aceitos</h3>
            {stores.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium">
                Nenhuma loja vinculada aos grupos aceitos até o momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stores.map(st => (
                  <Card key={st.id} className="border border-slate-100 shadow-xs rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Store className="w-5 h-5 text-[#297CCB]" />
                      <div>
                        <span className="font-black text-slate-900 uppercase italic text-sm block">{st.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Grupo: {st.group_name}</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-50">
                      {st.email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {st.email}</p>}
                      {st.phone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {st.phone}</p>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
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
