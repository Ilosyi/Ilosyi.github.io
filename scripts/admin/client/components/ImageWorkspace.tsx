import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CoverImageSummary, HeaderImageSummary } from '../api.ts';
import { adminApi } from '../api.ts';

type ImageList = {
  covers: CoverImageSummary[];
  headers: HeaderImageSummary[];
};

type DisplayImage = {
  name: string;
  src: string;
  details: string[];
};

type ImageDisplayGroups = {
  headers: DisplayImage[];
  covers: DisplayImage[];
};

const FIXED_HEADER_NAMES = ['site_header_1920.webp', 'site_header_800.webp', 'weekly_header.webp'] as const;
type UploadKind = 'site' | 'weekly' | 'cover';

export function createImageDisplayGroups(images: ImageList, refreshToken: string): ImageDisplayGroups {
  const headersByName = new Map(images.headers.map((image) => [image.name, image]));

  return {
    headers: FIXED_HEADER_NAMES.map((name) => {
      const image = headersByName.get(name);
      const url = image?.url ?? `/img/${name}`;

      return {
        name,
        src: withCacheToken(url, refreshToken),
        details: image === undefined ? [url, '接口未返回此文件，按固定路径预览'] : [url],
      };
    }),
    covers: images.covers.map((image) => ({
      name: image.name,
      src: image.url,
      details: [image.url, image.filePath],
    })),
  };
}

export function withCacheToken(url: string, refreshToken: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(refreshToken)}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败，请稍后重试';
}

export function getUploadSuccessMessage(kind: UploadKind, coverName?: string): string {
  if (kind === 'site') return '站点头图已更新';
  if (kind === 'weekly') return '周刊头图已更新';
  return coverName === undefined ? '文章封面已新增' : `文章封面已新增：${coverName}`;
}

