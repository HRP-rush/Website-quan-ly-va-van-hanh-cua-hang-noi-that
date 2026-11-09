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

export async function taiExcelDoanhThu({ tuNgay, denNgay, ky }) {
  const params = new URLSearchParams({ tuNgay, denNgay, ky });
  let response;
  try {
    response = await fetch(`${API_URL}/api/bao-cao/xuat-doanh-thu?${params}`, { credentials: 'include' });
  } catch { throw new Error('Không thể kết nối máy chủ để xuất báo cáo.'); }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || 'Không thể xuất báo cáo doanh thu.');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bao-cao-doanh-thu_${ky}_${tuNgay}_${denNgay}.xlsx`;
  document.body.appendChild(a);
  a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
