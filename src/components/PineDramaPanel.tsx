import { useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Film,
  Loader2,
  Play,
  Star,
} from 'lucide-react';
import { PageRoute } from '../types/app';

export interface PineDramaCardPreview {
  slug: string;
  judul: string;
  sampul?: string | null;
  rating?: string | null;
  jumlah_episode?: number | null;
  sinopsis?: string | null;
}

export interface PineDramaEpisodeItem {
  episode_id: number;
  dapat_diputar: boolean;
  judul_episode?: string | null;
  stream_url?: string | null;
  relative_stream_url?: string | null;
  source_cdn_url?: string | null;
  status_stream?: string;
  pesan_server?: string;
}

export interface PineDramaParsedPayload {
  layanan: string;
  bahasa: string;
  dramaDetail?: PineDramaCardPreview | null;
  dramas: PineDramaCardPreview[];
  totalEpisodeSerial?: number;
  totalPlayableWeb?: number;
  semuaEpisode: Array<{ episode_id: number; dapat_diputar: boolean }>;
  episodes: PineDramaEpisodeItem[];
}

interface PineDramaPanelProps {
  payload: PineDramaParsedPayload;
  activeEpisodeId: number | null;
  loadingEpisodeId: number | null;
  onSelectEpisode: (episodeId: number) => void;
  onNavigate: (route: PageRoute) => void;
}

