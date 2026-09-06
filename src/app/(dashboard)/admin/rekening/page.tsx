"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmModal, AlertModal } from "@/components/ui/ConfirmModal";
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  Check,
  Loader2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Banknote,
} from "lucide-react";

interface PaymentAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_active: boolean;
  created_at: string;
}

interface FormState {
  bank_name: string;
  account_number: string;
  account_holder: string;
}

const EMPTY_FORM: FormState = { bank_name: "", account_number: "", account_holder: "" };

export default function AdminRekeningPage() {
  const [accounts, setAccounts] = React.useState<PaymentAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Form modal
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = React.useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false, id: "", name: "",
  });
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Alert
  const [alert, setAlert] = React.useState<{ isOpen: boolean; title: string; message: string; type: "success" | "error" }>({
    isOpen: false, title: "", message: "", type: "success",
  });

  const showAlert = (title: string, message: string, type: "success" | "error") => {
    setAlert({ isOpen: true, title, message, type });
  };

  const fetchAccounts = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payment-accounts");
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch {
      showAlert("Gagal Memuat", "Terjadi kesalahan saat memuat data rekening.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (account: PaymentAccount) => {
    setEditingId(account.id);
    setForm({ bank_name: account.bank_name, account_number: account.account_number, account_holder: account.account_holder });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.bank_name.trim() || !form.account_number.trim() || !form.account_holder.trim()) {
      setFormError("Semua field wajib diisi.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const url = "/api/admin/payment-accounts";
      const method = editingId ? "PATCH" : "POST";
      const body = editingId ? { id: editingId, ...form } : form;

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setIsFormOpen(false);
      await fetchAccounts();
      showAlert("Berhasil", editingId ? "Rekening berhasil diperbarui." : "Rekening berhasil ditambahkan.", "success");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (account: PaymentAccount) => {
    try {
      const res = await fetch("/api/admin/payment-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: account.id, is_active: !account.is_active }),
      });
      if (!res.ok) throw new Error("Gagal mengubah status rekening.");
      setAccounts((prev) =>
        prev.map((a) => (a.id === account.id ? { ...a, is_active: !a.is_active } : a))
      );
    } catch (err: unknown) {
      showAlert("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan.", "error");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/payment-accounts?id=${deleteConfirm.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
      await fetchAccounts();
      showAlert("Dihapus", "Rekening pembayaran berhasil dihapus.", "success");
    } catch (err: unknown) {
      showAlert("Gagal Menghapus", err instanceof Error ? err.message : "Terjadi kesalahan.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30 shrink-0">
            <CreditCard className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Rekening Pembayaran
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Kelola rekening bank/e-wallet resmi Skillora yang tampil kepada peserta saat upload bukti pembayaran.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchAccounts} disabled={loading} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>
          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="gap-2 bg-[#0F3E2E] hover:bg-[#165640] text-white shadow-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Rekening</span>
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 text-xs flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p>
          Rekening yang berstatus <strong>Aktif</strong> akan ditampilkan kepada peserta pada saat mereka mengupload bukti pembayaran. Nonaktifkan rekening yang tidak lagi dipakai tanpa harus menghapusnya.
        </p>
      </div>

      {/* Daftar Rekening */}
      <Card className="border-stone-200/90 dark:border-stone-800/90 overflow-hidden">
        <CardHeader className="border-b border-stone-200/80 dark:border-stone-800/80 p-5">
          <CardTitle className="text-lg">Daftar Rekening Terdaftar</CardTitle>
          <CardDescription className="text-xs">
            Total {accounts.length} rekening ({accounts.filter((a) => a.is_active).length} aktif)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-stone-400 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
              <span>Memuat data rekening...</span>
            </div>
          ) : accounts.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Banknote className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="text-sm font-semibold text-stone-500">Belum ada rekening yang didaftarkan</p>
              <p className="text-xs text-stone-400">Tambahkan rekening pembayaran agar peserta dapat melakukan transfer.</p>
              <Button onClick={handleOpenAdd} size="sm" className="mt-2 gap-2 bg-[#0F3E2E] hover:bg-[#165640] text-white">
                <Plus className="w-4 h-4" /> Tambah Rekening Pertama
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800/60">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={`flex items-center justify-between gap-4 px-5 py-4 transition-colors ${
                    account.is_active ? "bg-white dark:bg-transparent" : "bg-stone-50/50 dark:bg-stone-900/20 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-stone-900 dark:text-stone-100">{account.bank_name}</span>
                        <Badge variant={account.is_active ? "approved" : "rejected"} className="text-[10px] px-2 py-0.5">
                          {account.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>
                      <p className="text-xs text-stone-700 dark:text-stone-300 font-mono mt-0.5">{account.account_number}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">a.n {account.account_holder}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Toggle Aktif/Nonaktif */}
                    <button
                      onClick={() => handleToggleActive(account)}
                      title={account.is_active ? "Nonaktifkan rekening" : "Aktifkan rekening"}
                      className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors"
                    >
                      {account.is_active ? (
                        <ToggleRight className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-stone-400" />
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleOpenEdit(account)}
                      title="Edit rekening"
                      className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Hapus */}
                    <button
                      onClick={() => setDeleteConfirm({ isOpen: true, id: account.id, name: `${account.bank_name} - ${account.account_number}` })}
                      title="Hapus rekening"
                      className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-500 dark:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Tambah / Edit Rekening */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0C0A09] border border-stone-200 dark:border-stone-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3 border border-emerald-500/20">
                <CreditCard className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                {editingId ? "Edit Rekening" : "Tambah Rekening Baru"}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Rekening yang aktif akan tampil kepada peserta di modal upload bukti pembayaran.
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> <span>{formError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
                  Nama Bank / E-Wallet <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.bank_name}
                  onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                  placeholder="Contoh: BCA, BNI, BRI, Mandiri, DANA, GoPay..."
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
                  Nomor Rekening / Nomor HP <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.account_number}
                  onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
                  placeholder="Contoh: 1234567890 atau 0812-3456-7890"
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 text-sm font-mono text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
                  Nama Pemilik Rekening <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.account_holder}
                  onChange={(e) => setForm((f) => ({ ...f, account_holder: e.target.value }))}
                  placeholder="Nama sesuai rekening bank"
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsFormOpen(false)} disabled={saving}>
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="gap-2 bg-[#0F3E2E] hover:bg-[#16533e] text-white"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin text-emerald-300" /><span>Menyimpan...</span></>
                ) : (
                  <><Check className="w-4 h-4 text-emerald-300" /><span>{editingId ? "Simpan Perubahan" : "Tambah Rekening"}</span></>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Hapus Rekening Pembayaran"
        description={`Apakah Anda yakin ingin menghapus rekening "${deleteConfirm.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="danger"
      />

      {/* Alert */}
      <AlertModal
        isOpen={alert.isOpen}
        onClose={() => setAlert((prev) => ({ ...prev, isOpen: false }))}
        title={alert.title}
        message={alert.message}
        type={alert.type}
      />
    </div>
  );
}
