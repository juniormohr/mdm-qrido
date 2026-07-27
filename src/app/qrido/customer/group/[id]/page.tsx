"use client";

import React, { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Building2,
  Store,
  Gift,
  Flame,
  ArrowLeft,
  Sparkles,
  Award,
  ChevronRight,
  MapPin,
  Clock
} from "lucide-react";

interface GroupDetails {
  id: string;
  full_name: string;
  phone?: string;
  address?: string;
}

interface GroupStore {
  id: string;
  full_name: string;
  phone?: string;
  address?: string;
  double_points?: boolean;
}

interface GroupReward {
  id: string;
  title: string;
  description: string;
  points_required: number;
  is_active: boolean;
  expires_at?: string;
}

interface GroupCampaign {
  double_points: boolean;
  event_start_date?: string;
  event_end_date?: string;
}

export default function GroupHubCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const groupId = resolvedParams.id;
  const router = useRouter();

  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [stores, setStores] = useState<GroupStore[]>([]);
  const [rewards, setRewards] = useState<GroupReward[]>([]);
  const [campaign, setCampaign] = useState<GroupCampaign | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadGroupHub() {
      if (!groupId) return;
      setLoading(true);
      const supabase = createClient();

      // 1. Fetch Group details
      const { data: groupData } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .eq("id", groupId)
        .single();

      if (groupData) {
        setGroup({
          id: groupData.id,
          full_name: groupData.full_name || "Mercado / Grupo",
          phone: groupData.phone,
        });
      }

      // 2. Fetch Group Active Campaign (company_groups event details or mall configs)
      const { data: cgEvents } = await supabase
        .from("company_groups")
        .select("double_points, event_start_date, event_end_date")
        .eq("mall_id", groupId)
        .eq("status", "accepted")
        .limit(1)
        .maybeSingle();

      if (cgEvents) {
        setCampaign({
          double_points: !!cgEvents.double_points,
          event_start_date: cgEvents.event_start_date,
          event_end_date: cgEvents.event_end_date,
        });
      }

      // 3. Fetch Exclusive Rewards for this Group
      const { data: rewardData } = await supabase
        .from("rewards")
        .select("id, title, description, points_required, is_active, expires_at")
        .eq("group_id", groupId)
        .eq("is_active", true);

      if (rewardData) {
        setRewards(rewardData);
      }

      // 4. Fetch Stores in this Group
      const { data: groupStoresData } = await supabase
        .from("company_groups")
        .select("double_points, store_id, profiles!company_groups_store_id_fkey(id, full_name, phone)")
        .eq("mall_id", groupId)
        .eq("status", "accepted");

      if (groupStoresData) {
        const parsedStores: GroupStore[] = groupStoresData.map((item: any) => ({
          id: item.store_id,
          full_name: item.profiles?.full_name || "Loja Conveniada",
          phone: item.profiles?.phone,
          double_points: !!item.double_points,
        }));
        setStores(parsedStores);
      }

      setLoading(false);
    }

    loadGroupHub();
  }, [groupId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#297CCB] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium text-sm">Carregando menu do grupo...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Building2 className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Grupo não encontrado</h2>
        <p className="text-slate-500 text-sm mt-1 max-w-md">
          Não conseguimos carregar as informações deste grupo no momento.
        </p>
        <button
          onClick={() => router.push("/qrido/customer")}
          className="mt-6 px-5 py-2.5 bg-[#297CCB] text-white font-bold rounded-xl shadow-md hover:bg-blue-600 transition-colors"
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16 font-sans">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-[#297CCB] via-indigo-600 to-[#167657] text-white px-6 py-8 md:py-12 relative overflow-hidden shadow-lg">
        <div className="max-w-5xl mx-auto relative z-10">
          <button
            onClick={() => router.push("/qrido/customer")}
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para busca
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-300/30 uppercase tracking-wider mb-2">
                <Building2 className="w-3.5 h-3.5" /> Mercado / Grupo de Lojas
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                {group.full_name}
              </h1>
              <p className="text-white/80 text-sm mt-1 flex items-center gap-2">
                <span>{stores.length} lojas parceiras neste grupo</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 mt-8 space-y-8">
        {/* Active Campaigns Section */}
        {campaign && (campaign.double_points || campaign.event_end_date) && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-[#e9592c] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-yellow-300 animate-bounce" /> Campanha Ativa do Grupo
                </div>
                <h3 className="text-2xl font-black">
                  {campaign.double_points ? "🔥 Pontos em Dobro Ativo no Mercado!" : "🎉 Evento Especial do Grupo!"}
                </h3>
                <p className="text-white/90 text-sm max-w-xl">
                  Aproveite acúmulo turbinado de pontos em todas as lojas credenciadas deste grupo por tempo limitado.
                </p>
                {campaign.event_end_date && (
                  <div className="flex items-center gap-2 text-xs font-bold text-yellow-200 pt-2">
                    <Clock className="w-4 h-4" /> Válido até {new Date(campaign.event_end_date).toLocaleDateString("pt-BR")}
                  </div>
                )}
              </div>
              <Sparkles className="w-16 h-16 text-yellow-200/40 hidden sm:block" />
            </div>
          </div>
        )}

        {/* Exclusive Group Rewards (Brindes Exclusivos do Grupo) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#e9592c]" /> Brindes Exclusivos do Grupo
              </h2>
              <p className="text-xs text-slate-500">
                Recompensas especiais oferecidas diretamente por {group.full_name}
              </p>
            </div>
            <span className="text-xs font-bold bg-[#e9592c]/10 text-[#e9592c] px-3 py-1 rounded-full">
              {rewards.length} brindes
            </span>
          </div>

          {rewards.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 text-sm">
              <Gift className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              Nenhum brinde exclusivo ativo para este grupo no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-900 line-clamp-1">{reward.title}</h4>
                    <span className="bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-1 rounded-lg shrink-0">
                      {reward.points_required} pts
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{reward.description || "Sem descrição disponível."}</p>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-[#167657] font-semibold">Brinde Oficial</span>
                    <button className="text-xs font-bold text-[#297CCB] hover:underline flex items-center gap-1">
                      Resgatar <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stores Directory of the Group */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Store className="w-5 h-5 text-[#167657]" /> Lojas do Grupo
            </h2>
            <p className="text-xs text-slate-500">
              Conheça e pontue nas lojas participantes deste mercado
            </p>
          </div>

          {stores.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 text-sm">
              <Store className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              Nenhuma loja cadastrada neste grupo ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map((store) => (
                <div
                  key={store.id}
                  onClick={() => router.push(`/qrido/customer?company_id=${store.id}`)}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-[#297CCB]/40 transition-all cursor-pointer group space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-[#297CCB] font-black text-lg group-hover:bg-[#297CCB] group-hover:text-white transition-colors">
                      {store.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 group-hover:text-[#297CCB] transition-colors">
                        {store.full_name}
                      </h4>
                      {store.double_points && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md mt-1">
                          <Flame className="w-3 h-3 text-amber-500" /> 2x Pontos
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Acessar Menu da Loja</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
