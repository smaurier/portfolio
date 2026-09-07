"""
Le TEPOZTOPILLI modelise dans Blender (pilote sans interface), 07/09/2026.
La lance de guerre mexica (Codex Mendoza ; Hassig, Aztec Warfare) : une
longue hampe, une large tete plate en feuille dont les deux bords sont
garnis de lames d'obsidienne enchassees, une virole et des ligatures sous
la tete, une touffe de plumes. Sur le site c'est « la lance de feu » du
soleil (page Services, docs/da/est-sources.md) : les matieres de feu sont
posees dans three (shader), ici les materiaux ne servent qu'a nommer les
parties : Wood, Head, Obsidian, Binding, Feather.

Axe de la lance = +Z (la pointe en haut), la face plate de la tete dans le
plan XZ (normale Y). L'exporteur glTF convertit en Y-haut : sur le site,
l'axe est +Y et la face plate a sa normale en Z.

Usage :  blender --background --python tepoztopilli.py -- <sortie.glb> <dossier_rendus>
"""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT_GLB = args[0] if args else os.path.join(os.path.dirname(os.path.abspath(__file__)), "tepoztopilli.glb")
OUT_DIR = args[1] if len(args) > 1 else os.path.dirname(os.path.abspath(__file__))
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = bpy.data.collections.new("Tepoztopilli"); scene.collection.children.link(col)

def material(name, color, rough=0.6, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    m.diffuse_color = (*color, 1); m.roughness = rough; m.metallic = metal
    return m

MAT_WOOD = material("Wood", (0.42, 0.2, 0.07), rough=0.7)
MAT_HEAD = material("Head", (0.5, 0.26, 0.09), rough=0.6)
MAT_OBSIDIAN = material("Obsidian", (0.02, 0.015, 0.025), rough=0.12, metal=0.1)
MAT_BINDING = material("Binding", (0.22, 0.09, 0.04), rough=0.9)
MAT_FEATHER = material("Feather", (0.55, 0.07, 0.05), rough=0.8)
MATS = [MAT_WOOD, MAT_HEAD, MAT_OBSIDIAN, MAT_BINDING, MAT_FEATHER]
parts = []

def finish(name, bm, mat, smooth=False, loc=(0, 0, 0), rot=None):
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    for m in MATS: ob.data.materials.append(m)
    idx = MATS.index(mat)
    for p in ob.data.polygons: p.material_index = idx; p.use_smooth = smooth
    ob.location = loc
    if rot: ob.rotation_euler = rot
    col.objects.link(ob); parts.append(ob); return ob

# ---------------------------------------------------------------- dimensions
SHAFT_Z0, SHAFT_Z1 = -1.35, 1.22      # la hampe, 2,57 u
R_SHAFT_BOTTOM, R_SHAFT_TOP = 0.02, 0.03
HEAD_Z0 = 1.18                        # le pied de la tete
HEAD_LEN = 0.92
HEAD_HALF_W = 0.16
HEAD_RIDGE = 0.032                    # epaisseur a l'arete centrale
BLADES_PER_SIDE = 8

# ---------------------------------------------------------------- la hampe
def shaft():
    bm = bmesh.new()
    n = 14
    rings = []
    for i in range(n + 1):
        u = i / n
        z = SHAFT_Z0 + (SHAFT_Z1 - SHAFT_Z0) * u
        r = R_SHAFT_BOTTOM + (R_SHAFT_TOP - R_SHAFT_BOTTOM) * u
        # un bois legerement irregulier
        r *= 1 + 0.05 * math.sin(u * 23.0) * (1 - u)
        ring = [bm.verts.new((r * math.cos(a), r * math.sin(a), z)) for a in [k * 2 * math.pi / 12 for k in range(12)]]
        rings.append(ring)
    for i in range(n):
        for k in range(12):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % 12], rings[i + 1][(k + 1) % 12], rings[i + 1][k]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    return finish("Shaft", bm, MAT_WOOD, smooth=True)
shaft()

# ---------------------------------------------------------------- la tete : lame lenticulaire a arete
def head_half_width(u):
    """Demi-largeur de la feuille a la station u (0 pied .. 1 pointe)."""
    if u < 0.12:
        return 0.06 + (HEAD_HALF_W * 0.85 - 0.06) * (u / 0.12)
    if u < 0.42:
        return HEAD_HALF_W * (0.85 + 0.15 * ((u - 0.12) / 0.3))
    v = (u - 0.42) / 0.58
    return HEAD_HALF_W * (1 - v) ** 0.8 * (1 - 0.15 * v)

