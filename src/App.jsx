 import { useEffect, useMemo, useState } from 'react'
import pandals from './data/pandals.json'

function PandalCard({ name, location, theme, mapUrl, onDirections }) {
  return (
    <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-5">
        <h3 className="text-lg font-semibold text-festiveRed">{name}</h3>
        <p className="mt-1 text-sm text-gray-600"><span className="font-medium">Location:</span> {location}</p>
        <p className="mt-1 text-sm text-gray-600"><span className="font-medium">Theme:</span> {theme}</p>

        <button
          onClick={() => onDirections?.({ name, location, mapUrl })}
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-festiveOrange text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-festiveOrange"
        >
          View on Google Maps
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M3 4.5A1.5 1.5 0 0 1 4.5 3h5a1.5 1.5 0 0 1 0 3h-5A1.5 1.5 0 0 1 3 4.5Zm0 5A1.5 1.5 0 0 1 4.5 8h8a1.5 1.5 0 0 1 0 3h-8A1.5 1.5 0 0 1 3 9.5Zm0 5A1.5 1.5 0 0 1 4.5 13h2a1.5 1.5 0 0 1 0 3h-2A1.5 1.5 0 0 1 3 14.5Zm9.28-10.78a.75.75 0 0 1 1.06 0l3.69 3.69a.75.75 0 0 1 0 1.06l-3.69 3.69a.75.75 0 1 1-1.06-1.06l2.41-2.41H9.5a.75.75 0 0 1 0-1.5h5.19l-2.41-2.41a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [origin, setOrigin] = useState(null)
  const [visitCount, setVisitCount] = useState(null)

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setOrigin({ latitude, longitude })
      },
      () => {
        setOrigin(null)
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  }, [])

  // Debounce search input for better performance on large lists
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(id)
  }, [query])

