"use client";

import React, { useState, useEffect } from "react";
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
  ChevronRight,
  Filter
} from "lucide-react";

type DateFilterPreset = "yesterday" | "last_7_days" | "last_30_days" | "custom";

interface GroupOption {
  id: string;
  name: string;
}

interface StoreOption {
  id: string;
  name: string;
}

interface StoreRanking {
  store_id: string;
  store_name: string;
  total_sales: number;
  total_transactions: number;
}

export default function HoldingDashboardPage() {
  const [preset, setPreset] = useState<DateFilterPreset>("last_30_days");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");

  const [loading, setLoading] = useState<boolean>(true);
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

  // Calculate default dates according to selected preset
  useEffect(() => {
    const today = new Date();
    
    if (preset === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const iso = yesterday.toISOString().split("T")[0];
      setStartDate(iso);
      setEndDate(iso);
    } else if (preset === "last_7_days") {
      // 7 days excluding current day (D-7 to D-1)
      const d7 = new Date(today);
      d7.setDate(today.getDate() - 7);
      const d1 = new Date(today);
      d1.setDate(today.getDate() - 1);
      setStartDate(d7.toISOString().split("T")[0]);
      setEndDate(d1.toISOString().split("T")[0]);
    } else if (preset === "last_30_days") {
      // 30 days excluding current day (D-30 to D-1)
      const d30 = new Date(today);
      d30.setDate(today.getDate() - 30);
      const d1 = new Date(today);
      d1.setDate(today.getDate() - 1);
      setStartDate(d30.toISOString().split("T")[0]);
      setEndDate(d1.toISOString().split("T")[0]);
    }
  }, [preset]);

  // Load Groups and Stores linked to Holding
  useEffect(() => {
    async function loadGroupsAndStores() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch Groups linked to holding in holding_groups or profiles with holding_id
      const { data: hgData } = await supabase
        .from("holding_groups")
        .select("group_id, profiles!holding_groups_group_id_fkey(id, full_name)")
        .eq("holding_id", user.id);

      let loadedGroups: GroupOption[] = [];
      if (hgData && hgData.length > 0) {
        loadedGroups = hgData
          .map((item: any) => ({
            id: item.group_id,
            name: item.profiles?.full_name || "Grupo Sem Nome",
          }))
          .filter(Boolean);
      } else {
        // Fallback: fetch any company_type='mall'
        const { data: malls } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("company_type", "mall");
        if (malls) {
          loadedGroups = malls.map((m) => ({ id: m.id, name: m.full_name || "Grupo" }));
        }
      }

      setGroups(loadedGroups);

      // Fetch Stores inside these groups via company_groups
      const groupIds = loadedGroups.map((g) => g.id);
      if (groupIds.length > 0) {
        const { data: cgData } = await supabase
          .from("company_groups")
          .select("store_id, profiles!company_groups_store_id_fkey(id, full_name)")
          .in("mall_id", groupIds)
          .eq("status", "accepted");

        if (cgData) {
          const loadedStores = cgData
            .map((item: any) => ({
              id: item.store_id,
              name: item.profiles?.full_name || "Loja",
            }))
            .filter(
              (s, index, self) => index === self.findIndex((t) => t.id === s.id)
            );
          setStores(loadedStores);
        }
      }
    }

    loadGroupsAndStores();
  }, []);

  // Load Analytics Data using RPC or direct queries
  useEffect(() => {
    async function fetchAnalytics() {
      if (!startDate || !endDate) return;
      setLoading(true);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startIso = `${startDate}T00:00:00.000Z`;
      const endIso = `${endDate}T23:59:59.999Z`;

      // Try RPC call
      const { data: rpcData, error } = await supabase.rpc("get_holding_analytics", {
        p_holding_id: user.id,
        p_start_date: startIso,
        p_end_date: endIso,
        p_group_id: selectedGroupId === "all" ? null : selectedGroupId,
        p_store_id: selectedStoreId === "all" ? null : selectedStoreId,
      });

      if (!error && rpcData) {
        setAnalyticsData({
          summary: {
            grand_total_sales: Number(rpcData.summary?.grand_total_sales || 0),
            grand_points_earned: Number(rpcData.summary?.grand_points_earned || 0),
            grand_points_redeemed: Number(rpcData.summary?.grand_points_redeemed || 0),
            grand_total_transactions: Number(rpcData.summary?.grand_total_transactions || 0),
            active_days: Number(rpcData.summary?.active_days || 0),
          },
          daily: (rpcData.daily || []).map((d: any) => ({
            date: d.stat_date,
            sales: Number(d.total_sales || 0),
            transactions: Number(d.total_transactions || 0),
          })),
          stores: (rpcData.stores || []).map((s: any) => ({
            store_id: s.store_id,
            store_name: s.store_name || "Loja",
            total_sales: Number(s.total_sales || 0),
            total_transactions: Number(s.total_transactions || 0),
          })),
        });
      } else {
        // Direct Query Fallback
        const { data: txs } = await supabase
          .from("loyalty_transactions")
          .select("created_at, sale_amount, points, type, user_id, profiles(full_name)")
          .gte("created_at", startIso)
          .lte("created_at", endIso);

        let totalSales = 0;
        let pointsEarned = 0;
        let pointsRedeemed = 0;
        const dailyMap = new Map<string, { sales: number; transactions: number }>();
        const storeMap = new Map<string, { name: string; sales: number; txs: number }>();

        if (txs) {
          txs.forEach((t: any) => {
            const dateStr = new Date(t.created_at).toISOString().split("T")[0];
            const amount = Number(t.sale_amount || 0);

            if (t.type === "earn") {
              totalSales += amount;
              pointsEarned += Number(t.points || 0);
            } else if (t.type === "redeem") {
              pointsRedeemed += Number(t.points || 0);
            }

            // Daily heatmap accumulation
            const currDay = dailyMap.get(dateStr) || { sales: 0, transactions: 0 };
            currDay.sales += amount;
            currDay.transactions += 1;
            dailyMap.set(dateStr, currDay);

            // Store accumulation
            const storeName = t.profiles?.full_name || "Loja";
            const currStore = storeMap.get(t.user_id) || { name: storeName, sales: 0, txs: 0 };
            currStore.sales += amount;
            currStore.txs += 1;
            storeMap.set(t.user_id, currStore);
          });
        }

        const dailyList: DailyDataPoint[] = Array.from(dailyMap.entries()).map(([date, d]) => ({
          date,
          sales: d.sales,
          transactions: d.transactions,
        }));

        const storeList: StoreRanking[] = Array.from(storeMap.entries()).map(([id, s]) => ({
          store_id: id,
          store_name: s.name,
          total_sales: s.sales,
          total_transactions: s.txs,
        })).sort((a, b) => b.total_sales - a.total_sales);

        setAnalyticsData({
          summary: {
            grand_total_sales: totalSales,
            grand_points_earned: pointsEarned,
            grand_points_redeemed: pointsRedeemed,
            grand_total_transactions: txs?.length || 0,
            active_days: dailyList.length,
          },
          daily: dailyList,
          stores: storeList,
        });
      }

      setLoading(false);
    }

    fetchAnalytics();
  }, [startDate, endDate, selectedGroupId, selectedStoreId]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#297CCB]/10 text-[#297CCB] text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
              Painel Holding
            </span>
            <span className="text-slate-400 text-sm">• Visão Global</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
            Gestão de Performance de Grupos & Lojas
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Acompanhe em tempo real o desempenho consolidado dos seus mercados e lojas conveniadas.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setPreset("yesterday")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              preset === "yesterday"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Dia -1
          </button>
          <button
            onClick={() => setPreset("last_7_days")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              preset === "last_7_days"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Últimos 7 dias
          </button>
          <button
            onClick={() => setPreset("last_30_days")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              preset === "last_30_days"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Últimos 30 dias
          </button>
          <button
            onClick={() => setPreset("custom")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              preset === "custom"
                ? "bg-[#297CCB] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Personalizado
          </button>
        </div>
      </div>

      {/* Scope & Custom Date Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Group Filter */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#297CCB]" /> Grupo / Mercado
          </label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#297CCB]"
          >
            <option value="all">Todos os Grupos</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Store Filter */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-[#167657]" /> Loja Específica
          </label>
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#297CCB]"
          >
            <option value="all">Todas as Lojas</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Start Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-500" /> Data Início
          </label>
          <input
            type="date"
            disabled={preset !== "custom"}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#297CCB]"
          />
        </div>

        {/* Custom End Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-500" /> Data Fim
          </label>
          <input
            type="date"
            disabled={preset !== "custom"}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#297CCB]"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Vendas Totais */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#167657]/5 rounded-bl-full transition-transform group-hover:scale-110" />
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#167657]/10 text-[#167657] rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Volume em Vendas</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {analyticsData.summary.grand_total_sales.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Pontos Concedidos */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#f7aa1c]/5 rounded-bl-full transition-transform group-hover:scale-110" />
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#f7aa1c]/10 text-[#f7aa1c] rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Pontos Emitidos</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {analyticsData.summary.grand_points_earned.toLocaleString("pt-BR")} pts
              </p>
            </div>
          </div>
        </div>

        {/* Transações Totais */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#297CCB]/5 rounded-bl-full transition-transform group-hover:scale-110" />
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#297CCB]/10 text-[#297CCB] rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Total Transações</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {analyticsData.summary.grand_total_transactions.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </div>

        {/* Pontos Resgatados */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#e9592c]/5 rounded-bl-full transition-transform group-hover:scale-110" />
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#e9592c]/10 text-[#e9592c] rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Pontos Resgatados</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {analyticsData.summary.grand_points_redeemed.toLocaleString("pt-BR")} pts
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Pixel Matrix Component */}
      <HeatmapPixelChart
        data={analyticsData.daily}
        startDate={startDate || "2026-07-01"}
        endDate={endDate || "2026-07-27"}
        title="Performance in Pixels"
        subtitle="Movimentação diária por volume de vendas respeitando a paleta oficial Qrido"
      />

      {/* Stores Ranking Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Ranking de Desempenho por Loja</h3>
            <p className="text-xs text-slate-500">Lojas do grupo ordenadas por volume de vendas acumulado no período</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {analyticsData.stores.length} lojas ativas
          </span>
        </div>

        {analyticsData.stores.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Nenhuma movimentação registrada no período selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Loja</th>
                  <th className="py-3 px-4">Transações</th>
                  <th className="py-3 px-4 text-right">Vendas Totais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {analyticsData.stores.map((store, index) => (
                  <tr key={store.store_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-400">#{index + 1}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <Store className="w-4 h-4 text-[#297CCB]" />
                      {store.store_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{store.total_transactions} vendas</td>
                    <td className="py-3.5 px-4 text-right font-black text-[#167657]">
                      {store.total_sales.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
