"""
Le TLACOCHTLI modelise dans Blender (pilote sans interface), 07/09/2026 :
le dard de propulseur (atlatl) mexica, celui que la Leyenda de los Soles
met dans les mains de Tlahuizcalpantecuhtli et du soleil. Une hampe
fine et longue, une pointe d'obsidienne taillee en feuille (arete
centrale, bords legerement irreguliers comme une taille), des ligatures
sous la pointe, trois pennes d'empennage, une encoche.
Sur le site c'est « le dard de feu » du soleil (page Services) : les
matieres sont posees dans three (feu additif), ici les materiaux ne
servent qu'a nommer : Shaft, Point, Binding, Fletch.

Axe du dard = +Z (la pointe en haut). L'exporteur glTF convertit en
Y-haut : sur le site, l'axe est +Y.

Usage :  blender --background --python tlacochtli.py -- <sortie.glb> <dossier_rendus>
"""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT_GLB = args[0] if args else os.path.join(os.path.dirname(os.path.abspath(__file__)), "tlacochtli.glb")
OUT_DIR = args[1] if len(args) > 1 else os.path.dirname(os.path.abspath(__file__))
random.seed(3)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = bpy.data.collections.new("Tlacochtli"); scene.collection.children.link(col)

def material(name, color, rough=0.6, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    m.diffuse_color = (*color, 1); m.roughness = rough; m.metallic = metal
    return m

MAT_SHAFT = material("Shaft", (0.45, 0.24, 0.09), rough=0.7)
MAT_POINT = material("Point", (0.03, 0.02, 0.03), rough=0.15, metal=0.1)
MAT_BINDING = material("Binding", (0.25, 0.1, 0.05), rough=0.9)
MAT_FLETCH = material("Fletch", (0.6, 0.1, 0.06), rough=0.8)
MATS = [MAT_SHAFT, MAT_POINT, MAT_BINDING, MAT_FLETCH]
parts = []

def finish(name, bm, mat, smooth=False):
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    for m in MATS: ob.data.materials.append(m)
    idx = MATS.index(mat)
    for p in ob.data.polygons: p.material_index = idx; p.use_smooth = smooth
    col.objects.link(ob); parts.append(ob); return ob

# ---------------------------------------------------------------- dimensions
# PROPORTIONS HISTORIQUES (Sylvain, 07/09 : « je veux un dard historique,
# ne fait pas de redimensionnement demesure »). Echelle du site : 1 u = 1 m
# (le cerf fait ~2 u de la tete au sol). Un dard d'atlatl mesure 1,5 a 2 m,
# hampe de 1,2 a 1,5 cm de diametre, pointe d'obsidienne de 10 a 15 cm de
# long sur 5 a 6 cm de large, empennage de 20 a 25 cm. Rien n'est grossi
# pour la lisibilite : ce sont les effets qui sont baisses.
Z0, Z1 = -0.9, 0.78          # la hampe, 1,68 m
R0, R1 = 0.006, 0.0075       # 1,2 a 1,5 cm de diametre
POINT_Z0, POINT_LEN = 0.76, 0.14   # pointe de 14 cm
POINT_HALF_W, POINT_RIDGE = 0.029, 0.008   # 5,8 cm de large, 1,6 cm d'epaisseur

def ring(bm, z, r, sides=10, jitter=0.0):
    return [bm.verts.new(((r + random.uniform(-jitter, jitter)) * math.cos(a), (r + random.uniform(-jitter, jitter)) * math.sin(a), z)) for a in [k * 2 * math.pi / sides for k in range(sides)]]

def loft(bm, rings, close_bottom=True, close_top=True):
    n = len(rings[0])
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        for k in range(n):
            bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))
    if close_bottom: bm.faces.new(rings[0][::-1])
    if close_top: bm.faces.new(rings[-1])

# ---------------------------------------------------------------- la hampe
bm = bmesh.new()
rings = [ring(bm, Z0 + (Z1 - Z0) * i / 12, R0 + (R1 - R0) * i / 12) for i in range(13)]
loft(bm, rings)
finish("Shaft", bm, MAT_SHAFT, smooth=True)

# ---------------------------------------------------------------- la pointe d'obsidienne taillee
def point_half_width(u):
    if u < 0.1: return POINT_HALF_W * 0.55 * (u / 0.1) + 0.006
    if u < 0.35: return POINT_HALF_W * (0.55 + 0.45 * ((u - 0.1) / 0.25))
    v = (u - 0.35) / 0.65
    return POINT_HALF_W * (1 - v) ** 0.75

bm = bmesh.new()
stations = 16
rows = []
for i in range(stations):
    u = i / (stations - 1)
    z = POINT_Z0 + POINT_LEN * u
    w = point_half_width(u)
    t = POINT_RIDGE * (1 - u) ** 0.5 + 0.0015
    if i == stations - 1:
        tip = bm.verts.new((0, 0, z + 0.01)); rows.append([tip] * 4); continue
    # bords legerement irreguliers : les enlevements de la taille
    jl, jr = random.uniform(-0.003, 0.003), random.uniform(-0.003, 0.003)
    rows.append([bm.verts.new((-w + jl, 0, z)), bm.verts.new((0, t, z)), bm.verts.new((w + jr, 0, z)), bm.verts.new((0, -t, z))])
for i in range(stations - 1):
    a, b = rows[i], rows[i + 1]
    for k in range(4):
        k2 = (k + 1) % 4
        if b[0] is b[1]: bm.faces.new((a[k], a[k2], b[0]))
        else: bm.faces.new((a[k], a[k2], b[k2], b[k]))
