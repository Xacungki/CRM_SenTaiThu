import React, { useState } from 'react';

// THAY URL NÀY BẰNG URL WEB APP GAS CỦA BẠN
const GAS_API_URL = "https://script.google.com/macros/s/AKfycby0U6ZRLCGe5INdxWhPn47RSRs5c7skIG0ajApy2JPZyYdUU9mJUxusAjUU98xdVkX8dw/exec";

export default function PromoRedeem() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleCheck = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Gọi tới GAS từ Vercel
      const response = await fetch(`${GAS_API_URL}?action=redeem&code=${code}`);
      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Không thể kết nối tới máy chủ Google Sheets.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 max-w-md">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        🎁 Kiểm tra Mã Ưu Đãi
      </h2>
      
      {result ? (
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center animate-pulse">
          <p className="text-emerald-700 font-bold uppercase">{result.name}</p>
          <p className="text-xs text-emerald-500">ID: {result.id}</p>
          <p className="text-2xl font-black text-emerald-600 mt-2">GIẢM 30%</p>
          <button 
            onClick={() => {setResult(null); setCode('');}}
            className="mt-4 text-xs font-bold text-emerald-700 underline"
          >
            Kiểm tra mã khác
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="NHẬP MÃ (VD: L-123456...)"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-center font-mono font-bold"
          />
          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
          <button
            onClick={handleCheck}
            disabled={loading || code.length < 5}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all disabled:bg-slate-300"
          >
            {loading ? "ĐANG QUÉT..." : "XÁC THỰC MÃ"}
          </button>
        </div>
      )}
    </div>
  );
}
