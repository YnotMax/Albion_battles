import { createClient } from '@supabase/supabase-js'
import { Battle, PlayerStat } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ── Supabase (server) ─────────────────────────────────────────────────────────
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Data ──────────────────────────────────────────────────────────────────────
async function getBattles(): Promise<Battle[]> {
  const { data } = await sb.from('battles').select('*').order('start_time', { ascending: false }).limit(25)
  return data ?? []
}

type AggPlayer = {
  name: string; role: string
  damage: number; healing: number
  kills: number; deaths: number; battles: number
}

async function getPlayerAgg(): Promise<AggPlayer[]> {
  const { data } = await sb.from('player_stats')
    .select('player_name, role, damage_done, healing_done, kills, deaths')
  if (!data) return []
  const map: Record<string, AggPlayer> = {}
  for (const r of data) {
    if (!map[r.player_name]) map[r.player_name] = { name: r.player_name, role: r.role, damage: 0, healing: 0, kills: 0, deaths: 0, battles: 0 }
    map[r.player_name].damage   += r.damage_done
    map[r.player_name].healing  += r.healing_done
    map[r.player_name].kills    += r.kills
    map[r.player_name].deaths   += r.deaths
    map[r.player_name].battles  += 1
  }
  return Object.values(map)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000    ? `${(n / 1_000).toFixed(0)}K`
  : String(n)

const ago = (iso: string) => {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR }) }
  catch { return '–' }
}

const roleLabel = (r: string) => {
  const map: Record<string,string> = { healer: 'HEALER', tank: 'TANK', melee: 'MELEE', ranged: 'RANGED', support: 'SUPPORT' }
  return map[r?.toLowerCase()] ?? r?.toUpperCase() ?? '–'
}

