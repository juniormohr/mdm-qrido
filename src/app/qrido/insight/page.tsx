'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, Construction } from "lucide-react"

export default function InsightPlaceholder() {
    return (
        <div className="h-[80vh] flex items-center justify-center p-6">
            <Card className="max-w-md w-full border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-sm rounded-[40px] overflow-hidden">
                <CardContent className="p-12 text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="p-4 bg-brand-blue/10 rounded-3xl relative">
                            <Construction className="h-12 w-12 text-brand-blue animate-bounce" />
                            <Sparkles className="h-6 w-6 text-brand-orange absolute -top-1 -right-1" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-3xl font-black italic uppercase text-slate-900 leading-tight">
                            MDM INSIGHT
                        </h1>
                        <p className="text-slate-500 font-medium">
                            Página de insight em construção, segura essa ansiedade que vem novidade aí
                        </p>
                    </div>

                    <div className="pt-4">
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-blue w-1/3 animate-pulse rounded-full" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
