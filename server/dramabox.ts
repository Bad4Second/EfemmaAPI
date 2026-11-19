import type { Express, Request, Response } from 'express';

const WEBFIC_BASE_URL = 'https://www.webfic.com';
const DRAMABOX_SITE_URL = 'https://www.dramaboxdb.com';
const SCRAPE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export const DRAMABOX_SUPPORTED_LANGS = new Set([
  'in',
  'en',
  'es',
  'pt',
  'th',
  'ko',
  'ja',
  'fr',
  'de',
  'ar',
]);

export function normalizeDramaBoxLang(raw: unknown): string {
  const s = String(raw || '').trim().toLowerCase();
  if (s === 'id') return 'in';
  if (DRAMABOX_SUPPORTED_LANGS.has(s)) return s;
  return 'in';
}

interface DramaBoxGenreRaw {
  id?: number;
  name?: string;
  replaceName?: string;
}

interface DramaBoxPerformerRaw {
  performerId?: string | number;
  performerName?: string;
  performerFormatName?: string;
  performerAvatar?: string;
  videoCount?: number;
}

interface DramaBoxBookRaw {
  bookId?: string;
  originalBookId?: string;
  replacedBookId?: string;
  bookName?: string;
  name?: string;
  cover?: string;
  ratings?: number;
  introduction?: string;
  labels?: string[];
  tags?: string[];
  followCount?: number;
  viewCount?: number;
  viewCountDisplay?: string;
  chapterCount?: number;
  firstChapterId?: number | string;
  typeOneIds?: number[];
  typeOneNames?: string[];
  typeOneName?: string;
  typeTwoIds?: number[];
  typeTwoNames?: string[];
  typeTwoName?: string;
  typeTwoList?: DramaBoxGenreRaw[];
  status?: string;
  language?: string;
  simpleLanguage?: string;
  replacedBookName?: string;
  bookNameEn?: string;
  shelfTime?: string;
  firstShelfTime?: string;
  lastUpdateTimeDisplay?: string;
  performerIdList?: Array<number | string>;
  performerList?: DramaBoxPerformerRaw[];
}

interface DramaBoxHomeShelfRaw {
  id?: number;
  name?: string;
  style?: string;
  more?: boolean;
  items?: DramaBoxBookRaw[];
}

interface DramaBoxBrowseResponse {
  data?: {
    types?: DramaBoxGenreRaw[];
    bookList?: DramaBoxBookRaw[];
    currentPage?: number;
    total?: number;
    pages?: number;
    currentType?: DramaBoxGenreRaw;
    language?: string;
  };
}

interface DramaBoxDetailResponse {
  data?: {
    book?: DramaBoxBookRaw;
    recommends?: DramaBoxBookRaw[];
    languages?: string[];
    chapter?: {
      id?: string | number;
      name?: string;
      unlock?: boolean;
      chapterPrice?: number;
      new?: boolean;
    };
  };
}

export interface NormalizedDramaBoxPerformer {
  performer_id: string;
  nama: string;
  slug: string;
  avatar: string | null;
  jumlah_video: number;
}

export interface NormalizedDramaBoxItem {
  book_id: string;
  judul: string;
  sampul: string | null;
  rating: number | null;
  jumlah_episode: number | null;
  penayangan: string | null;
  penayangan_angka: number;
  pengikut: number;
  sinopsis: string | null;
  status_tayang: string | null;
  tanggal_rilis: string | null;
  kategori_utama: Array<{ id: number; nama: string; slug: string }>;
  genre: Array<{ id: number; nama: string; slug: string }>;
  tags: string[];
  performer_ids: string[];
  url_dramabox: string;
}

interface DramaBoxCatalogIndex {
  fetchedAt: number;
  lang: string;
  genres: Array<{ genre_id: number; nama: string; slug: string; url_dramabox: string }>;
  shelves: Array<{
    shelf_id: number;
    nama_asli: string;
    nama_rak: string;
    gaya_tampilan: string;
    items: NormalizedDramaBoxItem[];
  }>;
  dramas: NormalizedDramaBoxItem[];
  dramaMap: Map<string, NormalizedDramaBoxItem>;
  performers: NormalizedDramaBoxPerformer[];
  performerMap: Map<string, NormalizedDramaBoxPerformer>;
  performerDramas: Map<string, NormalizedDramaBoxItem[]>;
}

const SHELF_LABEL_MAP: Record<string, string> = {
  '热门好剧': 'Drama Pilihan Populer',
  '必看好剧': 'Wajib Tonton Pilihan Editor',
  '当前热播': 'Sedang Hangat Tayang',
  '精彩剧集': 'Serial Drama Unggulan',
};

const TYPE_ONE_LABEL_MAP: Record<number, { nama: string; slug: string }> = {
  31: { nama: 'Pria', slug: 'pria' },
  32: { nama: 'Wanita', slug: 'wanita' },
};

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseViewDisplayCount(raw: string | undefined, fallbackNum?: number): number {
  if (typeof fallbackNum === 'number' && Number.isFinite(fallbackNum) && fallbackNum > 0) {
    return fallbackNum;
  }
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return 0;
  const num = parseFloat(s.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(num)) return 0;
  if (s.endsWith('M')) return Math.round(num * 1_000_000);
  if (s.endsWith('K')) return Math.round(num * 1_000);
  return Math.round(num);
}

function buildDramaBoxWebUrl(bookId: string, replacedBookName?: string, bookName?: string): string {
  const slug = (replacedBookName || slugify(bookName || 'drama') || 'drama').replace(/^\/+|\/+$/g, '');
  return `${DRAMABOX_SITE_URL}/movie/${encodeURIComponent(bookId)}/${encodeURIComponent(slug)}`;
}

