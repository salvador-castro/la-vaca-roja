import { useState, useEffect } from "react";

const API_URL = "http://localhost:3000/api/products";

const normalize = (p) => ({
  ...p,
  image: p.image_url,
  desc: p.description,
  variants: (p.product_variants || []).filter((v) => v.active !== false),
});

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(API_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) {
          setProducts(data.map(normalize));
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const categories = ["Todos", ...Array.from(new Set(products.map((p) => p.category)))];

  return { products, categories, loading, error };
}