def head():
    bm = bmesh.new()
    stations = 22
    rows = []
    for i in range(stations):
        u = i / (stations - 1)
        z = HEAD_Z0 + HEAD_LEN * u
        w = head_half_width(u)
        t = HEAD_RIDGE * (1 - u) ** 0.6 + 0.004
        if i == stations - 1:
            tip = bm.verts.new((0, 0, z + 0.02))
            rows.append([tip, tip, tip, tip])
            continue
        L = bm.verts.new((-w, 0, z)); T = bm.verts.new((0, t, z)); R = bm.verts.new((w, 0, z)); B = bm.verts.new((0, -t, z))
        rows.append([L, T, R, B])
    for i in range(stations - 1):
        a, b = rows[i], rows[i + 1]
        for k in range(4):
            k2 = (k + 1) % 4
            if b[0] is b[1]:
                bm.faces.new((a[k], a[k2], b[0]))
            else:
                bm.faces.new((a[k], a[k2], b[k2], b[k]))
    bm.faces.new(rows[0][::-1])
    return finish("Head", bm, MAT_HEAD, smooth=False)
head()

# ---------------------------------------------------------------- les lames d'obsidienne
def blade(name, side, u, length, out, tilt):
    """Un prisme triangulaire fin : la base enchassee dans le bord, la
    pointe vers l'exterieur, legerement couchee vers la pointe de la lance."""
    bm = bmesh.new()
    z = HEAD_Z0 + HEAD_LEN * u
    w = head_half_width(u)
    x0 = side * (w - 0.02)
    half = length / 2
    th = 0.011
    # triangle dans le plan XZ, epaisseur en Y ; le sommet exterieur decale vers +z (barbe)
    base_lo = (x0, z - half); base_hi = (x0, z + half); apex = (side * (w + out), z + half * 0.35 + tilt)
    a = [bm.verts.new((x, -th, zz)) for x, zz in (base_lo, base_hi, apex)]
    b = [bm.verts.new((x, th, zz)) for x, zz in (base_lo, base_hi, apex)]
    bm.faces.new(a); bm.faces.new(b[::-1])
    for i in range(3):
        bm.faces.new((a[(i + 1) % 3], a[i], b[i], b[(i + 1) % 3]))
    return finish(name, bm, MAT_OBSIDIAN, smooth=False)

for side in (-1, 1):
    for i in range(BLADES_PER_SIDE):
        u = 0.1 + i * (0.82 / BLADES_PER_SIDE)
        length = 0.085 * (1 - 0.35 * (u - 0.1))
        out = 0.05 + random.uniform(-0.008, 0.008)
        blade(f"Blade{'L' if side < 0 else 'R'}{i}", side, u, length, out, random.uniform(0.0, 0.012))

# ---------------------------------------------------------------- virole et ligatures
def torus(name, z, radius, tube, mat, seg=16, rings=6):
    bm = bmesh.new()
    verts = []
    for i in range(seg):
        a = i * 2 * math.pi / seg
        row = []
        for j in range(rings):
            b = j * 2 * math.pi / rings
            r = radius + tube * math.cos(b)
            row.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z + tube * math.sin(b))))
        verts.append(row)
    for i in range(seg):
        for j in range(rings):
            bm.faces.new((verts[i][j], verts[(i + 1) % seg][j], verts[(i + 1) % seg][(j + 1) % rings], verts[i][(j + 1) % rings]))
    return finish(name, bm, mat, smooth=True)

def cylinder(name, z0, z1, r0, r1, mat, sides=12):
    bm = bmesh.new()
    lo = [bm.verts.new((r0 * math.cos(a), r0 * math.sin(a), z0)) for a in [k * 2 * math.pi / sides for k in range(sides)]]
    hi = [bm.verts.new((r1 * math.cos(a), r1 * math.sin(a), z1)) for a in [k * 2 * math.pi / sides for k in range(sides)]]
    for k in range(sides):
        bm.faces.new((lo[k], lo[(k + 1) % sides], hi[(k + 1) % sides], hi[k]))
    bm.faces.new(lo[::-1]); bm.faces.new(hi)
    return finish(name, bm, mat, smooth=True)

