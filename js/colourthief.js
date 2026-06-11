const characterColorCache = {};

const COLOR_PALETTE = [
  "rgb(106, 90, 205)",
  "rgb(220, 20, 60)",
  "rgb(50, 205, 50)",
  "rgb(255, 165, 0)",
  "rgb(0, 191, 255)",
  "rgb(255, 20, 147)",
  "rgb(255, 215, 0)",
  "rgb(0, 255, 127)",
  "rgb(148, 0, 211)",
  "rgb(255, 69, 0)"
];

function getCharacterColor(index) {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

function normalizeImageSrc(src) {
  if (!src) return src;
  if (src.startsWith("http") || src.startsWith("data:")) return src;
  return src;
}

function quantizeColor(r, g, b, steps) {
  const q = 256 / steps;
  return [
    Math.floor(r / q) * q + Math.floor(q / 2),
    Math.floor(g / q) * q + Math.floor(q / 2),
    Math.floor(b / q) * q + Math.floor(q / 2)
  ];
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function boostBrightness(r, g, b, targetLightness) {
  const [h, s, l] = rgbToHsl(r, g, b);
  const [nr, ng, nb] = hslToRgb(h, s, targetLightness);
  return [nr, ng, nb];
}

async function getCharacterColorFromPortrait(character, fallbackIndex = 0) {
  if (characterColorCache[character.name]) {
    return characterColorCache[character.name];
  }

  const portrait = character.image || character.portrait;

  if (!portrait) {
    const fallback = getCharacterColor(fallbackIndex);
    characterColorCache[character.name] = fallback;
    return fallback;
  }

  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);
      const data = ctx.getImageData(0, 0, 50, 50).data;

      let r = 0, g = 0, b = 0, count = 0;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }

      if (!count) {
        const fallback = getCharacterColor(fallbackIndex);
        characterColorCache[character.name] = fallback;
        resolve(fallback);
        return;
      }

      const color = `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
      characterColorCache[character.name] = color;
      resolve(color);
    };

    img.onerror = () => {
      const fallback = getCharacterColor(fallbackIndex);
      characterColorCache[character.name] = fallback;
      resolve(fallback);
    };

    img.src = normalizeImageSrc(portrait);
  });
}

async function getCharacterPalette(character, fallbackIndex = 0) {
  const cacheKey = character.name + "_palette";

  if (characterColorCache[cacheKey]) {
    return characterColorCache[cacheKey];
  }

  const portrait = character.image || character.portrait;

  if (!portrait) {
    const fallback = getCharacterColor(fallbackIndex);
    const palette = [fallback, fallback, fallback];
    characterColorCache[cacheKey] = palette;
    return palette;
  }

  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);
      const data = ctx.getImageData(0, 0, 50, 50).data;

      const buckets = {};

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        const [qr, qg, qb] = quantizeColor(data[i], data[i + 1], data[i + 2], 8);
        const key = `${qr},${qg},${qb}`;
        if (!buckets[key]) {
          buckets[key] = { r: 0, g: 0, b: 0, count: 0 };
        }
        buckets[key].r += data[i];
        buckets[key].g += data[i + 1];
        buckets[key].b += data[i + 2];
        buckets[key].count++;
      }

      const sorted = Object.values(buckets)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      let palette;

      if (sorted.length === 0) {
        const fallback = getCharacterColor(fallbackIndex);
        palette = [fallback, fallback, fallback];
      } else {
        palette = sorted.map(b => {
          let r = Math.round(b.r / b.count);
          let g = Math.round(b.g / b.count);
          let bv = Math.round(b.b / b.count);
          [r, g, bv] = boostBrightness(r, g, bv, 0.7);
          return `rgb(${r}, ${g}, ${bv})`;
        });

        while (palette.length < 3) {
          palette.push(palette[palette.length - 1] || getCharacterColor(fallbackIndex));
        }
      }

      characterColorCache[cacheKey] = palette;
      resolve(palette);
    };

    img.onerror = () => {
      const fallback = getCharacterColor(fallbackIndex);
      const palette = [fallback, fallback, fallback];
      characterColorCache[cacheKey] = palette;
      resolve(palette);
    };

    img.src = normalizeImageSrc(portrait);
  });
}

class ColorThief {
  getPalette(img, colorCount) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const size = 50;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;

    const buckets = {};
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const [qr, qg, qb] = quantizeColor(data[i], data[i + 1], data[i + 2], 32);
      const key = `${qr},${qg},${qb}`;
      if (!buckets[key]) buckets[key] = { r: 0, g: 0, b: 0, count: 0 };
      buckets[key].r += data[i];
      buckets[key].g += data[i + 1];
      buckets[key].b += data[i + 2];
      buckets[key].count++;
    }

    const sorted = Object.values(buckets)
      .sort((a, b) => b.count - a.count)
      .slice(0, colorCount);

    if (!sorted.length) {
      return Array.from({ length: colorCount }, () => [0, 0, 0]);
    }

    return sorted.map(b => {
      let r = Math.round(b.r / b.count);
      let g = Math.round(b.g / b.count);
      let bv = Math.round(b.b / b.count);
      [r, g, bv] = boostBrightness(r, g, bv, 0.6);
      return [r, g, bv];
    });
  }
}