bm.faces.new(rows[0][::-1])
finish("Point", bm, MAT_POINT, smooth=False)

# ---------------------------------------------------------------- ligatures sous la pointe et a l'empennage
def torus(name, z, radius, tube, mat, seg=12, rr=5):
    bm = bmesh.new()
    verts = []
    for i in range(seg):
        a = i * 2 * math.pi / seg
        verts.append([bm.verts.new(((radius + tube * math.cos(b)) * math.cos(a), (radius + tube * math.cos(b)) * math.sin(a), z + tube * math.sin(b))) for b in [j * 2 * math.pi / rr for j in range(rr)]])
    for i in range(seg):
        for j in range(rr):
            bm.faces.new((verts[i][j], verts[(i + 1) % seg][j], verts[(i + 1) % seg][(j + 1) % rr], verts[i][(j + 1) % rr]))
    return finish(name, bm, mat, smooth=True)

for i in range(6): torus(f"BindPoint{i}", POINT_Z0 - 0.01 - i * 0.009, R1 + 0.001, 0.003, MAT_BINDING)
for i in range(4): torus(f"BindFletch{i}", Z0 + 0.32 + i * 0.011, R0 + 0.0015, 0.003, MAT_BINDING)
for i in range(4): torus(f"BindNock{i}", Z0 + 0.05 + i * 0.011, R0 + 0.0015, 0.003, MAT_BINDING)

# ---------------------------------------------------------------- l'empennage : trois pennes
def vane(name, angle):
    """Une penne : une lame fine le long de la hampe, qui monte puis retombe,
    legerement vrillee, avec des crans (les barbes) sur le bord."""
    bm = bmesh.new()
    n = 14
    z_a, z_b = Z0 + 0.07, Z0 + 0.29  # empennage de 22 cm
    inner, outer = [], []
    for i in range(n):
        u = i / (n - 1)
        z = z_a + (z_b - z_a) * u
        h = 0.028 * math.sin(math.pi * u) ** 0.7 * (1 - 0.25 * u)  # penne de ~3 cm de haut
        if i % 3 == 2: h *= 0.88  # un cran dans le bord
        twist = angle + 0.18 * (u - 0.5)
        cx, cy = R0 * math.cos(angle), R0 * math.sin(angle)
        ox, oy = (R0 + h) * math.cos(twist), (R0 + h) * math.sin(twist)
        inner.append(bm.verts.new((cx, cy, z)))
        outer.append(bm.verts.new((ox, oy, z)))
    for i in range(n - 1):
        bm.faces.new((inner[i], inner[i + 1], outer[i + 1], outer[i]))
    return finish(name, bm, MAT_FLETCH, smooth=True)

for k in range(3): vane(f"Vane{k}", k * 2 * math.pi / 3 + 0.4)

# ---------------------------------------------------------------- l'encoche : un petit renflement fendu
bm = bmesh.new()
rings = [ring(bm, Z0 - 0.03, R0 * 0.9), ring(bm, Z0 - 0.01, R0 * 1.25), ring(bm, Z0 + 0.03, R0 * 1.25), ring(bm, Z0 + 0.05, R0)]
loft(bm, rings)
finish("Nock", bm, MAT_SHAFT, smooth=True)

# ---------------------------------------------------------------- fusion, export, rendus
bpy.ops.object.select_all(action="DESELECT")
for ob in parts: ob.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
mesh_ob = bpy.context.view_layer.objects.active
mesh_ob.name = "Tlacochtli"
tris = sum(len(p.vertices) - 2 for p in mesh_ob.data.polygons)

os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format="GLB", export_animations=False, export_apply=True, use_selection=False, export_materials="EXPORT")

os.makedirs(OUT_DIR, exist_ok=True)
try: scene.render.engine = "BLENDER_EEVEE"
except Exception: scene.render.engine = "BLENDER_WORKBENCH"
scene.render.resolution_x, scene.render.resolution_y = 1400, 900
try: scene.view_settings.view_transform = "Standard"
except Exception: pass
world = bpy.data.worlds.new("W"); scene.world = world; world.color = (0.55, 0.6, 0.7)
for name, loc, energy, colr in (("Key", (1.5, -2, 2.5), 500, (1.0, 0.97, 0.9)), ("Rim", (-2, 2, 1), 300, (1.0, 0.7, 0.4)), ("Fill", (2, 2, -1), 200, (0.6, 0.75, 1.0))):
    ld = bpy.data.lights.new(name, "POINT"); ld.energy = energy; ld.color = colr
    lo = bpy.data.objects.new(name, ld); col.objects.link(lo); lo.location = loc
cam_data = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_data); col.objects.link(cam); scene.camera = cam
cam_data.lens = 70
def look_at(obj, at):
    d = (Vector(at) - obj.location).normalized()
    obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
views = {"face": ((0.0, -2.4, 0.0), (0, 0, 0.0)), "point": ((0.25, -0.7, 0.75), (0, 0, 0.88)), "fletch": ((0.3, -0.7, -0.6), (0, 0, -0.72))}
for name, (loc, at) in views.items():
    cam.location = loc; look_at(cam, at)
    scene.render.filepath = os.path.join(OUT_DIR, f"tlacochtli-{name}.png")
    bpy.ops.render.render(write_still=True)
print("OK tris", tris, "->", OUT_GLB)
