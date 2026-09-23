import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

const manifestModuleUrl = new URL('../../src/data/artwork.ts', import.meta.url);
const componentModuleUrl = new URL('../../src/components/BackgroundArtwork.astro', import.meta.url);
const artworkDirectoryUrl = new URL('../../src/assets/artwork/', import.meta.url);

type ImportedImage = string | { src: string; width: number; height: number };
type ArtworkManifest = Record<
  'home' | 'institutional' | 'diagnostic',
  { desktop: ImportedImage; mobile: ImportedImage }
>;
type RenderableAstroComponent = Parameters<AstroContainer['renderToString']>[0];

const expectedArtwork = {
  home: {
    desktop: {
      file: 'home-desktop.png',
      width: 1672,
      height: 941,
      sha256: '7a2c4d37017753ee3b604159d3a591abc8bc60db9e2bb1d38e2e3f47d17028e0',
    },
    mobile: {
      file: 'home-mobile.png',
      width: 1122,
      height: 1402,
      sha256: '17b8a8d7b363a18bcbb34414686e32be3d4b1a34aa76c702afd7f1dac15c1277',
    },
  },
  institutional: {
    desktop: {
      file: 'institutional-desktop.png',
      width: 1672,
      height: 941,
      sha256: 'c4ebb87f1865ae90c6c36e0c868d8a12a5187ace6de6898a719e05911ae3e32c',
    },
    mobile: {
      file: 'institutional-mobile.png',
      width: 1122,
      height: 1402,
      sha256: '14ae0be9fe3ce85de63b2c99fae2a3282486d79f5210d80bc51bcb419aae3d21',
    },
  },
  diagnostic: {
    desktop: {
      file: 'diagnostic-desktop.png',
      width: 1672,
      height: 941,
      sha256: 'c7c4587d313c089f5a98f751bbd7f024252b090b5505c3587f5d68605d60cd36',
    },
    mobile: {
      file: 'diagnostic-mobile.png',
      width: 1003,
      height: 1568,
      sha256: '7297e376ac8f9f38b9d1c10c5ca2ddeb2712640f7613ca608bc54a702f627b6f',
    },
  },
} as const;

async function loadManifest(): Promise<ArtworkManifest> {
  expect(
    existsSync(fileURLToPath(manifestModuleUrl)),
    'the typed artwork manifest must exist',
  ).toBe(true);

  const module = (await import(manifestModuleUrl.href)) as { artwork: ArtworkManifest };
  return module.artwork;
}

async function loadComponent(): Promise<RenderableAstroComponent> {
  expect(
    existsSync(fileURLToPath(componentModuleUrl)),
    'the reusable background artwork component must exist',
  ).toBe(true);

  const module = (await import(componentModuleUrl.href)) as {
    default: RenderableAstroComponent;
  };
  return module.default;
}

function importedSource(image: ImportedImage): string {
  return typeof image === 'string' ? image : image.src;
}

function renderedTags(html: string, tagName: string): string[] {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'g'))].map(([tag]) => tag);
}

function renderedAttribute(tag: string, attribute: string): string | undefined {
  return new RegExp(`\\b${attribute}="([^"]*)"`).exec(tag)?.[1];
}

describe('responsive artwork contract', () => {
  it('preserves each approved binary and maps the correct source pair', async () => {
    const manifest = await loadManifest();

    expect(Object.keys(manifest)).toEqual(Object.keys(expectedArtwork));

    for (const [key, pair] of Object.entries(expectedArtwork) as Array<
      [keyof typeof expectedArtwork, (typeof expectedArtwork)[keyof typeof expectedArtwork]]
    >) {
      for (const viewport of ['desktop', 'mobile'] as const) {
        const expected = pair[viewport];
        const filePath = fileURLToPath(new URL(expected.file, artworkDirectoryUrl));
        expect(existsSync(filePath), `${expected.file} must be present`).toBe(true);

        const contents = readFileSync(filePath);
        expect(contents.toString('ascii', 1, 4)).toBe('PNG');
        expect(contents.readUInt32BE(16)).toBe(expected.width);
        expect(contents.readUInt32BE(20)).toBe(expected.height);
        expect(createHash('sha256').update(contents).digest('hex')).toBe(expected.sha256);
        expect(importedSource(manifest[key][viewport])).toContain(expected.file);
      }
    }
  });

  it('renders responsive optimized sources with decorative lazy defaults', async () => {
    const BackgroundArtwork = await loadComponent();
    const container = await AstroContainer.create();
    const html = await container.renderToString(BackgroundArtwork, {
      props: {
        artwork: 'home',
        objectPosition: 'center 30%',
        overlay: 'dark',
        class: 'campaign-art',
      },
    });

    const [wrapper] = renderedTags(html, 'div');
    const [picture] = renderedTags(html, 'picture');
    const [image] = renderedTags(html, 'img');
    const sources = renderedTags(html, 'source');

    expect(renderedAttribute(wrapper, 'class')).toContain('campaign-art');
    expect(renderedAttribute(wrapper, 'data-overlay')).toBe('dark');
    expect(renderedAttribute(picture, 'aria-hidden')).toBe('true');
    expect(renderedAttribute(image, 'alt')).toBe('');
    expect(renderedAttribute(image, 'aria-hidden')).toBe('true');
    expect(renderedAttribute(image, 'loading')).toBe('lazy');
    expect(renderedAttribute(image, 'decoding')).toBe('async');
    expect(renderedAttribute(image, 'fetchpriority')).toBe('auto');
    expect(renderedAttribute(image, 'style')).toContain('object-position: center 30%');
    const optimizedSources = sources.filter((source) =>
      ['image/avif', 'image/webp'].includes(renderedAttribute(source, 'type') ?? ''),
    );
    expect(
      optimizedSources.map((source) => [
        renderedAttribute(source, 'media') ?? 'desktop',
        renderedAttribute(source, 'type'),
      ]),
    ).toEqual([
      ['(max-width: 767px)', 'image/avif'],
      ['(max-width: 767px)', 'image/webp'],
      ['(min-width: 768px)', 'image/avif'],
      ['(min-width: 768px)', 'image/webp'],
    ]);
  });

  it('keeps the approved mobile PNG as the fallback for mobile browsers', async () => {
    const BackgroundArtwork = await loadComponent();
    const container = await AstroContainer.create();
    const html = await container.renderToString(BackgroundArtwork, {
      props: { artwork: 'institutional' },
    });

    const mobileFallback = renderedTags(html, 'source').find(
      (source) =>
        renderedAttribute(source, 'media') === '(max-width: 767px)' &&
        renderedAttribute(source, 'type') === 'image/png',
    );

    expect(mobileFallback, 'the mobile art direction must include its own PNG fallback').toBeDefined();
    expect(renderedAttribute(mobileFallback ?? '', 'srcset')).toBeTruthy();
  });

  it('raises hero artwork to eager high-priority loading', async () => {
    const BackgroundArtwork = await loadComponent();
    const container = await AstroContainer.create();
    const html = await container.renderToString(BackgroundArtwork, {
      props: {
        artwork: 'diagnostic',
        priority: 'eager',
        overlay: 'none',
      },
    });

    const [wrapper] = renderedTags(html, 'div');
    const [image] = renderedTags(html, 'img');

    expect(renderedAttribute(wrapper, 'data-overlay')).toBe('none');
    expect(renderedAttribute(image, 'loading')).toBe('eager');
    expect(renderedAttribute(image, 'fetchpriority')).toBe('high');
  });
});