export function ImageWorkspace() {
  const [images, setImages] = useState<ImageList>({ covers: [], headers: [] });
  const [refreshToken, setRefreshToken] = useState(() => String(Date.now()));
  const [statusMessage, setStatusMessage] = useState('正在加载图片...');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingKind, setUploadingKind] = useState<UploadKind | null>(null);
  const [hasLoadedImages, setHasLoadedImages] = useState(false);
  const [failedImageNames, setFailedImageNames] = useState<Set<string>>(() => new Set());
  const requestSequence = useRef(0);

  const displayGroups = useMemo(() => createImageDisplayGroups(images, refreshToken), [images, refreshToken]);

  const refreshImages = useCallback(async (options: { bustCache?: boolean } = {}) => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('正在加载图片...');

    try {
      const data = await adminApi.listImages();
      if (requestId !== requestSequence.current) return;
      setImages(data);
      setFailedImageNames(new Set());
      setHasLoadedImages(true);
      if (options.bustCache === true) {
        setRefreshToken(String(Date.now()));
      }
      setStatusMessage(`图片已加载：固定头图 ${FIXED_HEADER_NAMES.length} 张，文章封面 ${data.covers.length} 张。`);
    } catch (error) {
      if (requestId !== requestSequence.current) return;
      setErrorMessage(getErrorMessage(error));
      setStatusMessage('');
    } finally {
      if (requestId === requestSequence.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshImages();
  }, [refreshImages]);

  async function handleUpload(kind: UploadKind, file?: File) {
    if (file === undefined) return;

    requestSequence.current += 1;
    setIsLoading(false);
    setUploadingKind(kind);
    setErrorMessage('');
    setStatusMessage('正在上传图片...');

    try {
      let uploadedCoverName: string | undefined;
      if (kind === 'site') {
        await adminApi.uploadSiteHeader(file);
      } else if (kind === 'weekly') {
        await adminApi.uploadWeeklyHeader(file);
      } else {
        const response = await adminApi.uploadCover(file);
        uploadedCoverName = response.image.name;
      }

      await refreshImages({ bustCache: true });
      setStatusMessage(getUploadSuccessMessage(kind, uploadedCoverName));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setStatusMessage('');
    } finally {
      setUploadingKind(null);
    }
  }

  function markImageFailed(name: string) {
    setFailedImageNames((current) => {
      if (current.has(name)) return current;
      const next = new Set(current);
      next.add(name);
      return next;
    });
  }

  function renderUploadInput(kind: UploadKind, label: string, description: string) {
    const isUploading = uploadingKind === kind;

    return (
      <label className="upload-card">
        <span className="upload-card__label">{label}</span>
        <span className="upload-card__description">{isUploading ? '上传中...' : description}</span>
        <input
          accept="image/*"
          disabled={uploadingKind !== null}
          onChange={(event) => {
            const input = event.currentTarget;
            void handleUpload(kind, input.files?.[0]).finally(() => {
              input.value = '';
            });
          }}
          type="file"
        />
      </label>
    );
  }

  return (
    <section className="workspace-panel image-workspace" aria-labelledby="image-workspace-title">
      <div className="workspace-panel__header image-workspace__header">
        <div>
          <p className="workspace-panel__eyebrow">图片工作区</p>
          <h1 id="image-workspace-title">图片资源</h1>
        </div>
        <button
          className="admin-button admin-button--primary"
          type="button"
          onClick={() => void refreshImages({ bustCache: true })}
          disabled={isLoading || uploadingKind !== null}
        >
          {isLoading ? '加载中' : '刷新'}
        </button>
      </div>
      <div className="image-workspace__status" aria-live="polite">
        {errorMessage !== '' && <p className="image-workspace__message image-workspace__message--error">{errorMessage}</p>}
        {statusMessage !== '' && <p className="image-workspace__message image-workspace__message--success">{statusMessage}</p>}
      </div>
      <section className="upload-row" aria-label="图片上传">
        {renderUploadInput('site', '上传站点头图', '生成 1920 和 800 两个固定头图')}
        {renderUploadInput('weekly', '上传周刊头图', '更新 weekly_header.webp')}
        {renderUploadInput('cover', '新增文章封面', '保存为下一个数字 .webp')}
      </section>
      <div className="image-workspace__body">
        <section className="config-panel image-workspace__panel" aria-labelledby="fixed-header-title">
          <div className="config-panel__header">
            <h2 id="fixed-header-title">固定头图</h2>
            <p>站点大头图、移动端头图和周刊头图。刷新后会更新预览缓存参数。</p>
          </div>
          <div className="image-grid">
            {displayGroups.headers.map((image) => (
              <figure className="image-card" key={image.name}>
                <div className="image-card__preview">
                  {failedImageNames.has(image.name) ? (
                    <span className="image-card__fallback">图片无法加载</span>
                  ) : (
                    <img src={image.src} alt={image.name} loading="lazy" onError={() => markImageFailed(image.name)} />
                  )}
                </div>
                <figcaption className="image-card__caption">
                  <strong>{image.name}</strong>
                  {image.details.map((detail) => (
                    <span key={detail}>{detail}</span>
                  ))}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
        <section className="config-panel image-workspace__panel" aria-labelledby="cover-pool-title">
          <div className="config-panel__header">
            <h2 id="cover-pool-title">文章封面池</h2>
            <p>新增封面由服务端保存为下一个数字 .webp 文件名；当前封面按服务端自然顺序显示。</p>
          </div>
          <div className="image-grid">
            {displayGroups.covers.length > 0
              ? displayGroups.covers.map((image) => (
                  <figure className="image-card" key={image.src}>
                    <div className="image-card__preview">
                      {failedImageNames.has(image.name) ? (
                        <span className="image-card__fallback">图片无法加载</span>
                      ) : (
                        <img src={image.src} alt={image.name} loading="lazy" onError={() => markImageFailed(image.name)} />
                      )}
                    </div>
                    <figcaption className="image-card__caption">
                      <strong>{image.name}</strong>
                      {image.details.map((detail) => (
                        <span key={detail}>{detail}</span>
                      ))}
                    </figcaption>
                  </figure>
                ))
              : errorMessage === '' && (
                  <p className="image-workspace__empty">
                    {isLoading || !hasLoadedImages ? '正在读取文章封面池...' : '暂无文章封面。'}
                  </p>
                )}
          </div>
        </section>
      </div>
    </section>
  );
}
