"""Transliteration of DualGraph.ts, checked against the Python oracle.

Proves the ALGORITHM is right. Does not prove the TypeScript compiles --
node is installing for that.
"""
import sys, os
sys.path.insert(0, os.path.expanduser('~/rna-dual-graphs'))
from rnadual import analyse
from rnadual.core import parse_dotbracket


def stems_of(pairs, n):
    """Mirror of SecStruct.stems(): group consecutive base pairs into stacks."""
    stems = []
    for i in range(n):
        pi = pairs.get(i + 1, 0) - 1          # 0-based, -1 if unpaired
        if pi < 0 or i > pi:
            continue
        placed = False
        for stem in stems:
            for (a, b) in stem:
                if ((a == i - 1 and b == pi + 1) or (a == i + 1 and b == pi - 1)
                        or (b == i - 1 and a == pi + 1) or (b == i + 1 and a == pi - 1)):
                    stem.append((i, pi)); placed = True; break
            if placed:
                break
        if not placed:
            stems.append([(i, pi)])
    return stems


def helices_of(pairs, n):
    out = []
    for stem in stems_of(pairs, n):
        lo = [min(a, b) for a, b in stem]
        hi = [max(a, b) for a, b in stem]
        out.append(dict(fiveStart=min(lo), fiveEnd=max(lo),
                        threeStart=min(hi), threeEnd=max(hi)))
    out.sort(key=lambda h: h['fiveStart'])
    return out


def merge(raw):
    joins = []
    for i in range(len(raw) - 1):
        h1, h2 = raw[i], raw[i + 1]
        if h2['threeEnd'] > h1['threeStart']:
            joins.append(False); continue
        g5 = abs(h2['fiveStart'] - h1['fiveEnd']) - 1
        g3 = abs(h1['threeStart'] - h2['threeEnd']) - 1
        joins.append(abs(g5 + g3) < 2 or (abs(g5) == 1 and abs(g3) == 1))
    merged, i = [], 0
    while i < len(raw):
        j = i
        while j + 1 < len(raw) and joins[j]:
            j += 1
        merged.append(dict(fiveStart=raw[i]['fiveStart'], fiveEnd=raw[j]['fiveEnd'],
                           threeStart=raw[j]['threeStart'], threeEnd=raw[i]['threeEnd']))
        i = j + 1
    return [h for h in merged
            if h['fiveStart'] != h['fiveEnd'] or h['threeStart'] != h['threeEnd']]


def build(db):
    pairs = parse_dotbracket(db)
    n = len(db)
    raw = helices_of(pairs, n)
    hel = merge(raw)
    V = len(hel)
    adj = [[0] * V for _ in range(V)]
    blocks = []
    for k, h in enumerate(hel):
        blocks.append((h['fiveStart'], h['fiveEnd'], k))
        blocks.append((h['threeStart'], h['threeEnd'], k))
    blocks.sort()
    for k in range(len(blocks) - 1):
        a, b = blocks[k][2], blocks[k + 1][2]
        if a == b:
            adj[a][a] += 2
        else:
            adj[a][b] += 1; adj[b][a] += 1
    return dict(vertices=V, adjacency=adj, stems_before=len(raw),
                hairpins=sum(adj[k][k] // 2 for k in range(V)),
                edges=len(blocks) - 1)


CASES = [
    ('((((....))))', False), ('(((((((....)))))))', False),
    ('((((.((((....))))))))', False), ('((((..((((....))))))))', False),
    ('((((.((((....)))).))))', False), ('((((..((((....))))..))))', False),
    ('(.((((....)))).)', False),
    ('((((....))))....((((....))))....', False),
    ('((((....((((....))))....))))....', False),
    ('((((....[[[[....))))....]]]]....', True),
    ('((((....((((....[[[[....))))....((((....((((....))))....))))....]]]]....))))....', True),
    ('((((....((((....))))....((((....))))....))))....', False),
    ('(((...(((...)))...(((...)))...)))', False),
    ('((((....[[[[....))))....((((....]]]]....))))', True),
]

bad = 0
print('%-52s %-16s %-16s' % ('structure', 'port (V,E,hp)', 'oracle (V,E,hp)'))
for db, pk in CASES:
    mine = build(db)
    truth = analyse(db)
    m = (mine['vertices'], mine['edges'], mine['hairpins'])
    t = (truth.get('vertices', 0), truth.get('edges', 0), truth.get('hairpins', 0))
    adj_ok = mine['adjacency'] == truth.get('adjacency')
    ok = (m == t) and adj_ok
    bad += not ok
    print('%-52s %-16s %-16s %s' % (db[:50], m, t, 'ok' if ok else 'MISMATCH adj=%s' % adj_ok))
print()
print('%d/%d agree with the oracle (adjacency matrices compared element-wise)'
      % (len(CASES) - bad, len(CASES)))
sys.exit(1 if bad else 0)
