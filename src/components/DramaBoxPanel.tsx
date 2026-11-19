import { Clapperboard, ExternalLink, Film, Flame, ListOrdered, Star, Tag, User } from 'lucide-react';
import { PageRoute } from '../types/app';

export interface DramaBoxDramaCard {
  book_id: string;
  judul: string;
  sampul: string | null;
  rating: number | null;
  jumlah_episode: number | null;
  penayangan: string | null;
  pengikut?: number;
  sinopsis: string | null;
  genre?: Array<{ id: number; nama: string; slug: string }>;
  tags?: string[];
  url_dramabox: string;
  peringkat?: number;
}

export interface DramaBoxPerformerCard {
  performer_id: string;
  nama: string;
  slug: string;
  avatar: string | null;
  jumlah_video: number;
}

export interface DramaBoxEpisodePreview {
  episode_nomor: number;
  judul_episode: string;
  chapter_id: string | null;
  gratis_pembuka?: boolean | null;
  url_dramabox: string;
}

export interface DramaBoxParsedPayload {
  layanan: string;
  bahasa: string;
  dramaDetail: (DramaBoxDramaCard & {
    bahasa_tersedia?: string[];
    pemeran?: DramaBoxPerformerCard[];
  }) | null;
  dramas: DramaBoxDramaCard[];
  performers: DramaBoxPerformerCard[];
  episodes: DramaBoxEpisodePreview[];
  totalEpisode?: number;
}

interface DramaBoxPanelProps {
  payload: DramaBoxParsedPayload;
  onNavigate: (route: PageRoute) => void;
}

