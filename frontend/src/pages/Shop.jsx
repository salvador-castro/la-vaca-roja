import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, SlidersHorizontal } from 'lucide-react'
import { products, categories } from '../data/products'
import ProductCard from '../components/ProductCard'

export default function Shop() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const initialCat = params.get('cat') || 'Todos'

  const [activeCategory, setActiveCategory] = useState(initialCat)
  const [search, setSearch] = useState('')

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [])

  const filtered = products.filter(p => {
    const matchCat = activeCategory === 'Todos' || p.category === activeCategory
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const formatPrice = (p) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(p)

  return (
    <main id="shop-page">
      {/* Header */}
      <section className="shop-hero" aria-label="Tienda header">
        <div className="container">
          <div className="section-label">🛒 Tienda Online</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)' }}>
            Nuestros <span>Productos</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '1rem', marginTop: 8, lineHeight: 1.6 }}>
            {products.length} productos disponibles · Envío a todo Buenos Aires · Frescos todos los días
          </p>

          {/* Search */}
          <div style={{
            position: 'relative',
            maxWidth: 420,
            marginTop: 28,
          }}>
            <Search
              size={16}
              style={{
                position: 'absolute', left: 16, top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)', pointerEvents: 'none',
              }}
            />
            <input
              id="shop-search"
              type="search"
              placeholder="Buscar cortes, embutidos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 44, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text)',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color 0.3s',
                fontFamily: 'var(--font-body)',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(200,16,46,0.5)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Filter pills */}
          <div className="filter-bar" role="group" aria-label="Filtrar por categoría">
            {categories.map(cat => (
              <button
                key={cat}
                className={`filter-pill ${activeCategory === cat ? 'active' : ''}`}
                id={`filter-${cat.toLowerCase()}`}
                onClick={() => setActiveCategory(cat)}
                aria-pressed={activeCategory === cat}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results info */}
      <div className="container" style={{ paddingTop: 0, paddingBottom: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 0', borderBottom: '1px solid var(--border)', marginBottom: 24,
          flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            <SlidersHorizontal size={14} style={{ display: 'inline', marginRight: 6 }} />
            {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
            {activeCategory !== 'Todos' && ` en "${activeCategory}"`}
            {search && ` para "${search}"`}
          </span>
        </div>

        {filtered.length > 0 ? (
          <div className="product-grid" id="product-grid" style={{ paddingBottom: 80 }}>
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
            <h2 style={{ fontFamily: 'var(--font-head)', color: 'var(--text)', fontSize: '1.3rem', marginBottom: 8 }}>
              No encontramos productos
            </h2>
            <p style={{ fontSize: '0.9rem' }}>Probá con otra categoría o término de búsqueda</p>
            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: 20 }}
              onClick={() => { setActiveCategory('Todos'); setSearch('') }}
            >
              Ver todos
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
