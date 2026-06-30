import type { Fish } from '../types';

const displayImageOverrides: Record<string, string> = {
  sp_0019: '/species-display/sp_0019_埃及神仙_display_white.png?v=displaycutout_20260601',
  sp_0175: '/species-display/sp_0175_血钻神仙_display_white.png?v=displaycutout_20260601',
  sp_0176: '/species-display/sp_0176_黑白大理石神仙_display_white.png?v=displaycutout_20260601',
  sp_0177: '/species-display/sp_0177_红眼蓝钻神仙_display_white.png?v=displaycutout_20260601',
  sp_0178: '/species-display/sp_0178_熊猫神仙_display_white.png?v=displaycutout_20260601',
  sp_0240: '/species-display/sp_0240_白金神仙_长鳍_display_white.png?v=displaycutout_20260601',
  sp_0241: '/species-display/sp_0241_大理石神仙_球形_display_white.png?v=displaycutout_20260601',
  sp_0247: '/species-display/sp_0247_蓝钻神仙_球形_display_white.png?v=displaycutout_20260601',
  sp_0272: '/species-display/sp_0272_长鳍神仙_黑_display_white.png?v=displaycutout_20260601',
  sp_0388: '/species-display/sp_0388_血钻神仙_改良_display_white.png?v=displaycutout_20260601',
  sp_0446: '/species-display/sp_0446_神仙鱼_display_white.png?v=displaycutout_20260601',
};

const visibilityOverrideIds = new Set([
  'sp_0117',
  'sp_0132',
  'sp_0146',
  'sp_0148',
  'sp_0156',
  'sp_0160',
  'sp_0169',
  'sp_0171',
  'sp_0174',
  'sp_0207',
  'sp_0214',
  'sp_0217',
  'sp_0220',
  'sp_0223',
  'sp_0224',
  'sp_0226',
  'sp_0229',
  'sp_0231',
  'sp_0232',
  'sp_0233',
  'sp_0235',
  'sp_0236',
  'sp_0240',
  'sp_0242',
  'sp_0246',
  'sp_0252',
  'sp_0254',
  'sp_0256',
  'sp_0263',
  'sp_0264',
  'sp_0270',
  'sp_0271',
  'sp_0281',
  'sp_0284',
  'sp_0288',
  'sp_0294',
  'sp_0338',
  'sp_0341',
  'sp_0358',
  'sp_0360',
  'sp_0375',
  'sp_0377',
  'sp_0378',
  'sp_0379',
  'sp_0380',
  'sp_0381',
  'sp_0382',
  'sp_0383',
  'sp_0384',
  'sp_0385',
  'sp_0389',
  'sp_0393',
  'sp_0399',
  'sp_0409',
  'sp_0414',
  'sp_0415',
  'sp_0418',
  'sp_0421',
  'sp_0452',
  'sp_0458',
  'sp_0459',
]);

const paleBodyPattern = /白金|白子|白化|雪白|白玉|白云|白裙|玻璃|透明|银|水母|海月|蛋黄水母|Platinum|Albino|White|Glass|Silver|Aurelia|Chrysaora|Cotylorhiza/i;

export const getSpeciesDisplayImage = (fish: Pick<Fish, 'id' | 'image'>) => (
  displayImageOverrides[fish.id]
  || (visibilityOverrideIds.has(fish.id) ? `/species-image-overrides/${fish.id}.png?v=visibility_20260611` : fish.image)
);

export const hasLowContrastSpeciesImage = (fish: Pick<Fish, 'name' | 'scientificName' | 'image'>) => (
  paleBodyPattern.test(`${fish.name} ${fish.scientificName} ${fish.image}`)
);

export const getSpeciesImageSurfaceClass = (fish: Pick<Fish, 'name' | 'scientificName' | 'image'>) => (
  hasLowContrastSpeciesImage(fish)
    ? 'bg-emerald-950/[0.03]'
    : 'bg-transparent'
);

export const getSpeciesImageClass = (fish: Pick<Fish, 'name' | 'scientificName' | 'image'>) => (
  hasLowContrastSpeciesImage(fish)
    ? 'drop-shadow-[0_12px_18px_rgba(37,79,92,0.30)] contrast-[1.12] saturate-[1.08]'
    : 'drop-shadow-[0_8px_12px_rgba(27,77,62,0.12)]'
);

