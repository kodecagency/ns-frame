# Recorta Mona Sans variable a lo que usa el sitio: ejes (anchura 100–112 %, peso 400–700) y
# caracteres (ASCII + Latin-1 con los acentos del español + la tipografía que aparece en las páginas).
# El resultado sigue siendo un woff2 variable normal: funciona en todos los navegadores.
import glob, re, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

src, dst, dist = sys.argv[1], sys.argv[2], sys.argv[3]
f = TTFont(src)
f = instancer.instantiateVariableFont(f, {'wdth': (100, 112), 'wght': (400, 700)}, updateFontNames=False)

chars = set(chr(c) for c in range(0x20, 0x7F)) | set(chr(c) for c in range(0xA0, 0x100))
for p in glob.glob(dist + '/**/*.html', recursive=True):
    t = open(p, encoding='utf-8').read()
    t = re.sub(r'<(script|style)[\s\S]*?</\1>', '', t)
    chars |= set(re.sub(r'<[^>]+>', '', t))
chars = {c for c in chars if ord(c) >= 0x20}

opts = subset.Options()
opts.flavor = 'woff2'
opts.layout_features = ['*']      # kerning, ligaduras y alternativas: la calidad no cambia
opts.name_IDs = ['*']
opts.notdef_outline = False
opts.notdef_glyph = False
opts.hinting = False               # sin hinting (los navegadores modernos no lo usan en woff2 variables)
opts.desubroutinize = True
s = subset.Subsetter(opts)
s.populate(unicodes=[ord(c) for c in chars])
s.subset(f)
subset.save_font(f, dst, opts)
print('caracteres', len(chars), '· ejes', [(a.axisTag, a.minValue, a.maxValue) for a in f['fvar'].axes])