function normalizeDramaBook(raw: DramaBoxBookRaw): NormalizedDramaBoxItem | null {
  const bookId = String(raw.bookId || '').trim();
  if (!bookId) return null;
  const judul = String(raw.bookName || raw.name || '').trim() || `Drama ${bookId}`;

  const typeOneIds = Array.isArray(raw.typeOneIds) ? raw.typeOneIds : [];
  const typeOneNames = Array.isArray(raw.typeOneNames) ? raw.typeOneNames : [];
  const kategoriUtama: Array<{ id: number; nama: string; slug: string }> = [];
  const seenCat = new Set<number>();

  typeOneIds.forEach((cid, idx) => {
    const idNum = Number(cid);
    if (!Number.isFinite(idNum) || seenCat.has(idNum)) return;
    seenCat.add(idNum);
    const mapped = TYPE_ONE_LABEL_MAP[idNum];
    const label = String(typeOneNames[idx] || mapped?.nama || `Kategori ${idNum}`).trim();
    kategoriUtama.push({ id: idNum, nama: label, slug: mapped?.slug || slugify(label) });
  });

  if (kategoriUtama.length === 0 && raw.typeOneName) {
    const name = raw.typeOneName.trim();
    const matchedId = Object.entries(TYPE_ONE_LABEL_MAP).find(
      ([, v]) => v.nama.toLowerCase() === name.toLowerCase()
    );
    const idNum = matchedId ? Number(matchedId[0]) : 32;
    kategoriUtama.push({ id: idNum, nama: name, slug: slugify(name) });
  }

  const genreMap = new Map<number, { id: number; nama: string; slug: string }>();
  for (const g of raw.typeTwoList || []) {
    const gid = Number(g.id);
    const gname = String(g.name || '').trim();
    if (!Number.isFinite(gid) || !gname) continue;
    genreMap.set(gid, {
      id: gid,
      nama: gname,
      slug: String(g.replaceName || slugify(gname)).trim().toLowerCase(),
    });
  }
  if (genreMap.size === 0 && Array.isArray(raw.typeTwoIds)) {
    raw.typeTwoIds.forEach((gidRaw, idx) => {
      const gid = Number(gidRaw);
      const gname = String(raw.typeTwoNames?.[idx] || '').trim();
      if (Number.isFinite(gid) && gname) {
        genreMap.set(gid, { id: gid, nama: gname, slug: slugify(gname) });
      }
    });
  }

  const tagSet = new Set<string>();
  for (const t of [...(raw.tags || []), ...(raw.labels || [])]) {
    const clean = String(t || '').trim();
    if (clean) tagSet.add(clean);
  }

  const performerIds = Array.from(
    new Set(
      [
        ...(raw.performerIdList || []).map((id) => String(id).trim()),
        ...(raw.performerList || []).map((p) => String(p.performerId || '').trim()),
      ].filter(Boolean)
    )
  );

  const ratingNum =
    typeof raw.ratings === 'number' && Number.isFinite(raw.ratings) && raw.ratings > 0
      ? Number(raw.ratings.toFixed(1))
      : null;

  return {
    book_id: bookId,
    judul,
    sampul: typeof raw.cover === 'string' && raw.cover ? raw.cover : null,
    rating: ratingNum,
    jumlah_episode:
      typeof raw.chapterCount === 'number' && raw.chapterCount > 0 ? raw.chapterCount : null,
    penayangan:
      typeof raw.viewCountDisplay === 'string' && raw.viewCountDisplay
        ? raw.viewCountDisplay
        : null,
    penayangan_angka: parseViewDisplayCount(raw.viewCountDisplay, raw.viewCount),
    pengikut: typeof raw.followCount === 'number' && raw.followCount > 0 ? raw.followCount : 0,
    sinopsis:
      typeof raw.introduction === 'string' && raw.introduction.trim()
        ? raw.introduction.trim()
        : null,
    status_tayang:
      typeof raw.lastUpdateTimeDisplay === 'string' && raw.lastUpdateTimeDisplay
        ? raw.lastUpdateTimeDisplay
        : raw.status || null,
    tanggal_rilis: typeof raw.shelfTime === 'string' && raw.shelfTime ? raw.shelfTime : null,
    kategori_utama: kategoriUtama,
    genre: Array.from(genreMap.values()),
    tags: Array.from(tagSet),
    performer_ids: performerIds,
    url_dramabox: buildDramaBoxWebUrl(bookId, raw.replacedBookName, judul),
  };
}

interface CacheBucket<T> {
  value: T;
  expiresAt: number;
}

const apiCache = new Map<string, CacheBucket<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

async function withTtlCache<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = apiCache.get(key) as CacheBucket<T> | undefined;
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }
  const existing = inflightRequests.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const task = loader()
    .then((val) => {
      apiCache.set(key, { value: val, expiresAt: Date.now() + ttlMs });
      return val;
    })
    .finally(() => {
      inflightRequests.delete(key);
    });
  inflightRequests.set(key, task);
  return task;
}

