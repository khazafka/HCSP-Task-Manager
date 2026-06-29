const KEY = 'hcsp-lang';

const DICT = {
  en: {
    // shell / nav
    'nav.dashboard': 'Dashboard', 'nav.orders': 'Orders', 'nav.reports': 'Work Reports',
    'nav.users': 'Users', 'nav.profile': 'Profile', 'nav.logout': 'Log out',
    'hdr.search': 'Search…', 'hdr.pages': 'Pages', 'hdr.notifications': 'Notifications',
    'common.cancel': 'Cancel', 'common.save': 'Save', 'common.back': 'Back',
    'common.noNotifs': 'No notifications yet.',

    // settings
    'set.title': 'Settings', 'set.sub': 'Personalize your HCSP-OM workspace.',
    'set.theme': 'Theme', 'set.themeSub': 'Choose how the interface looks. Your choice is saved on this device.',
    'set.lang': 'Language', 'set.langSub': 'Choose your interface language. Saved on this device.',
    'lang.en': 'English', 'lang.id': 'Bahasa Indonesia', 'lang.switching': 'Switching language…',

    // sidebar / docking
    'side.expand': 'Expand sidebar', 'side.collapse': 'Collapse sidebar',
    'side.dockLeft': 'Dock left', 'side.dockRight': 'Dock right',

    // profile / account menu
    'menu.changePass': 'Change password', 'menu.account': 'Account',
    'prof.title': 'Profile', 'prof.sub': 'Your account details.',
    'prof.name': 'Name', 'prof.email': 'Email', 'prof.role': 'Role',
    'prof.security': 'Security', 'prof.changePass': 'Change password',
    'prof.newPass': 'New password', 'prof.confirmPass': 'Confirm new password',
    'prof.updatePass': 'Update password', 'prof.passUpdated': 'Password updated.',
    'prof.passMismatch': 'Passwords do not match.', 'prof.passShort': 'Password must be at least 6 characters.',

    // placeholders / generic pages
    'ph.reports': 'Submitted work reports and attachments appear here.',
    'ph.users': 'Create, edit, and assign roles to users.',
    'ph.soon': 'Coming next — this module is scaffolded and ready to wire up.',

    // dashboard
    'dash.welcome': 'Welcome back', 'dash.subWorkspace': "Here's what's happening across your workspace today.",
    'dash.subOrders': "Here's what's happening across your orders today.",
    'dash.createOrder': 'Create order', 'dash.assignOrders': 'Assign orders', 'dash.reviewQueue': 'Review queue',
    'dash.manageUsers': 'Manage users', 'dash.uploadReport': 'Upload report', 'dash.viewMyOrders': 'View my orders',
    'dash.totalOrders': 'Total Orders', 'dash.inProgress': 'In Progress', 'dash.completed': 'Completed',
    'dash.myDrafts': 'My Drafts', 'dash.assignedToMe': 'Assigned to me', 'dash.awaitingReview': 'Awaiting review',
    'dash.closed': 'Closed', 'dash.totalUsers': 'Total users', 'dash.pending': 'Pending', 'dash.snapshot': 'snapshot',
    'dash.thisPeriod': 'this period', 'dash.activeNow': 'active now', 'dash.delivered': 'delivered',
    'dash.ordersThisWeek': 'Orders this week', 'dash.volumeByDay': 'Volume by day',
    'dash.statusBreakdown': 'Status breakdown', 'dash.acrossVisible': 'Across visible orders',
    'dash.recentOrders': 'Recent orders', 'dash.yourLatest': 'Your latest requests', 'dash.latestTeam': 'Latest across the team',
    'dash.activity': 'Activity', 'dash.recentUpdates': 'Recent updates',
    'dash.noOrders': 'No orders yet', 'dash.noOrdersCta': ' — create your first one above.', 'dash.noActivity': 'No recent activity.',
    'dash.marked': 'marked',

    // login
    'login.eyebrow': 'Human Capital · Order Management', 'login.getStarted': 'Get started',
    'login.getStartedSub': 'Sign in to access your dashboard.', 'login.login': 'Log in',
    'login.welcome': 'Welcome back', 'login.welcomeSub': 'Enter your credentials to continue.',
    'login.email': 'Email', 'login.password': 'Password', 'login.forgot': 'Forgot?',
    'login.loggingIn': 'Logging in…', 'login.authenticating': 'Authenticating…',
    'login.errCreds': 'Enter your email and password.', 'login.errFailed': 'Login failed. Try again.',
    'login.resetSent': 'Password reset link sent to your email.', 'login.resetNeedEmail': 'Enter your email above, then tap Forgot.',

    // landing page
    'land.login': 'Login', 'land.start': 'Get started', 'land.learn': 'Learn more', 'land.features': 'Features',
    'land.eyebrow': 'Telkom Indonesia · Human Capital',
    'land.heroTitle': 'Human Capital order management, done right',
    'land.heroSub': 'Submit, track, and resolve Human Capital service requests across business units — with real-time status and automatic WhatsApp updates.',
    'land.featuresTitle': 'Everything you need to run HC orders',
    'land.f1t': 'Order management', 'land.f1d': 'Create and manage HC service requests with a clear, structured flow.',
    'land.f2t': 'Real-time tracking', 'land.f2d': 'Follow each order through its lifecycle, from Draft to Closed.',
    'land.f3t': 'WhatsApp notifications', 'land.f3d': 'Automatic updates to HCAM and Team Solution via Fonnte.',
    'land.f4t': 'Work reports', 'land.f4d': 'Team Solution submits reports with attachments, kept as history.',
    'land.f5t': 'Role-based access', 'land.f5d': 'Customer, HCAM, Team Solution, Management, Admin — each sees what they should.',
    'land.f6t': 'Export', 'land.f6d': 'Export orders to PDF and Excel for reporting.',
    'land.ctaTitle': 'Ready to get started?', 'land.ctaSub': 'Sign in to your HCSP-OM account.',
    'land.footer': 'HCSP-OM · Telkom Indonesia',

    // orders list
    'ord.title': 'Orders', 'ord.sub': 'Track and manage Human Capital service requests.',
    'ord.filter': 'Filter', 'ord.sort': 'Sort', 'ord.az': 'A–Z', 'ord.za': 'Z–A', 'ord.newest': 'Newest', 'ord.oldest': 'Oldest',
    'ord.lifecycle': 'Life cycle / pipeline', 'ord.service': 'Service / jenis', 'ord.teamUnit': 'Team / business unit', 'ord.dateRange': 'Created date range', 'ord.clear': 'Clear all filters',
    'ord.noMatch': 'No orders match your filters', 'ord.noMatchCta': ' — create one with the button below.',
    'ord.unit': 'Unit', 'ord.contact': 'Contact', 'ord.untitled': 'Untitled order',
    'ord.view': 'View', 'ord.edit': 'Edit', 'ord.delete': 'Delete', 'ord.createBtn': 'Create order',
    'ord.export': 'Export', 'ord.exportExcel': 'Excel (.xlsx)', 'ord.exportPdf': 'PDF',
    'ord.deleteConfirm': 'Delete order', 'ord.deleted': 'deleted.',

    // create / edit
    'cr.title': 'Create order', 'cr.sub': 'Submit a new Human Capital service request.', 'cr.back': 'Back to orders',
    'cr.orderTitle': 'Order title', 'cr.contact': 'Contact number', 'cr.desc': 'Description',
    'cr.unit': 'Business unit', 'cr.status': 'Pipeline status', 'cr.save': 'Save order', 'cr.itemOrder': 'Service / item order',
    'cr.unitOther': 'Other…', 'cr.unitOtherPh': 'Type the business unit name',
    'cr.titleReq': 'Order title is required.', 'cr.created': 'Order created successfully.',
    'ed.title': 'Edit order', 'ed.sub': 'Update request details and pipeline status.', 'ed.save': 'Save changes',
    'ed.updated': 'Order updated and notification sent.', 'ed.updatedNoWa': 'Order updated, but WhatsApp notification failed.',

    // order detail
    'det.back': 'Back to orders', 'det.tracking': 'Tracking ID', 'det.descReq': 'Description / requirements',
    'det.noDetails': 'No details provided.', 'det.statusTracking': 'Status tracking', 'det.noStatus': 'No status changes recorded yet.',
    'det.reports': 'Work reports history', 'det.noReports': 'No reports compiled yet.',
    'det.attachments': 'Attachments', 'det.noFiles': 'No files attached.', 'det.download': 'Download',
    'det.assignments': 'Team assignments', 'det.noOperators': 'No operators assigned.',
    'det.selectUser': 'Select user…', 'det.assignUser': 'Assign user', 'det.pipeline': 'Lifecycle pipeline',
    'det.updateStatus': 'Update status', 'det.submitReport': 'Submit work report', 'det.reportTitle': 'Report title',
    'det.reportDesc': 'Report description', 'det.sendReport': 'Send report',
    'det.statusUpdated': 'Status updated to', 'det.reportSubmitted': 'Work report submitted.',
    'det.noHcam': 'No HCAM assigned to this order — report saved, no one notified.',
    'det.noCustomer': 'This order has no customer (created_by) — no one to notify.',
  },

  id: {
    'nav.dashboard': 'Dasbor', 'nav.orders': 'Order', 'nav.reports': 'Laporan Kerja',
    'nav.users': 'Pengguna', 'nav.profile': 'Profil', 'nav.logout': 'Keluar',
    'hdr.search': 'Cari…', 'hdr.pages': 'Halaman', 'hdr.notifications': 'Notifikasi',
    'common.cancel': 'Batal', 'common.save': 'Simpan', 'common.back': 'Kembali',
    'common.noNotifs': 'Belum ada notifikasi.',

    'set.title': 'Pengaturan', 'set.sub': 'Sesuaikan workspace HCSP-OM Anda.',
    'set.theme': 'Tema', 'set.themeSub': 'Pilih tampilan antarmuka. Pilihan disimpan di perangkat ini.',
    'set.lang': 'Bahasa', 'set.langSub': 'Pilih bahasa antarmuka. Disimpan di perangkat ini.',
    'lang.en': 'English', 'lang.id': 'Bahasa Indonesia', 'lang.switching': 'Mengganti bahasa…',

    'side.expand': 'Perluas sidebar', 'side.collapse': 'Ciutkan sidebar',
    'side.dockLeft': 'Tempel kiri', 'side.dockRight': 'Tempel kanan',

    'menu.changePass': 'Ubah kata sandi', 'menu.account': 'Akun',
    'prof.title': 'Profil', 'prof.sub': 'Detail akun Anda.',
    'prof.name': 'Nama', 'prof.email': 'Email', 'prof.role': 'Peran',
    'prof.security': 'Keamanan', 'prof.changePass': 'Ubah kata sandi',
    'prof.newPass': 'Kata sandi baru', 'prof.confirmPass': 'Konfirmasi kata sandi baru',
    'prof.updatePass': 'Perbarui kata sandi', 'prof.passUpdated': 'Kata sandi diperbarui.',
    'prof.passMismatch': 'Kata sandi tidak cocok.', 'prof.passShort': 'Kata sandi minimal 6 karakter.',

    'ph.reports': 'Laporan kerja yang dikirim beserta lampiran tampil di sini.',
    'ph.users': 'Buat, ubah, dan tetapkan peran pengguna.',
    'ph.soon': 'Segera hadir — modul ini sudah disiapkan dan siap dihubungkan.',

    'dash.welcome': 'Selamat datang', 'dash.subWorkspace': 'Berikut ringkasan aktivitas di workspace Anda hari ini.',
    'dash.subOrders': 'Berikut ringkasan order Anda hari ini.',
    'dash.createOrder': 'Buat Order', 'dash.assignOrders': 'Tugaskan Order', 'dash.reviewQueue': 'Antrian Review',
    'dash.manageUsers': 'Kelola Pengguna', 'dash.uploadReport': 'Unggah Laporan', 'dash.viewMyOrders': 'Lihat Order Saya',
    'dash.totalOrders': 'Total Order', 'dash.inProgress': 'Sedang Berjalan', 'dash.completed': 'Selesai',
    'dash.myDrafts': 'Draf Saya', 'dash.assignedToMe': 'Ditugaskan ke Saya', 'dash.awaitingReview': 'Menunggu Review',
    'dash.closed': 'Ditutup', 'dash.totalUsers': 'Total Pengguna', 'dash.pending': 'Tertunda', 'dash.snapshot': 'ringkasan',
    'dash.thisPeriod': 'periode ini', 'dash.activeNow': 'sedang aktif', 'dash.delivered': 'terkirim',
    'dash.ordersThisWeek': 'Order Minggu Ini', 'dash.volumeByDay': 'Volume per hari',
    'dash.statusBreakdown': 'Rincian Status', 'dash.acrossVisible': 'Dari order yang terlihat',
    'dash.recentOrders': 'Order Terbaru', 'dash.yourLatest': 'Permintaan terakhir Anda', 'dash.latestTeam': 'Terbaru dari tim',
    'dash.activity': 'Aktivitas', 'dash.recentUpdates': 'Pembaruan terbaru',
    'dash.noOrders': 'Belum ada order', 'dash.noOrdersCta': ' — buat order pertama Anda di atas.', 'dash.noActivity': 'Belum ada aktivitas.',
    'dash.marked': 'menjadi',

    'login.eyebrow': 'Human Capital · Manajemen Order', 'login.getStarted': 'Mulai',
    'login.getStartedSub': 'Masuk untuk mengakses dasbor Anda.', 'login.login': 'Masuk',
    'login.welcome': 'Selamat datang', 'login.welcomeSub': 'Masukkan kredensial Anda untuk melanjutkan.',
    'login.email': 'Email', 'login.password': 'Kata sandi', 'login.forgot': 'Lupa?',
    'login.loggingIn': 'Sedang masuk…', 'login.authenticating': 'Memverifikasi…',
    'login.errCreds': 'Masukkan email dan kata sandi Anda.', 'login.errFailed': 'Gagal masuk. Coba lagi.',
    'login.resetSent': 'Tautan atur ulang kata sandi telah dikirim ke email Anda.', 'login.resetNeedEmail': 'Masukkan email Anda di atas, lalu klik Lupa.',

    'land.login': 'Masuk', 'land.start': 'Mulai', 'land.learn': 'Pelajari', 'land.features': 'Fitur',
    'land.eyebrow': 'Telkom Indonesia · Human Capital',
    'land.heroTitle': 'Manajemen order Human Capital, lebih rapi',
    'land.heroSub': 'Ajukan, pantau, dan selesaikan permintaan layanan Human Capital lintas unit bisnis — dengan status real-time dan notifikasi WhatsApp otomatis.',
    'land.featuresTitle': 'Semua yang Anda butuhkan untuk mengelola order HC',
    'land.f1t': 'Manajemen order', 'land.f1d': 'Buat dan kelola permintaan layanan HC dengan alur yang jelas dan terstruktur.',
    'land.f2t': 'Pelacakan real-time', 'land.f2d': 'Pantau setiap order sepanjang siklusnya, dari Draft hingga Closed.',
    'land.f3t': 'Notifikasi WhatsApp', 'land.f3d': 'Pembaruan otomatis ke HCAM dan Team Solution via Fonnte.',
    'land.f4t': 'Laporan kerja', 'land.f4d': 'Team Solution mengirim laporan beserta lampiran, tersimpan sebagai riwayat.',
    'land.f5t': 'Akses berbasis peran', 'land.f5d': 'Customer, HCAM, Team Solution, Management, Admin — masing-masing melihat sesuai perannya.',
    'land.f6t': 'Ekspor', 'land.f6d': 'Ekspor order ke PDF dan Excel untuk pelaporan.',
    'land.ctaTitle': 'Siap untuk mulai?', 'land.ctaSub': 'Masuk ke akun HCSP-OM Anda.',
    'land.footer': 'HCSP-OM · Telkom Indonesia',

    'ord.title': 'Order', 'ord.sub': 'Pantau dan kelola permintaan layanan Human Capital.',
    'ord.filter': 'Filter', 'ord.sort': 'Urutkan', 'ord.az': 'A–Z', 'ord.za': 'Z–A', 'ord.newest': 'Terbaru', 'ord.oldest': 'Terlama',
    'ord.lifecycle': 'Siklus / pipeline', 'ord.service': 'Layanan / jenis', 'ord.teamUnit': 'Tim / unit bisnis', 'ord.dateRange': 'Rentang tanggal dibuat', 'ord.clear': 'Hapus semua filter',
    'ord.noMatch': 'Tidak ada order yang cocok dengan filter', 'ord.noMatchCta': ' — buat satu dengan tombol di bawah.',
    'ord.unit': 'Unit', 'ord.contact': 'Kontak', 'ord.untitled': 'Order tanpa judul',
    'ord.view': 'Lihat', 'ord.edit': 'Ubah', 'ord.delete': 'Hapus', 'ord.createBtn': 'Buat Order',
    'ord.export': 'Ekspor', 'ord.exportExcel': 'Excel (.xlsx)', 'ord.exportPdf': 'PDF',
    'ord.deleteConfirm': 'Hapus order', 'ord.deleted': 'dihapus.',

    'cr.title': 'Buat Order', 'cr.sub': 'Ajukan permintaan layanan Human Capital baru.', 'cr.back': 'Kembali ke Order',
    'cr.orderTitle': 'Judul order', 'cr.contact': 'Nomor kontak', 'cr.desc': 'Deskripsi',
    'cr.unit': 'Unit bisnis', 'cr.status': 'Status pipeline', 'cr.save': 'Simpan Order', 'cr.itemOrder': 'Layanan / item order',
    'cr.unitOther': 'Lainnya…', 'cr.unitOtherPh': 'Ketik nama unit bisnis',
    'cr.titleReq': 'Judul order wajib diisi.', 'cr.created': 'Order berhasil dibuat.',
    'ed.title': 'Ubah Order', 'ed.sub': 'Perbarui detail permintaan dan status pipeline.', 'ed.save': 'Simpan Perubahan',
    'ed.updated': 'Order diperbarui dan notifikasi terkirim.', 'ed.updatedNoWa': 'Order diperbarui, tetapi notifikasi WhatsApp gagal.',

    'det.back': 'Kembali ke Order', 'det.tracking': 'ID Pelacakan', 'det.descReq': 'Deskripsi / kebutuhan',
    'det.noDetails': 'Tidak ada detail.', 'det.statusTracking': 'Pelacakan Status', 'det.noStatus': 'Belum ada perubahan status.',
    'det.reports': 'Riwayat Laporan Kerja', 'det.noReports': 'Belum ada laporan.',
    'det.attachments': 'Lampiran', 'det.noFiles': 'Tidak ada file terlampir.', 'det.download': 'Unduh',
    'det.assignments': 'Penugasan Tim', 'det.noOperators': 'Belum ada operator ditugaskan.',
    'det.selectUser': 'Pilih pengguna…', 'det.assignUser': 'Tugaskan pengguna', 'det.pipeline': 'Pipeline Siklus',
    'det.updateStatus': 'Perbarui status', 'det.submitReport': 'Kirim Laporan Kerja', 'det.reportTitle': 'Judul laporan',
    'det.reportDesc': 'Deskripsi laporan', 'det.sendReport': 'Kirim laporan',
    'det.statusUpdated': 'Status diperbarui menjadi', 'det.reportSubmitted': 'Laporan kerja terkirim.',
    'det.noHcam': 'Tidak ada HCAM yang ditugaskan — laporan tersimpan, tidak ada yang diberi notifikasi.',
    'det.noCustomer': 'Order ini tidak memiliki customer (created_by) — tidak ada yang diberi notifikasi.',
  },
};

export function getLang() { return localStorage.getItem(KEY) || 'en'; }
export function langLabel() { return getLang().toUpperCase(); }
export function setLang(lang) {
  if (lang === getLang()) return;
  localStorage.setItem(KEY, lang);
  // brief loading overlay so the switch feels like a real process
  const el = document.createElement('div');
  el.className = 'app-loading';
  el.innerHTML = `<div class="spinner spinner-lg"></div><p>${t('lang.switching')}</p>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => location.reload(), 550);
}
export function t(key) {
  const l = getLang();
  return (DICT[l] && DICT[l][key]) ?? DICT.en[key] ?? key;
}