// Visit counter using GetCount.io (no backend needed)

  useEffect(() => {
    const namespace = 'voboghure-puja-2025'; // unique site identifier
    const key = 'site-visits';               // specific counter name
    const base = 'https://api.counterapi.dev/v1';

    // Prevent multiple increments per visitor
    const hasVisited = localStorage.getItem('puja2025_visited') === '1';

    const markVisited = () => {
      try { localStorage.setItem('puja2025_visited', '1'); } catch {}
    };

    const fetchCount = async (increment = false) => {
      try {
        const url = increment
          ? `${base}/${namespace}/${key}/UP`
          : `${base}/${namespace}/${key}/`;
        const res = await fetch(url);
        const data = await res.json();
        if (typeof data.count === 'number') setVisitCount(data.count);
        if (increment) markVisited();
      } catch (err) {
        console.error('Error fetching visitor count:', err);
      }
    };

    if (hasVisited) {
      fetchCount(false); 
    } else {
      fetchCount(true);  
    }
  }, []);



  const normalize = (s) => s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') 
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ') 
    .trim()

  const filtered = useMemo(() => {
    const tokens = normalize(debouncedQuery).split(' ').filter(Boolean)
    if (tokens.length === 0) return pandals

    const withFields = pandals.map(p => ({
      p,
      name: normalize(p.name || ''),
      location: normalize(p.location || ''),
      theme: normalize(p.theme || ''),
      zone: normalize(p.zone || ''),
    }))

    // If the user types an exact phrase in quotes, prefer exact-phrase match
    const exactPhrase = debouncedQuery.includes('"') ? normalize(debouncedQuery.replace(/"/g, '')) : null

    const matches = withFields.filter(({ name, location, theme, zone }) => {
      if (exactPhrase) {
        const text = [name, location, theme, zone].join(' ')
        return text.includes(exactPhrase)
      }
      return tokens.every(t => (
        name.includes(t) || location.includes(t) || theme.includes(t) || zone.includes(t)
      ))
    })

    // sort by strong signals: startsWith in name > location > zone
    const scored = matches.map(({ p, name, location, zone }) => {
      let score = 0
      for (const t of tokens) {
        if (name.startsWith(t)) score += 3
        if (location.startsWith(t)) score += 2
        if (zone.startsWith(t)) score += 1
      }
      return { p, score }
    })
    .sort((a, b) => b.score - a.score)
    .map(x => x.p)

    return scored
  }, [debouncedQuery])

  const groups = useMemo(() => {
    const sections = {
      'NORTH KOLKATA': [],
      'SOUTH KOLKATA': [],
      'CENTRAL KOLKATA': [],
      'EAST WEST METRO': [],
      'OTHERS': [],
    }
    for (const p of filtered) {
      const zone = (p.zone || 'OTHERS').toUpperCase()
      if (sections[zone]) sections[zone].push(p)
      else sections['OTHERS'].push(p)
    }
    return sections
  }, [filtered])

  const handleDirections = ({ name, location, mapUrl }) => {
    // If we have exact coords, open Google Maps with directions from current location to destination query
    // We rely on destination query from mapUrl if no better data
    const base = 'https://www.google.com/maps/dir/?api=1'
    // Try to parse q parameter from mapUrl
    let dest = `${name} ${location}`
    try {
      const u = new URL(mapUrl)
      const q = u.searchParams.get('q')
      if (q) dest = q
    } catch {}

    if (origin) {
      const originParam = `origin=${origin.latitude},${origin.longitude}`
      const destinationParam = `destination=${encodeURIComponent(dest)}`
      const url = `${base}&${originParam}&${destinationParam}`
      window.open(url, '_blank', 'noopener')
    } else {
      // Fallback: open provided mapUrl
      window.open(mapUrl, '_blank', 'noopener')
    }
  }

  return (
    <div className="min-h-screen bg-orange-50/40 bg-festive">
      <div className="video-bg">
        <video src="/cultural-bg.mp4" autoPlay muted loop playsInline></video>
        <div className="video-overlay"></div>
      </div>
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-8 h-8">
              <defs>
                <linearGradient id="lg" x1="0" x2="1">
                  <stop offset="0" stopColor="#b71c1c"/>
                  <stop offset="1" stopColor="#ef6c00"/>
                </linearGradient>
              </defs>
              <rect width="64" height="64" rx="12" fill="#fff9f0"/>
              <circle cx="32" cy="32" r="26" fill="none" stroke="url(#lg)" strokeWidth="4"/>
              <path d="M18 40c6-2 8-12 14-18 3-3 7-4 10-2-2 1-4 4-5 7 4-3 9-3 11-1-6 4-9 10-10 16-3 1-9 1-20-2Z" fill="#c9a227" opacity=".9"/>
              <text x="32" y="39" textAnchor="middle" fontFamily="'Noto Sans Bengali', system-ui, sans-serif" fontWeight="700" fontSize="18" fill="#b71c1c">ভব</text>
            </svg>
            <div className="leading-tight">
              <a href="#" className="block text-base md:text-lg font-extrabold tracking-tight"><span className="text-festiveRed">ভবঘুরে</span><span className="hidden sm:inline"> • Puja Guide</span></a>
              <a href="https://instagram.com/anikpal_" target="_blank" rel="noreferrer" className="sm:hidden text-[11px] text-amber-700 hover:text-festiveRed font-medium">@anikpal_</a>
            </div>
          </div>
          <a href="https://instagram.com/anikpal_" target="_blank" rel="noreferrer" className="hidden sm:inline text-xs text-amber-700 hover:text-festiveRed font-medium ml-1">@anikpal_</a>

          <input
            type="text"
            placeholder="Search by name, location, theme or zone… (tip: use quotes for exact phrase)"
            className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-festiveGold focus:outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </header>

      

      <main className="max-w-6xl mx-auto px-4 py-8">
        <section className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-extrabold gold-gradient">Durga Puja Pandal Guide 2025</h1>
          <p className="mt-3 text-gray-700">Find the best pandals near you</p>

{
    visitCount !== null && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-200 bg-gradient-to-r from-yellow-50 to-amber-50 text-amber-700 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M10 3c-4.5 0-8 4.5-8 7s3.5 7 8 7 8-4.5 8-7-3.5-7-8-7Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" />
                    </svg>
                    <span className="text-sm font-medium">Visitors</span>
                    <span className="text-sm font-semibold text-festiveRed">{visitCount ?? '—'}</span>
                  </div>
    )
}
         

        </section>

   <section className="space-y-10">
  {['NORTH KOLKATA','SOUTH KOLKATA','CENTRAL KOLKATA','EAST WEST METRO','OTHERS'].map((zone) => {
    const pandalsInZone = groups[zone] || [];
    return (
      <div key={zone}>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold text-festiveGold">{zone}</h2>
          <span className="text-xs text-gray-500">{pandalsInZone.length}</span>
        </div>

        {pandalsInZone.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pandalsInZone.map((pandal, idx) => (
              <div key={pandal.name} className={[
                'shine',
                idx % 5 === 0 ? 'anim-tilt' : idx % 5 === 1 ? 'anim-rise' : idx % 5 === 2 ? 'anim-pop' : idx % 5 === 3 ? 'anim-wobble' : 'anim-glow'
              ].join(' ')}>
                <PandalCard {...pandal} onDirections={handleDirections} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No pandals in this section.</p>
        )}
      </div>
    )
  })}

  {filtered.length === 0 && (
    <p className="text-center text-gray-600">No pandals found. Try a different search.</p>
  )}
</section>

      </main>

      <footer className="footer-bg text-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-10 h-10">
                  <defs>
                    <linearGradient id="lgf" x1="0" x2="1">
                      <stop offset="0" stopColor="#b71c1c"/>
                      <stop offset="1" stopColor="#ef6c00"/>
                    </linearGradient>
                  </defs>
                  <rect width="64" height="64" rx="12" fill="#fff9f0"/>
                  <circle cx="32" cy="32" r="26" fill="none" stroke="url(#lgf)" strokeWidth="4"/>
                  <path d="M18 40c6-2 8-12 14-18 3-3 7-4 10-2-2 1-4 4-5 7 4-3 9-3 11-1-6 4-9 10-10 16-3 1-9 1-20-2Z" fill="#c9a227" opacity=".9"/>
                  <text x="32" y="39" textAnchor="middle" fontFamily="'Noto Sans Bengali', system-ui, sans-serif" fontWeight="700" fontSize="18" fill="#b71c1c">ভব</text>
                </svg>
                <div>
                  <div className="font-extrabold">ভবঘুরে</div>
                  <a href="https://instagram.com/anikpal_" target="_blank" rel="noreferrer" className="text-amber-300 hover:text-white text-xs">@anikpal_</a>
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold mb-3">Contact</div>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://instagram.com/anikpal_" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm6.5-.75a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm-6.5 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"/></svg>
                    Instagram
                  </a>
                </li>
                <li>
                  <a href="https://www.linkedin.com/in/the-anik-pal" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.5 8h4V24h-4V8zm7.5 0h3.8v2.2h.1c.5-1 1.8-2.2 3.8-2.2 4.1 0 4.8 2.7 4.8 6.1V24h-4v-7.1c0-1.7 0-3.8-2.3-3.8-2.3 0-2.7 1.8-2.7 3.7V24h-4V8z"/></svg>
                    LinkedIn
                  </a>
                </li>
              </ul>
            </div>
            <div className="text-sm opacity-90">
              <div className="font-semibold mb-3">Tales of Puja</div>
              <p>Celebrating the spirit of Durga Puja in Kolkata — explore pandals, themes and routes with ভবঘুরে.</p>
            </div>
          </div>
          <div className="border-t border-white/20 mt-8 pt-4 text-xs text-gray-300 flex items-center justify-between">
            <span>© 2025 ভবঘুরে</span>
            <div className="space-x-4">
              <a className="hover:text-white" href="#">Privacy</a>
              <a className="hover:text-white" href="#">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}