export function DramaBoxPanel({ payload, onNavigate }: DramaBoxPanelProps) {
  const openDramaDetail = (bookId: string, lang: string) => {
    sessionStorage.setItem('efemma_pending_dramabox_book_id', bookId);
    sessionStorage.setItem('efemma_pending_dramabox_lang', lang || 'in');
    sessionStorage.setItem('efemma_pending_dramabox_target', 'dramabox-drama');
    onNavigate({ page: 'docs', endpointId: 'dramabox-drama' });
  };

  const openPerformer = (performerId: string, lang: string) => {
    sessionStorage.setItem('efemma_pending_dramabox_performer_id', performerId);
    sessionStorage.setItem('efemma_pending_dramabox_lang', lang || 'in');
    sessionStorage.setItem('efemma_pending_dramabox_target', 'dramabox-performer');
    onNavigate({ page: 'docs', endpointId: 'dramabox-performer' });
  };

  const hasDetail = Boolean(payload.dramaDetail);
  const hasDramas = payload.dramas.length > 0;
  const hasPerformers = payload.performers.length > 0;

  if (!hasDetail && !hasDramas && !hasPerformers) {
    return null;
  }

  return (
    <div className="mt-5 space-y-4">
      {/* DramaBox Single Drama Hero & Episodes List */}
      {payload.dramaDetail && (
        <div className="rounded-xl border border-rose-500/25 bg-gradient-to-br from-rose-500/[0.06] via-white to-amber-500/[0.04] p-4 dark:from-rose-500/10 dark:via-[#111111] dark:to-amber-500/[0.06] space-y-4">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {payload.dramaDetail.sampul ? (
              <img
                src={payload.dramaDetail.sampul}
                alt={payload.dramaDetail.judul}
                referrerPolicy="no-referrer"
                className="h-32 w-24 rounded-lg object-cover shrink-0 shadow-md"
              />
            ) : (
              <div className="flex h-32 w-24 items-center justify-center rounded-lg bg-rose-500/15 text-rose-500 shrink-0">
                <Clapperboard className="h-7 w-7" />
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                  <Film className="h-3 w-3" />
                  <span>DramaBox #{payload.dramaDetail.book_id}</span>
                </span>
                {payload.dramaDetail.rating !== null && (
                  <span className="inline-flex items-center gap-1 rounded border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                    <Star className="h-3 w-3 fill-current" />
                    <span>{payload.dramaDetail.rating}</span>
                  </span>
                )}
                {payload.totalEpisode ? (
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                    {payload.totalEpisode} Episode
                  </span>
                ) : null}
              </div>

              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white leading-snug">
                {payload.dramaDetail.judul}
              </h3>

              {payload.dramaDetail.sinopsis && (
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-3">
                  {payload.dramaDetail.sinopsis}
                </p>
              )}

              {payload.dramaDetail.tags && payload.dramaDetail.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {payload.dramaDetail.tags.slice(0, 6).map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                    >
                      <Tag className="h-2.5 w-2.5 text-rose-500" />
                      <span>{t}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-1 flex flex-wrap items-center gap-2">
                <a
                  href={payload.dramaDetail.url_dramabox}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 dark:bg-rose-500 dark:text-white dark:hover:bg-rose-400"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Buka di DramaBox</span>
                </a>
              </div>
            </div>
          </div>

          {payload.dramaDetail.pemeran && payload.dramaDetail.pemeran.length > 0 && (
            <div className="border-t border-slate-200/70 pt-3 dark:border-white/10 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <User className="h-3.5 w-3.5 text-rose-500" />
                <span>Pemeran Utama</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {payload.dramaDetail.pemeran.map((p) => (
                  <button
                    key={p.performer_id}
                    type="button"
                    onClick={() => openPerformer(p.performer_id, payload.bahasa)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 hover:border-rose-400 dark:border-white/10 dark:bg-[#0A0A0A] dark:text-slate-200 cursor-pointer"
                  >
                    {p.avatar && (
                      <img
                        src={p.avatar}
                        alt={p.nama}
                        referrerPolicy="no-referrer"
                        className="h-5 w-5 rounded-full object-cover shrink-0"
                      />
                    )}
                    <span className="font-medium">{p.nama}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {payload.episodes.length > 0 && (
            <div className="border-t border-slate-200/70 pt-3 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                <span className="inline-flex items-center gap-1.5">
                  <ListOrdered className="h-3.5 w-3.5 text-rose-500" />
                  <span>Daftar Episode ({payload.episodes.length})</span>
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8 max-h-44 overflow-y-auto pr-1">
                {payload.episodes.map((ep) => (
                  <a
                    key={ep.episode_nomor}
                    href={ep.url_dramabox}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-[11px] font-medium text-slate-700 hover:border-rose-400 hover:text-rose-600 dark:border-white/10 dark:bg-[#0A0A0A] dark:text-slate-200 dark:hover:border-rose-400"
                  >
                    Ep {ep.episode_nomor}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performers Preview Grid */}
      {hasPerformers && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
            <User className="h-4 w-4 text-rose-500" />
            <span>Pemeran DramaBox ({payload.performers.length})</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {payload.performers.slice(0, 8).map((perf) => (
              <div
                key={perf.performer_id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#111111]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {perf.avatar ? (
                    <img
                      src={perf.avatar}
                      alt={perf.nama}
                      referrerPolicy="no-referrer"
                      className="h-10 w-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/15 text-rose-500 shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                      {perf.nama}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      ID {perf.performer_id} · {perf.jumlah_video} video
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openPerformer(perf.performer_id, payload.bahasa)}
                  className="shrink-0 rounded-lg border border-rose-500/35 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-500/20 dark:text-rose-300 cursor-pointer"
                >
                  Profil
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drama Cards List */}
      {hasDramas && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
            <Flame className="h-4 w-4 text-rose-500" />
            <span>
              {payload.layanan === 'dramabox-drama'
                ? 'Rekomendasi Drama Terkait'
                : 'Daftar Short-Drama DramaBox (Klik Detail & Episode)'}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {payload.dramas.slice(0, 12).map((dr) => (
              <div
                key={dr.book_id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#111111] min-w-0"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {dr.sampul ? (
                    <img
                      src={dr.sampul}
                      alt={dr.judul}
                      referrerPolicy="no-referrer"
                      className="h-16 w-12 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-16 w-12 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
                      <Film className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                      {dr.peringkat ? `#${dr.peringkat} · ` : ''}
                      {dr.judul}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      {dr.rating !== null && <span>★ {dr.rating}</span>}
                      {dr.jumlah_episode ? <span>· {dr.jumlah_episode} Ep</span> : null}
                      {dr.penayangan ? <span>· {dr.penayangan}</span> : null}
                    </div>
                    {dr.sinopsis && (
                      <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400 line-clamp-2">
                        {dr.sinopsis}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openDramaDetail(dr.book_id, payload.bahasa)}
                  className="shrink-0 rounded-lg bg-rose-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-500 dark:bg-rose-500 dark:hover:bg-rose-400 cursor-pointer"
                >
                  Detail
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