# La virole : un manchon qui tient la tete sur la hampe.
cylinder("Ferrule", HEAD_Z0 - 0.16, HEAD_Z0 + 0.08, 0.05, 0.062, MAT_BINDING)
# Les ligatures : cordelette enroulee, sous la virole et au pommeau.
for i in range(5):
    torus(f"Binding{i}", HEAD_Z0 - 0.2 - i * 0.026, 0.031, 0.008, MAT_BINDING)
for i in range(3):
    torus(f"Pommel{i}", SHAFT_Z0 + 0.08 + i * 0.026, 0.024, 0.007, MAT_BINDING)

# ---------------------------------------------------------------- les plumes sous la tete
def feather(name, z, angle, length, mat):
    """Une plume : une lame fine et souple, pendante, un peu vrillee."""
    bm = bmesh.new()
    n = 6
    rows = []
    for i in range(n):
        u = i / (n - 1)
        w = 0.022 * math.sin(math.pi * (0.15 + 0.85 * u)) + 0.003
        # pend vers le bas en s'ecartant de la hampe
        rad = 0.05 + 0.13 * u
        zz = z - 0.34 * u * u - 0.02 * u
        cx, cy = rad * math.cos(angle), rad * math.sin(angle)
        # largeur perpendiculaire a la direction radiale
        px, py = -math.sin(angle) * w, math.cos(angle) * w
        rows.append((bm.verts.new((cx - px, cy - py, zz)), bm.verts.new((cx + px, cy + py, zz))))
    for i in range(n - 1):
        bm.faces.new((rows[i][0], rows[i][1], rows[i + 1][1], rows[i + 1][0]))
    return finish(name, bm, mat, smooth=True)

for k in range(7):
    feather(f"Feather{k}", HEAD_Z0 - 0.3, k * 2 * math.pi / 7 + 0.3, 0.3, MAT_FEATHER)

# ---------------------------------------------------------------- fusion en un seul objet
bpy.ops.object.select_all(action="DESELECT")
for ob in parts: ob.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
mesh_ob = bpy.context.view_layer.objects.active
mesh_ob.name = "Tepoztopilli"
# Plumes et lames : deux faces (plans fins) ; le reste est ferme.
tris = sum(len(p.vertices) - 2 for p in mesh_ob.data.polygons)

# ================================================================ EXPORT
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format="GLB", export_animations=False, export_apply=True, use_selection=False, export_materials="EXPORT")

# ================================================================ RENDUS
os.makedirs(OUT_DIR, exist_ok=True)
try:
    scene.render.engine = "BLENDER_EEVEE"
except Exception:
    scene.render.engine = "BLENDER_WORKBENCH"
scene.render.resolution_x, scene.render.resolution_y = 1400, 900
try:
    scene.view_settings.view_transform = "Standard"
except Exception:
    pass
world = bpy.data.worlds.new("W"); scene.world = world; world.color = (0.55, 0.6, 0.7)
for name, loc, energy, colr in (("Key", (2, -3, 4), 900, (1.0, 0.97, 0.9)), ("Rim", (-3, 3, 2), 500, (1.0, 0.7, 0.4)), ("Fill", (3, 3, -1), 300, (0.6, 0.75, 1.0))):
    ld = bpy.data.lights.new(name, "POINT"); ld.energy = energy; ld.color = colr
    lo = bpy.data.objects.new(name, ld); col.objects.link(lo); lo.location = loc
cam_data = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_data); col.objects.link(cam); scene.camera = cam
cam_data.lens = 60
def look_at(obj, at):
    d = (Vector(at) - obj.location).normalized()
    obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
views = {"face": ((0.0, -3.6, 0.2), (0, 0, 0.1)), "head": ((0.5, -1.6, 1.2), (0, 0, 1.45)), "three-quarter": ((2.4, -2.6, 1.4), (0, 0, 0.6))}
for name, (loc, at) in views.items():
    cam.location = loc
    look_at(cam, at)
    scene.render.filepath = os.path.join(OUT_DIR, f"tepoztopilli-{name}.png")
    bpy.ops.render.render(write_still=True)
print("OK tris", tris, "->", OUT_GLB)
