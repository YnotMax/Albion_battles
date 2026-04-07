'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ZergHQPage() {
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState({ tank: 0, support: 0, healer: 0, melee: 0, range: 0 })
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function loadComp() {
      // Puxa as ultimas 10 batalhas
      const { data: bData } = await sb.from('battles').select('id').order('start_time', { ascending: false }).limit(5)
      if (!bData || bData.length === 0) {
        setLoading(false)
        return
      }

      const battleIds = bData.map(b => b.id)
      const { data: pData } = await sb.from('player_stats').select('role').in('battle_id', battleIds)

      if (pData) {
        const counts = { tank: 0, support: 0, healer: 0, melee: 0, range: 0 }
        pData.forEach(p => {
          const r = (p.role || '').toLowerCase()
          if (r.includes('tank')) counts.tank++
          else if (r.includes('support')) counts.support++
          else if (r.includes('heal')) counts.healer++
          else if (r.includes('melee')) counts.melee++
          else counts.range++
        })
        setRoles(counts)
        setTotal(pData.length)
      }
      setLoading(false)
    }
    loadComp()
  }, [])

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--cyan)' }}>Analisando arquétipos da Zerg...</div>
  }

  const pTank = total > 0 ? (roles.tank / total) * 100 : 0
  const pSupport = total > 0 ? (roles.support / total) * 100 : 0
  const pHealer = total > 0 ? (roles.healer / total) * 100 : 0
  const pMelee = total > 0 ? (roles.melee / total) * 100 : 0
  const pRange = total > 0 ? (roles.range / total) * 100 : 0

  // Conic gradient preparation
  let currentStart = 0
  const slices = [
    { color: '#3b82f6', percent: pTank, label: 'Tank' },
    { color: '#f59e0b', percent: pSupport, label: 'Support' },
    { color: '#10b981', percent: pHealer, label: 'Healer' },
    { color: '#ef4444', percent: pMelee, label: 'Melee' },
    { color: '#f97316', percent: pRange, label: 'Range' },
  ].map(s => {
    const start = currentStart
    const end = currentStart + s.percent
    currentStart = end
    return { ...s, start, end }
  })

  const conicString = slices.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ')

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }} className="anim-up">
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--cyan)' }}>biotech</span>
        <div>
          <h1 className="section-hd" style={{ fontSize: 24 }}>Zerg HQ (Composição)</h1>
          <div className="label">Laboratório de Análise Tática e Policiamento de Gear.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        
        {/* PIE CHART COMPOSITION */}
        <div className="glass panel anim-up">
          <div className="panel-header">
            <span className="section-hd">Composição Média da Zerg</span>
            <div className="label">Baseado nas últimas 5 batalhas catalogadas.</div>
          </div>
          <div className="panel-body" style={{ display: 'flex', alignItems: 'center', gap: 32, padding: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
            
            {/* O Gráfico */}
            <div style={{
              width: 180, height: 180, borderRadius: '50%',
              background: `conic-gradient(${conicString || '#1e293b 0% 100%'})`,
              boxShadow: '0 0 40px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.5)',
              border: '4px solid #0f172a',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{ 
                width: 110, height: 110, borderRadius: '50%', background: '#0f172a',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'
              }}>
                <span style={{ color: 'var(--cyan)', fontWeight: 800, fontSize: 24 }}>{total}</span>
                <span className="label-sm">Jogadores</span>
              </div>
            </div>

            {/* Legenda */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {slices.map((s, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: s.color }} />
                  <span style={{ width: 60, fontWeight: 700, color: 'var(--text-900)' }}>{s.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-400)', width: 40, textAlign: 'right' }}>
                    {s.percent.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* GEAR CHECKER (INSPECTOR) */}
        <div className="glass panel anim-up" style={{ animationDelay: '60ms' }}>
          <div className="panel-header" style={{ borderBottomColor: '#f59e0b40' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: '#f59e0b', fontSize: 20 }}>policy</span>
              <span className="section-hd" style={{ color: '#f59e0b' }}>Zerg Police (Inspetor de Arsenal)</span>
            </div>
            <div className="label">Armas identificadas nas últimas lutas (Necessita da coluna 'weapon' no DB)</div>
          </div>
          <div className="panel-body scroll" style={{ maxHeight: 300, padding: 0 }}>
            {/* Tabela do Policiamento */}
            <SupabaseWeaponTable />
          </div>
        </div>

      </div>
    </>
  )
}

function SupabaseWeaponTable() {
  const [weapons, setWeapons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function loadWeapons() {
      // Puxa lutas mais recentes com a coluna 'weapon'
      const { data, error } = await sb.from('player_stats')
        .select(`player_name, role, weapon, battles!inner(start_time)`)
        .order('battles(start_time)', { ascending: false })
        .limit(30)
      
      if (error) {
        setError(true)
      } else if (data) {
        setWeapons(data)
      }
      setLoading(false)
    }
    loadWeapons()
  }, [])

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-500)' }}>Pescando armamentos...</div>
  if (error) return (
    <div style={{ padding: 24, color: '#ef4444', fontSize: 12 }}>
      A coluna <strong>weapon</strong> ainda não foi criada na tabela <em>player_stats</em> do Supabase. <br/><br/>
      Por favor, vá no painel do seu Supabase, adicione a coluna 'weapon' do tipo texto (text), e rode o script novamente.
    </div>
  )

  return (
    <table className="data-table" style={{ fontSize: 12 }}>
      <thead>
        <tr>
          <th>OPERADOR</th>
          <th>FUNÇÃO</th>
          <th>ARMA EQUIPADA (MAIN)</th>
        </tr>
      </thead>
      <tbody>
        {weapons.map((w, idx) => (
          <tr key={idx}>
            <td style={{ fontWeight: 600, color: 'var(--text-900)' }}>{w.player_name}</td>
            <td>
              <span className={`badge badge-${(w.role || 'dps').toLowerCase().includes('tank') ? 'tank' : (w.role || 'dps').toLowerCase().includes('heal') ? 'healer' : (w.role || 'dps').toLowerCase().includes('support') ? 'support' : 'dps'}`} style={{ fontSize: 9 }}>
                {w.role}
              </span>
            </td>
            <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontWeight: 600 }}>
              {w.weapon || 'NÃO ENCONTRADA'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
