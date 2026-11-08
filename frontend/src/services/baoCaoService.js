const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export async function layBaoCao({ tuNgay, denNgay, nhomTheo }) {
  const params = new URLSearchParams({ tuNgay, denNgay, nhomTheo });
  let response;
  try { response = await fetch(`${API_URL}/api/bao-cao/tong-quan?${params}`, { credentials: 'include' }); }
  catch { throw new Error('Không thể kết nối máy chủ báo cáo.'); }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) throw new Error(body?.message || 'Không thể tải báo cáo.');
  return body.data;
}