async function fetchWebficJson<T>(
  endpointPath: string,
  lang: string,
  options: { method?: 'GET' | 'POST'; body?: Record<string, unknown>; timeoutMs?: number } = {}
): Promise<T> {
  const method = options.method || 'POST';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 9000);
  try {
    const res = await fetch(`${WEBFIC_BASE_URL}${endpointPath}`, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        pline: 'DRAMABOX',
        language: lang,
        'User-Agent': SCRAPE_UA,
        Accept: 'application/json',
      },
      ...(method === 'POST' ? { body: JSON.stringify(options.body || {}) } : {}),
    });
    if (!res.ok) {
      throw new Error(`Server DramaBox mengembalikan HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Permintaan ke server DramaBox melebihi batas waktu.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDramaBoxBrowseRaw(
  lang: string,
  typeTwoId: number,
  pageNo: number,
  pageSize: number
): Promise<DramaBoxBrowseResponse['data']> {
  const key = `db:browse:${lang}:${typeTwoId}:${pageNo}:${pageSize}`;
  return withTtlCache(key, 3 * 60_000, async () => {
    const res = await fetchWebficJson<DramaBoxBrowseResponse>('/webfic/home/browse', lang, {
      method: 'POST',
      body: { typeTwoId, pageNo, pageSize },
    });
    return res.data || {};
  });
}

async function fetchDramaBoxHomeRaw(lang: string): Promise<DramaBoxHomeShelfRaw[]> {
  const key = `db:home:${lang}`;
  return withTtlCache(key, 3 * 60_000, async () => {
    const res = await fetchWebficJson<{ data?: DramaBoxHomeShelfRaw[] }>(
      '/webfic/home/index',
      lang,
      {
        method: 'POST',
        body: { pageNo: 1 },
      }
    );
    return Array.isArray(res.data) ? res.data : [];
  });
}

async function fetchDramaBoxDetailRaw(
  bookId: string,
  lang: string
): Promise<DramaBoxDetailResponse['data'] | null> {
  const key = `db:detail:${lang}:${bookId}`;
  return withTtlCache(key, 5 * 60_000, async () => {
    const res = await fetchWebficJson<DramaBoxDetailResponse>('/webfic/book/detail', lang, {
      method: 'POST',
      body: { bookId },
    });
    return res.data?.book ? res.data : null;
  });
}

async function getDramaBoxCatalogIndex(lang: string): Promise<DramaBoxCatalogIndex> {
  const cacheKey = `db:index:${lang}`;
  return withTtlCache(cacheKey, 5 * 60_000, async () => {
    const [homeShelvesRaw, ...browsePages] = await Promise.all([
      fetchDramaBoxHomeRaw(lang),
      ...[1, 2, 3, 4, 5, 6].map((p) => fetchDramaBoxBrowseRaw(lang, 0, p, 50)),
    ]);

    const firstBrowseTypes = browsePages[0]?.types || [];
    const genres = firstBrowseTypes
      .filter((t) => typeof t.id === 'number' && typeof t.name === 'string' && t.name.trim())
      .map((t) => {
        const nama = String(t.name).trim();
        const slug = String(t.replaceName || slugify(nama)).trim().toLowerCase();
        return {
          genre_id: Number(t.id),
          nama,
          slug,
          url_dramabox: `${DRAMABOX_SITE_URL}/browse/${t.id}/${encodeURIComponent(slug)}`,
        };
      });

    const dramaMap = new Map<string, NormalizedDramaBoxItem>();
    const mergeDrama = (candidate: NormalizedDramaBoxItem | null) => {
      if (!candidate) return;
      const existing = dramaMap.get(candidate.book_id);
      if (!existing) {
        dramaMap.set(candidate.book_id, candidate);
        return;
      }
      dramaMap.set(candidate.book_id, {
        ...existing,
        rating: existing.rating ?? candidate.rating,
        jumlah_episode: existing.jumlah_episode ?? candidate.jumlah_episode,
        penayangan: existing.penayangan ?? candidate.penayangan,
        penayangan_angka: Math.max(existing.penayangan_angka, candidate.penayangan_angka),
        pengikut: Math.max(existing.pengikut, candidate.pengikut),
        sinopsis: existing.sinopsis ?? candidate.sinopsis,
        kategori_utama:
          existing.kategori_utama.length > 0 ? existing.kategori_utama : candidate.kategori_utama,
        genre: existing.genre.length > 0 ? existing.genre : candidate.genre,
        tags: existing.tags.length > 0 ? existing.tags : candidate.tags,
        performer_ids: Array.from(
          new Set([...existing.performer_ids, ...candidate.performer_ids])
        ),
      });
    };

    const shelves = homeShelvesRaw.map((shelf) => {
      const shelfId = Number(shelf.id || 0);
      const rawName = String(shelf.name || `Rak ${shelfId}`).trim();
      const friendlyName = SHELF_LABEL_MAP[rawName] || rawName;
      const items: NormalizedDramaBoxItem[] = [];
      for (const rawItem of shelf.items || []) {
        const norm = normalizeDramaBook(rawItem);
        if (norm) {
          items.push(norm);
          mergeDrama(norm);
        }
      }
      return {
        shelf_id: shelfId,
        nama_asli: rawName,
        nama_rak: friendlyName,
        gaya_tampilan: String(shelf.style || 'BOOK_LIST'),
        items,
      };
    });

    for (const pageData of browsePages) {
      for (const rawBook of pageData?.bookList || []) {
        mergeDrama(normalizeDramaBook(rawBook));
      }
    }

    // Hydrate performers & recommendations from featured shelves and tagged dramas in parallel
    const allDramasInitial = Array.from(dramaMap.values());
    const hydrateIds = Array.from(
      new Set([
        ...shelves.flatMap((s) => s.items.slice(0, 2).map((i) => i.book_id)),
        ...allDramasInitial.filter((d) => d.performer_ids.length > 0).map((d) => d.book_id),
      ])
    ).slice(0, 12);

    const performerMap = new Map<string, NormalizedDramaBoxPerformer>();
    const performerDramas = new Map<string, NormalizedDramaBoxItem[]>();

    const detailResults = await Promise.allSettled(
      hydrateIds.map((bid) => fetchDramaBoxDetailRaw(bid, lang))
    );

    for (const res of detailResults) {
      if (res.status !== 'fulfilled' || !res.value?.book) continue;
      const detailBook = normalizeDramaBook(res.value.book);
      if (detailBook) mergeDrama(detailBook);
      const targetDrama = detailBook ? dramaMap.get(detailBook.book_id) || detailBook : null;

      for (const rec of res.value.recommends || []) {
        mergeDrama(normalizeDramaBook(rec));
      }

      for (const p of res.value.book.performerList || []) {
        const pid = String(p.performerId || '').trim();
        const pname = String(p.performerName || '').trim();
        if (!pid || !pname) continue;
        if (!performerMap.has(pid)) {
          performerMap.set(pid, {
            performer_id: pid,
            nama: pname,
            slug: String(p.performerFormatName || slugify(pname)).trim(),
            avatar: typeof p.performerAvatar === 'string' && p.performerAvatar ? p.performerAvatar : null,
            jumlah_video: typeof p.videoCount === 'number' ? p.videoCount : 1,
          });
        }
        if (targetDrama) {
          const list = performerDramas.get(pid) || [];
          if (!list.some((d) => d.book_id === targetDrama.book_id)) {
            list.push(targetDrama);
            performerDramas.set(pid, list);
          }
        }
      }
    }

    // Associate any other dramas in catalog that reference cached performer_ids
    const dramas = Array.from(dramaMap.values());
    for (const drama of dramas) {
      for (const pid of drama.performer_ids) {
        if (performerMap.has(pid)) {
          const list = performerDramas.get(pid) || [];
          if (!list.some((d) => d.book_id === drama.book_id)) {
            list.push(drama);
            performerDramas.set(pid, list);
          }
        }
      }
    }

    return {
      fetchedAt: Date.now(),
      lang,
      genres,
      shelves,
      dramas,
      dramaMap,
      performers: Array.from(performerMap.values()),
      performerMap,
      performerDramas,
    };
  });
}

function parsePositiveInt(raw: unknown, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function resolveGenreIdFromQuery(
  genres: DramaBoxCatalogIndex['genres'],
  rawIdOrSlug: string
): { id: number; nama: string; slug: string } | null {
  const clean = rawIdOrSlug.trim().toLowerCase();
  if (!clean || clean === '0' || clean === 'all' || clean === 'semua') return null;
  const asNum = Number(clean);
  if (Number.isFinite(asNum) && asNum > 0) {
    const byId = genres.find((g) => g.genre_id === asNum);
    return byId
      ? { id: byId.genre_id, nama: byId.nama, slug: byId.slug }
      : { id: asNum, nama: `Genre ${asNum}`, slug: String(asNum) };
  }
  const byText = genres.find(
    (g) => g.slug === clean || g.nama.toLowerCase() === clean || g.nama.toLowerCase().includes(clean)
  );
  return byText ? { id: byText.genre_id, nama: byText.nama, slug: byText.slug } : null;
}

export function registerDramaBoxRoutes(app: Express): void {
  // 1. GET /api/v1/streaming/dramabox/browse - Browse DramaBox short dramas by genre
  app.get('/api/v1/streaming/dramabox/browse', async (req: Request, res: Response) => {
    const lang = normalizeDramaBoxLang(req.query.lang);
    const page = parsePositiveInt(req.query.page, 1, 1, 100);
    const limit = parsePositiveInt(req.query.limit, 20, 1, 50);
    const genreParam = String(req.query.genre_id || req.query.typeTwoId || req.query.genre || '').trim();

    try {
      const index = await getDramaBoxCatalogIndex(lang);
      const resolvedGenre = genreParam ? resolveGenreIdFromQuery(index.genres, genreParam) : null;
      if (genreParam && !resolvedGenre && genreParam !== '0' && genreParam.toLowerCase() !== 'all') {
        return res.status(404).json({
          sukses: false,
          kesalahan: {
            kode: 'GENRE_TIDAK_DITEMUKAN',
            pesan: `Genre "${genreParam}" tidak ditemukan di katalog DramaBox. Lihat daftar genre lewat /api/v1/streaming/dramabox/genres.`,
          },
        });
      }

      const typeTwoId = resolvedGenre?.id ?? 0;
      const browseData = await fetchDramaBoxBrowseRaw(lang, typeTwoId, page, limit);
      const dramas = (browseData?.bookList || [])
        .map(normalizeDramaBook)
        .filter((item): item is NormalizedDramaBoxItem => Boolean(item));

      return res.json({
        sukses: true,
        layanan: 'dramabox-browse',
        sumber_data: 'dramabox-api-live',
        bahasa: lang,
        genre_aktif: resolvedGenre || { id: 0, nama: 'Semua Genre', slug: 'all' },
        halaman: browseData?.currentPage || page,
        per_halaman: limit,
        total_halaman: browseData?.pages || 1,
        total_data: browseData?.total || dramas.length,
        jumlah: dramas.length,
        daftar_genre: index.genres,
        dramas,
      });
    } catch (err) {
      return res.status(502).json({
        sukses: false,
        kesalahan: {
          kode: 'DRAMABOX_UPSTREAM_ERROR',
          pesan: err instanceof Error ? err.message : 'Gagal menjelajahi katalog DramaBox.',
        },
      });
    }
  });

  // 2. GET /api/v1/streaming/dramabox/categories - List DramaBox category filters
  app.get('/api/v1/streaming/dramabox/categories', async (req: Request, res: Response) => {
    const lang = normalizeDramaBoxLang(req.query.lang);
    try {
      const index = await getDramaBoxCatalogIndex(lang);
      const primaryMap = new Map<number, { kategori_id: number; nama: string; slug: string; jumlah_judul: number }>();
      for (const d of index.dramas) {
        for (const cat of d.kategori_utama) {
          const prev = primaryMap.get(cat.id);
          if (prev) prev.jumlah_judul += 1;
          else {
            primaryMap.set(cat.id, {
              kategori_id: cat.id,
              nama: cat.nama,
              slug: cat.slug,
              jumlah_judul: 1,
            });
          }
        }
      }

      const tagCounts = new Map<string, number>();
      for (const d of index.dramas) {
        for (const t of d.tags) {
          tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
        }
      }

      const kategoriUtama = Array.from(primaryMap.values()).sort((a, b) => b.jumlah_judul - a.jumlah_judul);
      const filterGenre = index.genres.map((g) => ({
        category_id: g.genre_id,
        nama: g.nama,
        slug: g.slug,
      }));
      const tagPopuler = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([nama, jumlah_judul]) => ({ nama, slug: slugify(nama), jumlah_judul }));

      return res.json({
        sukses: true,
        layanan: 'dramabox-categories',
        sumber_data: 'dramabox-api-live',
        bahasa: lang,
        total_kategori_utama: kategoriUtama.length,
        total_filter_genre: filterGenre.length,
        kategori_utama: kategoriUtama,
        filter_genre: filterGenre,
        tag_populer: tagPopuler,
      });
    } catch (err) {
      return res.status(502).json({
        sukses: false,
        kesalahan: {
          kode: 'DRAMABOX_UPSTREAM_ERROR',
          pesan: err instanceof Error ? err.message : 'Gagal memuat daftar kategori DramaBox.',
        },
      });
    }
  });

  // 3. GET /api/v1/streaming/dramabox/category-books - Browse DramaBox titles by category
  app.get('/api/v1/streaming/dramabox/category-books', async (req: Request, res: Response) => {
    const lang = normalizeDramaBoxLang(req.query.lang);
    const page = parsePositiveInt(req.query.page, 1, 1, 100);
    const limit = parsePositiveInt(req.query.limit, 20, 1, 50);
    const catParam = String(req.query.category_id || req.query.category || req.query.id || '').trim();

    try {
      const index = await getDramaBoxCatalogIndex(lang);
      const lower = catParam.toLowerCase();

      // Check if primary audience category (31=Pria, 32=Wanita)
      let primaryId: number | null = null;
      if (lower === '32' || lower === 'wanita' || lower === 'female') primaryId = 32;
      else if (lower === '31' || lower === 'pria' || lower === 'male') primaryId = 31;

      if (primaryId !== null) {
        const matched = index.dramas.filter((d) => d.kategori_utama.some((c) => c.id === primaryId));
        const startIdx = (page - 1) * limit;
        const paged = matched.slice(startIdx, startIdx + limit);
        const catInfo = TYPE_ONE_LABEL_MAP[primaryId] || { nama: `Kategori ${primaryId}`, slug: String(primaryId) };
        return res.json({
          sukses: true,
          layanan: 'dramabox-category-books',
          sumber_data: 'dramabox-api-live',
          bahasa: lang,
          kategori_aktif: { category_id: primaryId, tipe: 'kategori_utama', ...catInfo },
          halaman: page,
          per_halaman: limit,
          total_hasil: matched.length,
          total_halaman: Math.max(1, Math.ceil(matched.length / limit)),
          jumlah: paged.length,
          dramas: paged,
        });
      }

      // Otherwise treat as genre/category filter via live /webfic/home/browse
      const resolvedGenre = catParam ? resolveGenreIdFromQuery(index.genres, catParam) : null;
      if (catParam && !resolvedGenre && lower !== '0' && lower !== 'all') {
        return res.status(404).json({
          sukses: false,
          kesalahan: {
            kode: 'KATEGORI_TIDAK_DITEMUKAN',
            pesan: `Kategori "${catParam}" tidak ditemukan. Gunakan ID/slug dari /api/v1/streaming/dramabox/categories.`,
          },
        });
      }

      const typeTwoId = resolvedGenre?.id ?? (index.genres[0]?.genre_id || 0);
      const activeGenreInfo =
        resolvedGenre ||
        (index.genres[0]
          ? { id: index.genres[0].genre_id, nama: index.genres[0].nama, slug: index.genres[0].slug }
          : { id: 0, nama: 'Semua Kategori', slug: 'all' });

      const browseData = await fetchDramaBoxBrowseRaw(lang, typeTwoId, page, limit);
      const dramas = (browseData?.bookList || [])
        .map(normalizeDramaBook)
        .filter((item): item is NormalizedDramaBoxItem => Boolean(item));

      return res.json({
        sukses: true,
        layanan: 'dramabox-category-books',
        sumber_data: 'dramabox-api-live',
        bahasa: lang,
        kategori_aktif: {
          category_id: activeGenreInfo.id,
          tipe: 'filter_genre',
          nama: activeGenreInfo.nama,
          slug: activeGenreInfo.slug,
        },
        halaman: browseData?.currentPage || page,
        per_halaman: limit,
        total_hasil: browseData?.total || dramas.length,
        total_halaman: browseData?.pages || 1,
        jumlah: dramas.length,
        dramas,
      });
    } catch (err) {
      return res.status(502).json({
        sukses: false,
        kesalahan: {
          kode: 'DRAMABOX_UPSTREAM_ERROR',
          pesan: err instanceof Error ? err.message : 'Gagal memuat drama berdasarkan kategori.',
        },
      });
    }
  });

  // 4. GET /api/v1/streaming/dramabox/channels - List DramaBox theater channels
  app.get('/api/v1/streaming/dramabox/channels', async (req: Request, res: Response) => {
    const lang = normalizeDramaBoxLang(req.query.lang);
    try {
      const index = await getDramaBoxCatalogIndex(lang);

      const shelfChannels = index.shelves.map((shelf) => ({
        channel_id: String(shelf.shelf_id),
        slug: slugify(shelf.nama_rak),
        nama: shelf.nama_rak,
        nama_asli: shelf.nama_asli,
        tipe: 'theater_shelf',
        deskripsi: `Saluran tayangan ${shelf.nama_rak} dari beranda DramaBox.`,
        jumlah_judul: shelf.items.length,
        pratinjau: shelf.items.slice(0, 4),
      }));

      const audienceChannels = [32, 31].map((cid) => {
        const meta = TYPE_ONE_LABEL_MAP[cid];
        const items = index.dramas.filter((d) => d.kategori_utama.some((c) => c.id === cid));
        return {
          channel_id: String(cid),
          slug: meta.slug,
          nama: `Theater ${meta.nama}`,
          nama_asli: meta.nama,
          tipe: 'audience_channel',
          deskripsi: `Kumpulan serial DramaBox pilihan segmen ${meta.nama}.`,
          jumlah_judul: items.length,
          pratinjau: items.slice(0, 4),
        };
      });

      const channels = [...shelfChannels, ...audienceChannels];
      return res.json({
        sukses: true,
        layanan: 'dramabox-channels',
        sumber_data: 'dramabox-api-live',
        bahasa: lang,
        jumlah: channels.length,
        channels,
      });
    } catch (err) {
      return res.status(502).json({
        sukses: false,
        kesalahan: {
          kode: 'DRAMABOX_UPSTREAM_ERROR',
          pesan: err instanceof Error ? err.message : 'Gagal memuat daftar saluran DramaBox.',
        },
      });
    }
  });

  // 5. GET /api/v1/streaming/dramabox/drama - Get a DramaBox short drama and its episodes
  app.get('/api/v1/streaming/dramabox/drama', async (req: Request, res: Response) => {
    const lang = normalizeDramaBoxLang(req.query.lang);
    const bookId = String(req.query.book_id || req.query.id || '').trim();
    if (!bookId || !/^\d{5,20}$/.test(bookId)) {
      return res.status(400).json({
        sukses: false,
        kesalahan: {
          kode: 'BOOK_ID_TIDAK_VALID',
          pesan: 'Parameter query book_id wajib diisi ID drama DramaBox (contoh: 41000119953 atau 42000035106).',
        },
      });
    }

    try {
      const detail = await fetchDramaBoxDetailRaw(bookId, lang);
      if (!detail?.book) {
        return res.status(404).json({
          sukses: false,
          kesalahan: {
            kode: 'DRAMA_TIDAK_DITEMUKAN',
            pesan: `DramaBox tidak menemukan judul dengan book_id "${bookId}".`,
          },
        });
      }

      const normalized = normalizeDramaBook(detail.book)!;
      const totalEp = detail.book.chapterCount || normalized.jumlah_episode || 0;
      const firstChapterId = detail.chapter?.id ? String(detail.chapter.id) : null;
      const replacedBookName = detail.book.replacedBookName || slugify(normalized.judul);

      const episodes = Array.from({ length: Math.min(totalEp, 200) }, (_, idx) => {
        const epNum = idx + 1;
        return {
          episode_nomor: epNum,
          judul_episode: epNum === 1 && detail.chapter?.name ? detail.chapter.name : `Episode ${epNum}`,
          chapter_id: epNum === 1 ? firstChapterId : null,
          gratis_pembuka: epNum === 1 ? true : null,
          url_dramabox:
            epNum === 1 && firstChapterId
              ? `${DRAMABOX_SITE_URL}/ep/${encodeURIComponent(bookId)}_${encodeURIComponent(replacedBookName)}/${encodeURIComponent(firstChapterId)}_Episode-1`
              : `${normalized.url_dramabox}#episode-${epNum}`,
        };
      });

      const performers = (detail.book.performerList || []).map((p) => ({
        performer_id: String(p.performerId || ''),
        nama: String(p.performerName || ''),
        slug: String(p.performerFormatName || ''),
        avatar: p.performerAvatar || null,
        jumlah_video: typeof p.videoCount === 'number' ? p.videoCount : 1,
      }));

      const rekomendasi = (detail.recommends || [])
        .map(normalizeDramaBook)
        .filter((item): item is NormalizedDramaBoxItem => Boolean(item));

      return res.json({
        sukses: true,
        layanan: 'dramabox-drama',
        sumber_data: 'dramabox-api-live',
        bahasa: lang,
        drama: {
          ...normalized,
          bahasa_tersedia: detail.languages || [lang],
          pemeran: performers,
        },
        episode_pembuka: detail.chapter
          ? {
              chapter_id: firstChapterId,
              judul: detail.chapter.name || 'Episode 1',
              harga_kredit: detail.chapter.chapterPrice ?? 0,
            }
          : null,
        total_episode: totalEp,
        episodes,
        rekomendasi,
      });
    } catch (err) {
      return res.status(502).json({
        sukses: false,
        kesalahan: {
          kode: 'DRAMABOX_UPSTREAM_ERROR',
          pesan: err instanceof Error ? err.message : 'Gagal mengambil detail drama dari DramaBox.',
        },
      });
    }
  });

  // 6. GET /api/v1/streaming/dramabox/genres - List DramaBox genres
  app.get('/api/v1/streaming/dramabox/genres', async (req: Request, res: Response) => {
    const lang = normalizeDramaBoxLang(req.query.lang);
    try {
      const index = await getDramaBoxCatalogIndex(lang);
      return res.json({
        sukses: true,
        layanan: 'dramabox-genres',
        sumber_data: 'dramabox-api-live',
        bahasa: lang,
        jumlah: index.genres.length,
        genres: index.genres,
      });
    } catch (err) {
      return res.status(502).json({
        sukses: false,
        kesalahan: {
          kode: 'DRAMABOX_UPSTREAM_ERROR',
          pesan: err instanceof Error ? err.message : 'Gagal memuat daftar genre DramaBox.',
        },
      });
    }
  });

  // 7. GET /api/v1/streaming/dramabox/home - List DramaBox's featured titles and shelves
  app.get('/api/v1/streaming/dramabox/home', async (req: Request, res: Response) => {
    const lang = normalizeDramaBoxLang(req.query.lang);
    try {
      const index = await getDramaBoxCatalogIndex(lang);
      const rak = index.shelves.map((s) => ({
        shelf_id: s.shelf_id,
        nama_rak: s.nama_rak,
        nama_asli: s.nama_asli,
        gaya_tampilan: s.gaya_tampilan,
        jumlah_item: s.items.length,
        items: s.items,
      }));
      const featuredDramas = index.shelves.flatMap((s) => s.items);
      return res.json({
        sukses: true,
        layanan: 'dramabox-home',
        sumber_data: 'dramabox-api-live',
        bahasa: lang,
        jumlah_rak: rak.length,
        jumlah_judul: featuredDramas.length,
        rak,
        dramas: featuredDramas,
      });
    } catch (err) {
      return res.status(502).json({
        sukses: false,
        kesalahan: {
          kode: 'DRAMABOX_UPSTREAM_ERROR',
          pesan: err instanceof Error ? err.message : 'Gagal mengambil beranda unggulan DramaBox.',
        },
      });
    }
  });

  // 8. GET /api/v1/streaming/dramabox/more - Get a whole DramaBox curated shelf
  app.get('/api/v1/streaming/dramabox/more', async (req: Request, res: Response) => {
    const lang = normalizeDramaBoxLang(req.query.lang);
    const page = parsePositiveInt(req.query.page, 1, 1, 50);
    const limit = parsePositiveInt(req.query.limit, 20, 1, 50);
    const shelfParam = String(req.query.shelf_id || req.query.position || req.query.id || '').trim();

    try {
      const index = await getDramaBoxCatalogIndex(lang);
      const matchedShelf =
        index.shelves.find(
          (s) =>
            String(s.shelf_id) === shelfParam ||
            slugify(s.nama_rak) === shelfParam.toLowerCase() ||
            s.nama_rak.toLowerCase().includes(shelfParam.toLowerCase())
        ) || index.shelves[0];

      if (!matchedShelf) {
        return res.status(404).json({
          sukses: false,
          kesalahan: {
            kode: 'RAK_TIDAK_DITEMUKAN',
            pesan: 'Rak kurasi DramaBox tidak ditemukan.',
          },
        });
      }

      // Build complete shelf by starting from curated items + hydrating related recommendations
      const fullMap = new Map<string, NormalizedDramaBoxItem>();
      for (const item of matchedShelf.items) {
        fullMap.set(item.book_id, item);
      }
      // Supplement shelf items with related genres from catalog so full curated view is rich
      const shelfGenres = new Set(matchedShelf.items.flatMap((i) => i.genre.map((g) => g.id)));
      for (const d of index.dramas) {
        if (fullMap.size >= 40) break;
        if (d.genre.some((g) => shelfGenres.has(g.id)) && !fullMap.has(d.book_id)) {
          fullMap.set(d.book_id, d);
        }
      }

      const fullItems = Array.from(fullMap.values());
      const startIdx = (page - 1) * limit;
      const paged = fullItems.slice(startIdx, startIdx + limit);

      return res.json({
        sukses: true,
        layanan: 'dramabox-more',
        sumber_data: 'dramabox-api-live',
        bahasa: lang,
        rak: {
          shelf_id: matchedShelf.shelf_id,
          nama_rak: matchedShelf.nama_rak,
          nama_asli: matchedShelf.nama_asli,
          gaya_tampilan: matchedShelf.gaya_tampilan,
          tersedia_rak_lain: index.shelves.map((s) => ({
            shelf_id: s.shelf_id,
            nama_rak: s.nama_rak,
          })),
        },
        halaman: page,
        per_halaman: limit,
        total_hasil: fullItems.length,
        total_halaman: Math.max(1, Math.ceil(fullItems.length / limit)),
        jumlah: paged.length,
        dramas: paged,
      });
    } catch (err) {
      return res.status(502).json({
        sukses: false,
        kesalahan: {
          kode: 'DRAMABOX_UPSTREAM_ERROR',
          pesan: err instanceof Error ? err.message : 'Gagal mengambil rak kurasi penuh DramaBox.',
        },
      });
    }
  });

  // 9. GET /api/v1/streaming/dramabox/performer - Get a DramaBox performer and their titles
  app.get('/api/v1/streaming/dramabox/performer', async (req: Request, res: Response) => {
    const lang = normalizeDramaBoxLang(req.query.lang);
    const performerId = String(req.query.performer_id || req.query.id || '').trim();
    const query = String(req.query.q || req.query.name || '').trim().toLowerCase();
    const limit = parsePositiveInt(req.query.limit, 20, 1, 50);

    try {
      const index = await getDramaBoxCatalogIndex(lang);

      let matchedPerformers = index.performers;
      if (performerId) {
        matchedPerformers = index.performers.filter((p) => p.performer_id === performerId);
      } else if (query) {
        matchedPerformers = index.performers.filter(
          (p) => p.nama.toLowerCase().includes(query) || p.slug.toLowerCase().includes(query)
        );
      }

      if ((performerId || query) && matchedPerformers.length === 0) {
        return res.status(404).json({
          sukses: false,
          kesalahan: {
            kode: 'PEMERAN_TIDAK_DITEMUKAN',
            pesan: `Pemeran DramaBox "${performerId || query}" tidak ditemukan dalam katalog aktif.`,
          },
        });
      }

      const selected = matchedPerformers[0] || null;
      const dramasMap = new Map<string, NormalizedDramaBoxItem>();
      for (const p of matchedPerformers.slice(0, 6)) {
        for (const d of index.performerDramas.get(p.performer_id) || []) {
          dramasMap.set(d.book_id, d);
        }
      }
      const dramas = Array.from(dramasMap.values()).slice(0, limit);

      return res.json({
        sukses: true,
        layanan: 'dramabox-performer',
        sumber_data: 'dramabox-api-live',
        bahasa: lang,
        performer: selected,
        total_pemeran: matchedPerformers.length,
        performers: matchedPerformers.slice(0, limit).map((p) => ({
          ...p,
          judul_terdaftar: (index.performerDramas.get(p.performer_id) || []).map((d) => ({
            book_id: d.book_id,
            judul: d.judul,
            sampul: d.sampul,
          })),
        })),
        jumlah_drama: dramas.length,
        dramas,
      });
    } catch (err) {
      return res.status(502).json({
        sukses: false,
        kesalahan: {
          kode: 'DRAMABOX_UPSTREAM_ERROR',
          pesan: err instanceof Error ? err.message : 'Gagal memuat profil pemeran DramaBox.',
        },
      });
    }
  });

  // 10. GET /api/v1/streaming/dramabox/rank - Get a DramaBox ranking list
  app.get('/api/v1/streaming/dramabox/rank', async (req: Request, res: Response) => {
    const lang = normalizeDramaBoxLang(req.query.lang);
    const rankTypeRaw = String(req.query.type || req.query.rank_type || 'popular')
      .trim()
      .toLowerCase();
    const page = parsePositiveInt(req.query.page, 1, 1, 20);
    const limit = parsePositiveInt(req.query.limit, 20, 1, 50);

    try {
      const index = await getDramaBoxCatalogIndex(lang);
      const sorted = [...index.dramas];

      if (rankTypeRaw === 'rating') {
        sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.pengikut - a.pengikut);
      } else if (rankTypeRaw === 'newest' || rankTypeRaw === 'terbaru') {
        sorted.sort((a, b) =>
          String(b.tanggal_rilis || '').localeCompare(String(a.tanggal_rilis || ''))
        );
      } else if (rankTypeRaw === 'trending') {
        sorted.sort(
          (a, b) =>
            b.penayangan_angka + b.pengikut * 2 - (a.penayangan_angka + a.pengikut * 2)
        );
      } else {
        sorted.sort(
          (a, b) =>
            b.pengikut - a.pengikut ||
            b.penayangan_angka - a.penayangan_angka ||
            (b.rating ?? 0) - (a.rating ?? 0)
        );
      }

      const startIdx = (page - 1) * limit;
      const paged = sorted.slice(startIdx, startIdx + limit).map((d, idx) => ({
        peringkat: startIdx + idx + 1,
        ...d,
      }));

      return res.json({
        sukses: true,
        layanan: 'dramabox-rank',
        sumber_data: 'dramabox-api-live',
        bahasa: lang,
        jenis_peringkat: rankTypeRaw,
        halaman: page,
        per_halaman: limit,
        total_hasil: sorted.length,
        total_halaman: Math.max(1, Math.ceil(sorted.length / limit)),
        jumlah: paged.length,
        dramas: paged,
      });
    } catch (err) {
      return res.status(502).json({
        sukses: false,
        kesalahan: {
          kode: 'DRAMABOX_UPSTREAM_ERROR',
          pesan: err instanceof Error ? err.message : 'Gagal memuat peringkat DramaBox.',
        },
      });
    }
  });

  // 11. GET /api/v1/streaming/dramabox/recommend - Get a page of DramaBox's recommendation feed
  app.get('/api/v1/streaming/dramabox/recommend', async (req: Request, res: Response) => {
    const lang = normalizeDramaBoxLang(req.query.lang);
    const page = parsePositiveInt(req.query.page, 1, 1, 20);
    const limit = parsePositiveInt(req.query.limit, 18, 1, 50);
    const seedBookId = String(req.query.book_id || req.query.id || '').trim();

    try {
      const index = await getDramaBoxCatalogIndex(lang);
      const anchorIds = seedBookId
        ? [seedBookId]
        : index.shelves
            .flatMap((s) => s.items.slice(0, 2).map((i) => i.book_id))
            .slice(0, 4);

      const recResults = await Promise.allSettled(
        anchorIds.map((id) => fetchDramaBoxDetailRaw(id, lang))
      );

      const recMap = new Map<string, NormalizedDramaBoxItem>();
      for (const r of recResults) {
        if (r.status !== 'fulfilled' || !r.value) continue;
        for (const item of r.value.recommends || []) {
          const norm = normalizeDramaBook(item);
          if (norm && norm.book_id !== seedBookId) {
            recMap.set(norm.book_id, norm);
          }
        }
      }

      // If more pages requested, append top rated/followed dramas from catalog
      if (!seedBookId) {
        for (const d of index.dramas) {
          if (recMap.size >= 80) break;
          if (!recMap.has(d.book_id)) recMap.set(d.book_id, d);
        }
      }

      const allRecs = Array.from(recMap.values());
      const startIdx = (page - 1) * limit;
      const paged = allRecs.slice(startIdx, startIdx + limit);

      return res.json({
        sukses: true,
        layanan: 'dramabox-recommend',
        sumber_data: 'dramabox-api-live',
        bahasa: lang,
        acuan_book_id: seedBookId || anchorIds[0] || null,
        halaman: page,
        per_halaman: limit,
        total_hasil: allRecs.length,
        total_halaman: Math.max(1, Math.ceil(allRecs.length / limit)),
        jumlah: paged.length,
        dramas: paged,
      });
    } catch (err) {
      return res.status(502).json({
        sukses: false,
        kesalahan: {
          kode: 'DRAMABOX_UPSTREAM_ERROR',
          pesan: err instanceof Error ? err.message : 'Gagal mengambil rekomendasi DramaBox.',
        },
      });
    }
  });

  // 12. GET /api/v1/streaming/dramabox/search - Search DramaBox titles and performers
  app.get('/api/v1/streaming/dramabox/search', async (req: Request, res: Response) => {
    const lang = normalizeDramaBoxLang(req.query.lang);
    const q = String(req.query.q || req.query.keyword || '').trim();
    const page = parsePositiveInt(req.query.page, 1, 1, 50);
    const limit = parsePositiveInt(req.query.limit, 20, 1, 50);

    if (q.length < 2 || q.length > 100) {
      return res.status(400).json({
        sukses: false,
        kesalahan: {
          kode: 'QUERY_TIDAK_VALID',
          pesan: 'Parameter query q (atau keyword) wajib diisi minimal 2 karakter.',
        },
      });
    }

    try {
      const index = await getDramaBoxCatalogIndex(lang);
      const qLower = q.toLowerCase();

      const matchedPerformers = index.performers.filter(
        (p) => p.nama.toLowerCase().includes(qLower) || p.slug.toLowerCase().includes(qLower)
      );
      const matchedPerfIds = new Set(matchedPerformers.map((p) => p.performer_id));

      const matchedDramas = index.dramas.filter((d) => {
        if (d.judul.toLowerCase().includes(qLower)) return true;
        if (d.sinopsis && d.sinopsis.toLowerCase().includes(qLower)) return true;
        if (d.tags.some((t) => t.toLowerCase().includes(qLower))) return true;
        if (d.genre.some((g) => g.nama.toLowerCase().includes(qLower))) return true;
        if (d.performer_ids.some((pid) => matchedPerfIds.has(pid))) return true;
        return false;
      });

      // Rank title prefix/exact matches first
      matchedDramas.sort((a, b) => {
        const aTitle = a.judul.toLowerCase().includes(qLower) ? 1 : 0;
        const bTitle = b.judul.toLowerCase().includes(qLower) ? 1 : 0;
        if (aTitle !== bTitle) return bTitle - aTitle;
        return b.pengikut - a.pengikut;
      });

      const startIdx = (page - 1) * limit;
      const pagedDramas = matchedDramas.slice(startIdx, startIdx + limit);

      return res.json({
        sukses: true,
        layanan: 'dramabox-search',
        sumber_data: 'dramabox-api-live',
        bahasa: lang,
        query: q,
        halaman: page,
        per_halaman: limit,
        total_hasil: matchedDramas.length,
        total_halaman: Math.max(1, Math.ceil(matchedDramas.length / limit)),
        jumlah: pagedDramas.length,
        performers: matchedPerformers.slice(0, 10),
        dramas: pagedDramas,
      });
    } catch (err) {
      return res.status(502).json({
        sukses: false,
        kesalahan: {
          kode: 'DRAMABOX_UPSTREAM_ERROR',
          pesan: err instanceof Error ? err.message : 'Gagal mencari di katalog DramaBox.',
        },
      });
    }
  });

  // 13. GET /api/v1/streaming/dramabox/suggest - Get DramaBox search-box suggestions
  app.get('/api/v1/streaming/dramabox/suggest', async (req: Request, res: Response) => {
    const lang = normalizeDramaBoxLang(req.query.lang);
    const q = String(req.query.q || req.query.keyword || '').trim();
    const limit = parsePositiveInt(req.query.limit, 10, 1, 25);

    if (q.length < 1 || q.length > 80) {
      return res.status(400).json({
        sukses: false,
        kesalahan: {
          kode: 'QUERY_TIDAK_VALID',
          pesan: 'Parameter query q (atau keyword) wajib diisi minimal 1 karakter.',
        },
      });
    }

    try {
      const index = await getDramaBoxCatalogIndex(lang);
      const qLower = q.toLowerCase();

      interface SuggestItem {
        tipe: 'drama' | 'performer' | 'genre' | 'tag';
        id: string;
        teks: string;
        subjudul: string | null;
        sampul: string | null;
      }

      const suggestions: SuggestItem[] = [];
      const seen = new Set<string>();

      for (const d of index.dramas) {
        if (suggestions.length >= limit) break;
        if (d.judul.toLowerCase().includes(qLower)) {
          const key = `drama:${d.book_id}`;
          if (!seen.has(key)) {
            seen.add(key);
            suggestions.push({
              tipe: 'drama',
              id: d.book_id,
              teks: d.judul,
              subjudul: d.genre.map((g) => g.nama).slice(0, 2).join(', ') || 'Short Drama',
              sampul: d.sampul,
            });
          }
        }
      }

      for (const p of index.performers) {
        if (suggestions.length >= limit) break;
        if (p.nama.toLowerCase().includes(qLower)) {
          const key = `perf:${p.performer_id}`;
          if (!seen.has(key)) {
            seen.add(key);
            suggestions.push({
              tipe: 'performer',
              id: p.performer_id,
              teks: p.nama,
              subjudul: `Pemeran (${p.jumlah_video} video)`,
              sampul: p.avatar,
            });
          }
        }
      }

      for (const g of index.genres) {
        if (suggestions.length >= limit) break;
        if (g.nama.toLowerCase().includes(qLower) || g.slug.includes(qLower)) {
          const key = `genre:${g.genre_id}`;
          if (!seen.has(key)) {
            seen.add(key);
            suggestions.push({
              tipe: 'genre',
              id: String(g.genre_id),
              teks: g.nama,
              subjudul: 'Genre DramaBox',
              sampul: null,
            });
          }
        }
      }

      const tagSet = new Set<string>();
      for (const d of index.dramas) {
        for (const t of d.tags) tagSet.add(t);
      }
      for (const t of tagSet) {
        if (suggestions.length >= limit) break;
        if (t.toLowerCase().includes(qLower)) {
          const key = `tag:${t.toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            suggestions.push({
              tipe: 'tag',
              id: slugify(t),
              teks: t,
              subjudul: 'Tag Populer',
              sampul: null,
            });
          }
        }
      }

      return res.json({
        sukses: true,
        layanan: 'dramabox-suggest',
        sumber_data: 'dramabox-api-live',
        bahasa: lang,
        query: q,
        jumlah: suggestions.length,
        saran: suggestions,
      });
    } catch (err) {
      return res.status(502).json({
        sukses: false,
        kesalahan: {
          kode: 'DRAMABOX_UPSTREAM_ERROR',
          pesan: err instanceof Error ? err.message : 'Gagal mengambil saran pencarian DramaBox.',
        },
      });
    }
  });

  // 14. GET /api/v1/streaming/dramabox/tag - List the DramaBox titles carrying a tag
  app.get('/api/v1/streaming/dramabox/tag', async (req: Request, res: Response) => {
    const lang = normalizeDramaBoxLang(req.query.lang);
    const tagParam = String(req.query.tag || req.query.q || '').trim();
    const page = parsePositiveInt(req.query.page, 1, 1, 50);
    const limit = parsePositiveInt(req.query.limit, 20, 1, 50);

    try {
      const index = await getDramaBoxCatalogIndex(lang);
      const tagStats = new Map<string, number>();
      for (const d of index.dramas) {
        for (const t of d.tags) {
          tagStats.set(t, (tagStats.get(t) || 0) + 1);
        }
      }
      const daftarTag = Array.from(tagStats.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([nama, jumlah_judul]) => ({ nama, slug: slugify(nama), jumlah_judul }));

      const activeTag =
        tagParam || (daftarTag[0]?.nama ?? 'Strong Female Lead');
      const needle = activeTag.toLowerCase();

      const matched = index.dramas.filter((d) =>
        d.tags.some(
          (t) =>
            t.toLowerCase() === needle ||
            slugify(t) === needle ||
            t.toLowerCase().includes(needle)
        )
      );

      const startIdx = (page - 1) * limit;
      const paged = matched.slice(startIdx, startIdx + limit);

      return res.json({
        sukses: true,
        layanan: 'dramabox-tag',
        sumber_data: 'dramabox-api-live',
        bahasa: lang,
        tag_aktif: activeTag,
        halaman: page,
        per_halaman: limit,
        total_hasil: matched.length,
        total_halaman: Math.max(1, Math.ceil(matched.length / limit)),
        jumlah: paged.length,
        daftar_tag: daftarTag.slice(0, 30),
        dramas: paged,
      });
    } catch (err) {
      return res.status(502).json({
        sukses: false,
        kesalahan: {
          kode: 'DRAMABOX_UPSTREAM_ERROR',
          pesan: err instanceof Error ? err.message : 'Gagal mengambil daftar drama per tag.',
        },
      });
    }
  });

  // 15. GET /api/v1/streaming/dramabox/theater - Get a DramaBox theater channel feed
  app.get('/api/v1/streaming/dramabox/theater', async (req: Request, res: Response) => {
    const lang = normalizeDramaBoxLang(req.query.lang);
    const channelParam = String(req.query.channel_id || req.query.channel || '1267').trim();
    const page = parsePositiveInt(req.query.page, 1, 1, 50);
    const limit = parsePositiveInt(req.query.limit, 20, 1, 50);

    try {
      const index = await getDramaBoxCatalogIndex(lang);
      const lower = channelParam.toLowerCase();

      let channelMeta = {
        channel_id: channelParam,
        nama: 'Saluran Theater DramaBox',
        deskripsi: 'Feed tayangan theater pilihan dari DramaBox.',
      };
      let pool: NormalizedDramaBoxItem[] = [];

      if (lower === '32' || lower === 'wanita' || lower === 'female') {
        channelMeta = {
          channel_id: '32',
          nama: 'Theater Wanita',
          deskripsi: 'Serial short-drama unggulan segmen Wanita dari DramaBox.',
        };
        pool = index.dramas.filter((d) => d.kategori_utama.some((c) => c.id === 32));
      } else if (lower === '31' || lower === 'pria' || lower === 'male') {
        channelMeta = {
          channel_id: '31',
          nama: 'Theater Pria',
          deskripsi: 'Serial short-drama unggulan segmen Pria dari DramaBox.',
        };
        pool = index.dramas.filter((d) => d.kategori_utama.some((c) => c.id === 31));
      } else {
        const shelf =
          index.shelves.find(
            (s) =>
              String(s.shelf_id) === channelParam ||
              slugify(s.nama_rak) === lower ||
              (lower === 'popular' && s.shelf_id === 1267)
          ) || index.shelves[0];

        if (shelf) {
          channelMeta = {
            channel_id: String(shelf.shelf_id),
            nama: shelf.nama_rak,
            deskripsi: `Feed theater "${shelf.nama_rak}" (${shelf.nama_asli}) langsung dari beranda DramaBox.`,
          };
          const map = new Map<string, NormalizedDramaBoxItem>();
          for (const it of shelf.items) map.set(it.book_id, it);
          for (const d of index.dramas) {
            if (map.size >= 50) break;
            if (!map.has(d.book_id)) map.set(d.book_id, d);
          }
          pool = Array.from(map.values());
        } else {
          pool = index.dramas;
        }
      }

      const startIdx = (page - 1) * limit;
      const paged = pool.slice(startIdx, startIdx + limit);

      return res.json({
        sukses: true,
        layanan: 'dramabox-theater',
        sumber_data: 'dramabox-api-live',
        bahasa: lang,
        channel: channelMeta,
        halaman: page,
        per_halaman: limit,
        total_hasil: pool.length,
        total_halaman: Math.max(1, Math.ceil(pool.length / limit)),
        jumlah: paged.length,
        dramas: paged,
      });
    } catch (err) {
      return res.status(502).json({
        sukses: false,
        kesalahan: {
          kode: 'DRAMABOX_UPSTREAM_ERROR',
          pesan: err instanceof Error ? err.message : 'Gagal memuat feed theater DramaBox.',
        },
      });
    }
  });

  // 16. GET /api/v1/streaming/dramabox/trending - Get DramaBox's search landing feeds
  app.get('/api/v1/streaming/dramabox/trending', async (req: Request, res: Response) => {
    const lang = normalizeDramaBoxLang(req.query.lang);
    const limit = parsePositiveInt(req.query.limit, 16, 1, 40);

    try {
      const index = await getDramaBoxCatalogIndex(lang);

      // Combine curated hot shelves + highest viewCount & followCount dramas
      const hotShelf =
        index.shelves.find((s) => s.shelf_id === 1269 || s.shelf_id === 1267) || index.shelves[0];
      const map = new Map<string, NormalizedDramaBoxItem>();
      for (const item of hotShelf?.items || []) {
        map.set(item.book_id, item);
      }
      const sortedTrending = [...index.dramas].sort(
        (a, b) =>
          b.penayangan_angka + b.pengikut * 2 - (a.penayangan_angka + a.pengikut * 2)
      );
      for (const d of sortedTrending) {
        if (map.size >= limit) break;
        if (!map.has(d.book_id)) map.set(d.book_id, d);
      }
      const dramas = Array.from(map.values()).slice(0, limit);

      const tagCounts = new Map<string, number>();
      for (const d of index.dramas) {
        for (const t of d.tags) {
          tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
        }
      }
      const kataKunciPopuler = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([kata_kunci, jumlah_judul]) => ({
          kata_kunci,
          slug: slugify(kata_kunci),
          jumlah_judul,
        }));

      return res.json({
        sukses: true,
        layanan: 'dramabox-trending',
        sumber_data: 'dramabox-api-live',
        bahasa: lang,
        jumlah: dramas.length,
        kata_kunci_populer: kataKunciPopuler,
        rak_unggulan: index.shelves.map((s) => ({
          shelf_id: s.shelf_id,
          nama_rak: s.nama_rak,
          jumlah_item: s.items.length,
        })),
        pemeran_populer: index.performers.slice(0, 8),
        dramas,
      });
    } catch (err) {
      return res.status(502).json({
        sukses: false,
        kesalahan: {
          kode: 'DRAMABOX_UPSTREAM_ERROR',
          pesan: err instanceof Error ? err.message : 'Gagal memuat feed trending DramaBox.',
        },
      });
    }
  });
}