export function PineDramaPanel({
  payload,
  activeEpisodeId,
  loadingEpisodeId,
  onSelectEpisode,
  onNavigate,
}: PineDramaPanelProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const openDramaEndpoint = (
    targetId: 'pinedrama-get-episodes' | 'pinedrama-detail',
    slug: string,
    lang: string
  ) => {
    sessionStorage.setItem('efemma_pending_pinedrama_slug', slug);
    sessionStorage.setItem('efemma_pending_pinedrama_lang', lang || 'en');
    sessionStorage.setItem('efemma_pending_pinedrama_target', targetId);
    onNavigate({ page: 'docs', endpointId: targetId });
  };

  const handleCopyVideoLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

  const activeEp =
    payload.episodes.find((ep) => ep.episode_id === activeEpisodeId) ??
    payload.episodes.find((ep) => Boolean(ep.relative_stream_url || ep.stream_url)) ??
    payload.episodes[0] ??
    null;

  const activeVideoSrc = activeEp?.relative_stream_url || activeEp?.stream_url || null;
  const activeShareUrl = activeEp?.stream_url || activeEp?.relative_stream_url || null;

  const allEpNumbers =
    payload.semuaEpisode.length > 0
      ? payload.semuaEpisode
      : payload.episodes.map((ep) => ({
          episode_id: ep.episode_id,
          dapat_diputar: ep.dapat_diputar,
        }));

  const currentIdxInAll = activeEp
    ? allEpNumbers.findIndex((e) => e.episode_id === activeEp.episode_id)
    : -1;
  const prevEpNum =
    currentIdxInAll > 0 ? allEpNumbers[currentIdxInAll - 1]?.episode_id ?? null : null;
  const nextEpNum =
    currentIdxInAll >= 0 && currentIdxInAll < allEpNumbers.length - 1
      ? allEpNumbers[currentIdxInAll + 1]?.episode_id ?? null
      : null;

  return (
    <div className="mt-5 space-y-5">
      {/* Video Player Section (for get-episodes) */}
      {payload.layanan === 'pinedrama-get-episodes' && payload.dramaDetail && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111111] space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {payload.dramaDetail.sampul ? (
                <img
                  src={payload.dramaDetail.sampul}
                  alt={payload.dramaDetail.judul}
                  referrerPolicy="no-referrer"
                  className="h-14 w-10 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-white/10"
                />
              ) : (
                <div className="flex h-14 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 shrink-0">
                  <Film className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
                    {payload.dramaDetail.judul}
                  </h4>
                  {payload.dramaDetail.rating && (
                    <span className="inline-flex items-center gap-1 rounded border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      {payload.dramaDetail.rating}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  slug: {payload.dramaDetail.slug} / {payload.totalPlayableWeb ?? payload.episodes.length} playable dari {payload.totalEpisodeSerial ?? '-'} episode
                </p>
              </div>
            </div>

            {activeEp && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!prevEpNum || loadingEpisodeId !== null}
                  onClick={() => prevEpNum && onSelectEpisode(prevEpNum)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </button>
                <span className="rounded-lg border border-sky-500/35 bg-sky-500/10 px-2.5 py-1.5 font-mono text-xs font-semibold text-sky-700 dark:text-sky-300 tabular-nums">
                  Ep {activeEp.episode_id}
                </span>
                <button
                  type="button"
                  disabled={!nextEpNum || loadingEpisodeId !== null}
                  onClick={() => nextEpNum && onSelectEpisode(nextEpNum)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {activeVideoSrc && activeShareUrl && activeEp ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-black dark:border-white/10">
                <video
                  key={`${payload.dramaDetail.slug}-${activeEp.episode_id}-${activeVideoSrc}`}
                  src={activeVideoSrc}
                  poster={payload.dramaDetail.sampul || undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="mx-auto max-h-[480px] w-full bg-black"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-[#0A0A0A]">
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Link Video Ep {activeEp.episode_id}:{' '}
                  </span>
                  <a
                    href={activeVideoSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-sky-600 hover:underline dark:text-sky-400 break-all"
                  >
                    <span className="truncate max-w-[360px] inline-block align-bottom">
                      {activeShareUrl}
                    </span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyVideoLink(activeShareUrl)}
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Salin Link</span>
                      </>
                    )}
                  </button>
                  <a
                    href={activeVideoSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-500 dark:bg-sky-500 dark:text-slate-950"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Buka Video</span>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
              {activeEp
                ? `Episode ${activeEp.episode_id} tidak tersedia untuk diputar langsung di web PineDrama (${activeEp.pesan_server || 'terkunci'}). Pilih episode lain di bawah.`
                : 'Belum ada URL video yang termuat. Pilih nomor episode untuk memuat link video.'}
            </div>
          )}

          {allEpNumbers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Pilih Episode untuk Ditonton</span>
                {loadingEpisodeId !== null && (
                  <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Memuat Episode {loadingEpisodeId}...</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {allEpNumbers.map((epMeta) => {
                  const isSelected = activeEp?.episode_id === epMeta.episode_id;
                  const loadedEp = payload.episodes.find(
                    (e) => e.episode_id === epMeta.episode_id
                  );
                  const isReady = Boolean(loadedEp?.stream_url);
                  const isLoadingThis = loadingEpisodeId === epMeta.episode_id;
                  return (
                    <button
                      key={epMeta.episode_id}
                      type="button"
                      disabled={loadingEpisodeId !== null}
                      onClick={() => onSelectEpisode(epMeta.episode_id)}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-[11px] transition-colors cursor-pointer disabled:opacity-60 ${
                        isSelected
                          ? 'border-sky-500 bg-sky-600 font-semibold text-white dark:bg-sky-500 dark:text-slate-950'
                          : isReady
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300'
                          : epMeta.dapat_diputar
                          ? 'border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-500/50 hover:text-sky-600 dark:border-white/10 dark:bg-[#0A0A0A] dark:text-slate-300 dark:hover:text-white'
                          : 'border-slate-200/70 bg-slate-100/60 text-slate-400 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-600'
                      }`}
                    >
                      {isLoadingThis && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                      <span>Ep {epMeta.episode_id}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail CTA card (for pinedrama-detail) */}
      {payload.layanan === 'pinedrama-detail' && payload.dramaDetail && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111111]">
          <div className="flex items-center gap-3 min-w-0">
            {payload.dramaDetail.sampul ? (
              <img
                src={payload.dramaDetail.sampul}
                alt={payload.dramaDetail.judul}
                referrerPolicy="no-referrer"
                className="h-14 w-10 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-white/10"
              />
            ) : (
              <div className="flex h-14 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 shrink-0">
                <Film className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {payload.dramaDetail.judul}
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {payload.dramaDetail.slug}
                {payload.dramaDetail.jumlah_episode
                  ? ` · ${payload.dramaDetail.jumlah_episode} Ep`
                  : ''}
                {payload.dramaDetail.rating ? ` · ★ ${payload.dramaDetail.rating}` : ''}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              openDramaEndpoint(
                'pinedrama-get-episodes',
                payload.dramaDetail!.slug,
                payload.bahasa
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-500 dark:bg-sky-500 dark:text-slate-950 cursor-pointer shrink-0"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Tonton Drama (Get Episodes)</span>
          </button>
        </div>
      )}

      {/* Drama Cards List (for for-you, trending, search, or detail recommendations) */}
      {payload.dramas.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
            <Film className="h-4 w-4 text-sky-500" />
            <span>
              {payload.layanan === 'pinedrama-detail'
                ? 'Rekomendasi Drama Terkait'
                : 'Daftar Drama PineDrama (Aksi Cepat Tonton / Detail)'}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {payload.dramas.slice(0, 12).map((dr) => (
              <div
                key={dr.slug}
                className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#111111] min-w-0 overflow-hidden"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {dr.sampul ? (
                    <img
                      src={dr.sampul}
                      alt={dr.judul}
                      referrerPolicy="no-referrer"
                      className="h-12 w-9 rounded-md object-cover shrink-0 border border-slate-200 dark:border-white/10"
                    />
                  ) : (
                    <div className="flex h-12 w-9 items-center justify-center rounded-md bg-sky-500/10 text-sky-500 shrink-0">
                      <Film className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                      {dr.judul}
                    </div>
                    <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {dr.rating ? `★ ${dr.rating}` : 'PineDrama'}
                      {dr.jumlah_episode ? ` · ${dr.jumlah_episode} Ep` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      openDramaEndpoint('pinedrama-get-episodes', dr.slug, payload.bahasa)
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-500 dark:bg-sky-500 dark:text-slate-950 cursor-pointer"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Tonton</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openDramaEndpoint('pinedrama-detail', dr.slug, payload.bahasa)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer"
                  >
                    Detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