const roleCss = (r: string) => {
  const m: Record<string,string> = { healer:'healer', tank:'tank', melee:'melee', ranged:'dps', support:'support' }
  return `badge badge-${m[r?.toLowerCase()] ?? 'dps'}`
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const [battles, players] = await Promise.all([getBattles(), getPlayerAgg()])

  const wins      = battles.filter(b => b.result === 'WIN').length
  const winRate   = battles.length ? Math.round((wins / battles.length) * 100) : 0
  const totalFame = battles.reduce((s, b) => s + (b.total_fame ?? 0), 0)
  const topDPS     = [...players].sort((a, b) => b.damage   - a.damage).slice(0, 5)
  const topHeal    = [...players].sort((a, b) => b.healing  - a.healing).slice(0, 5)
  const topKills   = [...players].sort((a, b) => b.kills    - a.kills).slice(0, 5)

  const winRateStroke = winRate >= 60 ? '#00ff9d' : winRate >= 40 ? '#ffcc00' : '#ff4d4d'
  const R = 38, CIRC = 2 * Math.PI * R
  const dash = CIRC * (winRate / 100)

  const medals = ['🥇', '🥈', '🥉', '4', '5']

  return (
    <>
      {/* ── TOP KPI BAR ──────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: 10, marginBottom: 16,
      }}>
        {[
          { val: battles.length, lbl: 'Batalhas',    color: 'var(--cyan)'    },
          { val: `${winRate}%`,  lbl: 'Win Rate',    color: winRateStroke    },
          { val: fmt(totalFame), lbl: 'Kill Fame',   color: 'var(--text-900)'},
          { val: wins,           lbl: 'Vitórias',    color: '#059669'        },
          { val: battles.length - wins, lbl: 'Derrotas', color: '#dc2626'   },
          { val: players.length, lbl: 'Operadores',  color: 'var(--text-900)'},
        ].map((k, i) => (
          <div key={i} className="glass anim-up" style={{ padding: '12px 16px', animationDelay: `${i * 40}ms` }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>
              {k.val}
            </div>
            <div className="label" style={{ marginTop: 4 }}>{k.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── MAIN GRID ─────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 280px',
        gap: 16,
      }}>

        {/* ────── LEFT: Battle Log ──────────────────────── */}
        <div className="glass panel anim-up" style={{ animationDelay: '60ms' }}>
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--cyan)' }}>
                military_tech
              </span>
              <span className="section-hd">Operational Battle Log</span>
            </div>
            <div className="label">{battles.length > 0 ? `Última: ${ago(battles[0].start_time)}` : 'Sem dados'}</div>
          </div>

          <div className="panel-body scroll">
            {battles.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-400)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>
                  inventory_2
                </span>
                <div className="label">Nenhuma batalha registrada</div>
                <div style={{ fontSize: 12, color: 'var(--text-400)', marginTop: 6 }}>
                  Execute o crawler para importar dados
                </div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Resultado</th>
                    <th>Oponentes</th>
                    <th style={{ textAlign: 'right' }}>Kills</th>
                    <th style={{ textAlign: 'right' }}>Fame</th>
                    <th style={{ textAlign: 'right' }}>Ops</th>
                    <th>Tempo</th>
                  </tr>
                </thead>
                <tbody>
                  {battles.map((b, i) => (
                    <tr key={b.id} style={{ animationDelay: `${i * 20}ms` }}>
                      <td>
                        <span className={`badge badge-${b.result === 'WIN' ? 'win' : 'loss'}`}>
                          {b.result}
                        </span>
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 600, color: 'var(--text-900)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          vs {b.opponents}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#dc2626' }}>
                          {b.total_kills}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--text-700)' }}>
                          {fmt(b.total_fame)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-500)' }}>
                          {b.guild_players}
                        </span>
                      </td>
                      <td>
                        <span className="label-sm">{ago(b.start_time)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ────── RIGHT: Sidebar panels ─────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Win Rate Ring */}
          <div className="glass anim-up" style={{ padding: 20, animationDelay: '80ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--cyan)' }}>stars</span>
              <span className="section-hd">Performance Ratio</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {/* Ring */}
              <div className="ring-root" style={{ flexShrink: 0 }}>
                <svg className="ring-svg" width="88" height="88" viewBox="0 0 88 88">
                  <circle cx="44" cy="44" r={R} fill="none" stroke="rgba(203,213,225,0.3)" strokeWidth="8"/>
                  <circle
                    cx="44" cy="44" r={R} fill="none"
                    stroke={winRateStroke} strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${CIRC - dash}`}
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                  />
                </svg>
                <div className="ring-label">
                  <span style={{ fontSize: 18, fontWeight: 900, color: winRateStroke }}>{winRate}%</span>
                  <span className="label-sm" style={{ marginTop: 1 }}>win rate</span>
                </div>
              </div>
              {/* Breakdown */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="label">Vitórias</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#059669' }}>
                      {wins}
                    </span>
                  </div>
                  <div className="bar-track"><div className="bar-fill emerald" style={{ width: `${winRate}%` }}/></div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="label">Derrotas</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#dc2626' }}>
                      {battles.length - wins}
                    </span>
                  </div>
                  <div className="bar-track"><div className="bar-fill crimson" style={{ width: `${100 - winRate}%` }}/></div>
                </div>
                <div className="glow-divider" />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: '0.12em' }}>
                  {battles.length} LUTAS REGISTRADAS
                </div>
              </div>
            </div>
          </div>

          {/* Top DPS */}
          <div className="glass anim-up" style={{ animationDelay: '100ms', overflow: 'hidden' }}>
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="dot dot-crimson" />
                <span className="section-hd">Top DPS</span>
              </div>
              <span className="label">Dano Total</span>
            </div>
            <div>
              {topDPS.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center' }}>
                  <span className="label">Sem dados — desative o RLS no Supabase</span>
                </div>
              ) : topDPS.map((p, i) => (
                <div key={p.name} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px',
                  borderBottom: i < topDPS.length - 1 ? '1px solid rgba(203,213,225,0.12)' : 'none',
                }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{medals[i]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: 'var(--text-900)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {p.name}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                      <span className={roleCss(p.role)} style={{ fontSize: 8 }}>{roleLabel(p.role)}</span>
                      <span className="label-sm">{p.battles}x</span>
                    </div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 800,
                    color: '#dc2626', flexShrink: 0,
                  }}>
                    {fmt(p.damage)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Healers */}
          <div className="glass anim-up" style={{ animationDelay: '120ms', overflow: 'hidden' }}>
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="dot dot-emerald" />
                <span className="section-hd">Top Healers</span>
              </div>
              <span className="label">Cura Total</span>
            </div>
            <div>
              {topHeal.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center' }}>
                  <span className="label">Sem dados</span>
                </div>
              ) : topHeal.map((p, i) => (
                <div key={p.name} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px',
                  borderBottom: i < topHeal.length - 1 ? '1px solid rgba(203,213,225,0.12)' : 'none',
                }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{medals[i]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: 'var(--text-900)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {p.name}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                      <span className={roleCss(p.role)} style={{ fontSize: 8 }}>{roleLabel(p.role)}</span>
                      <span className="label-sm">{p.battles}x</span>
                    </div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 800,
                    color: '#059669', flexShrink: 0,
                  }}>
                    {fmt(p.healing)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Kills */}
          <div className="glass anim-up" style={{ animationDelay: '140ms', overflow: 'hidden' }}>
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="dot dot-amber" />
                <span className="section-hd">Top Kills</span>
              </div>
              <span className="label">Kills Totais</span>
            </div>
            <div>
              {topKills.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center' }}>
                  <span className="label">Sem dados</span>
                </div>
              ) : topKills.map((p, i) => (
                <div key={p.name} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px',
                  borderBottom: i < topKills.length - 1 ? '1px solid rgba(203,213,225,0.12)' : 'none',
                }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{medals[i]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: 'var(--text-900)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {p.name}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                      <span className={roleCss(p.role)} style={{ fontSize: 8 }}>{roleLabel(p.role)}</span>
                      <span className="label-sm">{p.battles}x · {p.kills}K/{p.deaths}D</span>
                    </div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 800,
                    color: 'var(--amber)', flexShrink: 0,
                  }}>
                    {p.kills}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── RESPONSIVE GRID OVERRIDE FOR MOBILE ──────────── */}
      <style>{`
        @media (max-width: 900px) {
          .pg-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
