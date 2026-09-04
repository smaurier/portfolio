"""
Le XIUHCOATL modelise dans Blender (pilote sans interface), 04/09/2026,
troisieme passe, "a base de beaucoup de refs" (Sylvain).

References etudiees (docs/da/sud-sources.md + planche du scratchpad) :
- la sculpture complete du British Museum (proportions : queue-signe ~22 %,
  corps ~48 %, tete ~30 % ; corps en BLOCS rectangulaires a elements de
  flamme ; queue = bandes plissees puis trapeze traverse du rayon) ;
- la tete monumentale du Musee national d'anthropologie (2,15 m) et celle
  du Templo Mayor : tete = BLOC massif, plus haut que long ; la VOLUTE du
  museau s'enroule au-dessus de l'oeil ; l'OEIL est un grand disque cercle
  sous une arcade ; une BANDE DE PERLES (les yeux de la nuit, les etoiles)
  court sur l'arcade du museau a la nuque et une autre le long de la
  machoire ; la CRETE est une rangee de gros BOUTONS ronds (les etoiles)
  posee sur une bande de rectangles empiles (le papier plisse) ; les CROCS
  sont des crochets recourbes sous le museau ;
- Mexicolore / Arqueologia Mexicana : courtes pattes avant a griffes,
  segments rectangulaires ou trapezoidaux avec elements de flamme.
Rien n'est repris des scans : tout est construit ici. Style : low poly a
aretes franches (ombrage plat), comme la pierre.

Axe du corps = +X (museau devant), Z = haut (Blender). L'exporteur glTF
convertit en Y-haut pour le site.

Usage :  blender --background --python xiuhcoatl.py -- <sortie.glb> <dossier_rendus>
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT_GLB = args[0] if args else os.path.join(os.path.dirname(os.path.abspath(__file__)), "xiuhcoatl.glb")
OUT_DIR = args[1] if len(args) > 1 else os.path.dirname(os.path.abspath(__file__))

L = 4.2
R = 0.2
SEGMENTS = 6
TAIL_LEN, BODY_LEN, HEAD_LEN = L * 0.22, L * 0.46, L * 0.32
TAIL_START = -L / 2
BODY_START = TAIL_START + TAIL_LEN
HEAD_START = BODY_START + BODY_LEN

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection

# ---------------------------------------------------------------- materiaux
def material(name, color, emission=None, strength=0.0, rough=0.6, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = strength
    shown = tuple(min(1.0, c + (e * min(1.0, strength) * 0.5 if emission else 0)) for c, e in zip(color, emission or color))
    m.diffuse_color = (*shown, 1); m.roughness = rough; m.metallic = metal
    return m

MAT_SCALE = material("xiuh_scale", (0.05, 0.40, 0.48), (0.0, 0.22, 0.30), 0.3, rough=0.5, metal=0.1)   # turquoise
MAT_FIRE = material("xiuh_fire", (0.92, 0.28, 0.02), (1.0, 0.36, 0.03), 0.9, rough=0.8)                # braise
MAT_BONE = material("xiuh_bone", (0.86, 0.80, 0.66), None, 0.0, rough=0.75)                            # os, perles, griffes
MAT_MOUTH = material("xiuh_mouth", (0.08, 0.03, 0.04), (0.35, 0.05, 0.0), 0.8, rough=0.9)            # gueule
MATS = [MAT_SCALE, MAT_FIRE, MAT_BONE, MAT_MOUTH]
parts = []

def finish(name, bm, mat, loc=(0, 0, 0), rot=None):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    for m in MATS: ob.data.materials.append(m)
    idx = MATS.index(mat)
    for p in ob.data.polygons: p.material_index = idx; p.use_smooth = False
    ob.location = loc
    if rot: ob.rotation_euler = rot
    col.objects.link(ob); parts.append(ob); return ob

def box(name, center, size, mat, bevel=0.0, rot=None):
    """Boite chanfreinee (le chanfrein donne les aretes de pierre taillee)."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=bm.verts[:] + bm.edges[:], offset=bevel, segments=1, affect="EDGES")
    return finish(name, bm, mat, loc=center, rot=rot)

def prism(name, verts2d, half_thick, mat, loc=(0, 0, 0), rot=None):
    """Plaque : polygone (x, z) extrude en y de -half_thick a +half_thick."""
    bm = bmesh.new()
    a = [bm.verts.new((x, -half_thick, z)) for x, z in verts2d]
    b = [bm.verts.new((x, half_thick, z)) for x, z in verts2d]
    bm.faces.new(a); bm.faces.new(b[::-1])
    n = len(a)
    for i in range(n): bm.faces.new((a[(i + 1) % n], a[i], b[i], b[(i + 1) % n]))
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return finish(name, bm, mat, loc=loc, rot=rot)

def tube(name, points, radii, bevel, mat, res_u=4, sides_res=1, flat_y=1.0, flat_z=1.0):
    """Tube le long d'une courbe de Bezier a rayon variable (8 cotes)."""
    cu = bpy.data.curves.new(name, type="CURVE"); cu.dimensions = "3D"
    cu.bevel_depth = bevel; cu.bevel_resolution = sides_res; cu.resolution_u = res_u; cu.use_fill_caps = True
    sp = cu.splines.new("BEZIER"); sp.bezier_points.add(len(points) - 1)
    for p, co, r in zip(sp.bezier_points, points, radii):
        p.co = co; p.handle_left_type = p.handle_right_type = "AUTO"; p.radius = r
    ob = bpy.data.objects.new(name, cu); col.objects.link(ob)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.convert(target="MESH"); ob.select_set(False)
    for m in MATS: ob.data.materials.append(m)
    idx = MATS.index(mat)
    for p in ob.data.polygons: p.material_index = idx; p.use_smooth = False
    if flat_y != 1.0 or flat_z != 1.0:
        for v in ob.data.vertices: v.co.y *= flat_y; v.co.z *= flat_z
    parts.append(ob); return ob

def cone(name, base, tip, radius, mat, sides=6):
    bm = bmesh.new()
    axis = (Vector(tip) - Vector(base)).normalized()
    ref = Vector((0, 0, 1)) if abs(axis.z) < 0.9 else Vector((1, 0, 0))
    u = axis.cross(ref).normalized(); v = u.cross(axis)
    ring = [bm.verts.new(Vector(base) + (u * math.cos(a) + v * math.sin(a)) * radius) for a in [i / sides * 2 * math.pi for i in range(sides)]]
    t = bm.verts.new(tip)
    bm.faces.new(ring[::-1])
    for i in range(sides): bm.faces.new((ring[i], ring[(i + 1) % sides], t))
    bm.normal_update()
    return finish(name, bm, mat)

def ball(name, center, rx, ry, rz, mat, seg=8, rings=5):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    bmesh.ops.scale(bm, vec=(rx, ry, rz), verts=bm.verts)
    return finish(name, bm, mat, loc=center)

def disc(name, center, radius, thick, mat, sides=12, axis="Y"):
    """Disque epais dont l'axe est Y (pose sur un flanc)."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=sides, radius1=radius, radius2=radius, depth=thick)
    rot = (math.pi / 2, 0, 0) if axis == "Y" else None
    return finish(name, bm, mat, loc=center, rot=rot)

def ring_of_beads(name, arc_fn, count, bead, mat):
    """Perles (les yeux de la nuit) le long d'une courbe arc_fn(t)->(x,y,z)."""
    for i in range(count):
        ball(f"{name}{i}", arc_fn((i + 0.5) / count), bead, bead * 0.7, bead, mat, seg=6, rings=4)

# ================================================================ CORPS
# Blocs rectangulaires chanfreines (la sculpture), en legere alternance de
# hauteur ; entre deux blocs, une gorge de feu plus etroite.
seg_len = BODY_LEN / SEGMENTS
for s in range(SEGMENTS):
    x0 = BODY_START + s * seg_len
    taper = 0.8 + 0.2 * math.sin((s + 0.5) / SEGMENTS * math.pi)
    w, h = R * 2.0 * taper, R * 1.7 * taper
    box(f"Seg{s}", (x0 + seg_len * 0.5, 0, 0), (seg_len * 0.8, w, h), MAT_SCALE, bevel=R * 0.12)
    # gorge de feu
    box(f"Groove{s}", (x0 + seg_len * 0.985, 0, 0), (seg_len * 0.22, w * 0.78, h * 0.78), MAT_FIRE)
    # element de flamme du segment : deux lobes penches vers l'arriere, sur le dos
    fx = x0 + seg_len * 0.5
    fh = R * (0.55 + 0.3 * math.sin((s + 0.5) / SEGMENTS * math.pi))
    b0 = h * 0.48
    prism(f"Flame{s}", [(-seg_len * 0.34, b0), (seg_len * 0.34, b0), (seg_len * 0.3, b0 + fh * 0.45), (seg_len * 0.05, b0 + fh * 0.5), (-seg_len * 0.12, b0 + fh * 0.95), (-seg_len * 0.3, b0 + fh * 1.0), (-seg_len * 0.4, b0 + fh * 0.6)], R * 0.09, MAT_FIRE, loc=(fx, 0, 0))
    # plaques laterales de papier plisse (deux rectangles empiles) sur les flancs
    for side in (1, -1):
        for k in range(2):
            box(f"Pleat{s}{side}{k}", (fx - seg_len * 0.1, side * (w * 0.5 + R * 0.05), -h * 0.05 + k * h * 0.28), (seg_len * 0.34, R * 0.1, h * 0.2), MAT_BONE)

# ================================================================ QUEUE
band = TAIL_LEN * 0.15
for i in range(3):
    x = BODY_START - band * (i + 0.55)
    k = 0.66 - i * 0.07
    box(f"TailBand{i}", (x, 0, R * 0.15), (band * 0.7, R * 1.4 * k, R * 2.6 * k), MAT_SCALE, bevel=R * 0.06)
    if i < 2: box(f"TailGroove{i}", (x - band * 0.5, 0, R * 0.1), (band * 0.24, R * 1.0 * k, R * 1.9 * k), MAT_FIRE)
yx = TAIL_START + TAIL_LEN * 0.27
trapH = R * 2.1
prism("YearTrapeze", [(yx + TAIL_LEN * 0.2, -R * 0.4), (yx - TAIL_LEN * 0.2, -R * 0.4), (yx - TAIL_LEN * 0.36, trapH), (yx + TAIL_LEN * 0.36, trapH)], R * 0.2, MAT_FIRE)
prism("YearRay", [(yx - TAIL_LEN * 0.18, trapH * 0.28), (yx + TAIL_LEN * 0.18, trapH * 0.28), (yx, trapH * 1.55)], R * 0.28, MAT_BONE)
for i in range(3):
    box(f"YearBand{i}", (yx, 0, trapH * (0.12 + i * 0.24)), (TAIL_LEN * 0.56, R * 0.5, R * 0.09), MAT_BONE)

# ================================================================ TETE
skull_len = HEAD_LEN * 0.5
HX = HEAD_START                       # base du crane (jonction du cou)
HW, HH = R * 2.3, R * 2.6            # largeur, hauteur du bloc de tete
HZ = R * 0.25                        # le crane est un peu plus haut que le corps
# Cou court, bloc intermediaire.
box("Neck", (HX - seg_len * 0.15, 0, 0), (seg_len * 0.34, R * 1.7, R * 1.5), MAT_SCALE, bevel=R * 0.08)
# Crane : bloc massif chanfreine, plus haut que le corps.
skull = box("Skull", (HX + skull_len * 0.5, 0, HZ), (skull_len, HW, HH), MAT_SCALE, bevel=R * 0.22)
# Bande de rectangles empiles au sommet (papier plisse) puis la crete de boutons.
crest_z = HZ + HH * 0.5
for i in range(4):
    box(f"CrestBand{i}", (HX + skull_len * (0.15 + i * 0.22), 0, crest_z + R * 0.12), (skull_len * 0.18, HW * 0.7, R * 0.24), MAT_BONE)
for i in range(5):
    bx = HX + skull_len * (0.02 + i * 0.19)
    ball(f"Star{i}", (bx, 0, crest_z + R * 0.62), R * 0.36, R * 0.55, R * 0.36, MAT_FIRE, seg=8, rings=5)
# Arcade sourciliere de chaque cote, avec la bande de perles qui va du
# museau a la nuque en passant au-dessus de l'oeil.
eye_c = (HX + skull_len * 0.6, HW * 0.5, HZ + HH * 0.05)
for side in (1, -1):
    ey = side * (HW * 0.5)
    # arcade : demi-anneau en plaque au-dessus de l'oeil
    prism(f"Brow{side}", [(-R * 0.75, 0), (R * 0.75, 0), (R * 0.75, R * 0.25), (R * 0.35, R * 0.62), (-R * 0.35, R * 0.62), (-R * 0.75, R * 0.25)], R * 0.09, MAT_SCALE, loc=(eye_c[0], ey + side * R * 0.05, eye_c[2] + R * 0.45), rot=(math.pi / 2, 0, 0))
    # oeil : grand disque cercle, pupille bombee, enfonce dans le flanc
    disc(f"EyeRim{side}", (eye_c[0], ey + side * R * 0.06, eye_c[2]), R * 0.5, R * 0.14, MAT_BONE, sides=14)
    disc(f"EyeIris{side}", (eye_c[0], ey + side * R * 0.16, eye_c[2]), R * 0.34, R * 0.08, MAT_MOUTH, sides=12)
    ball(f"Pupil{side}", (eye_c[0], ey + side * R * 0.2, eye_c[2]), R * 0.16, R * 0.08, R * 0.16, MAT_BONE, seg=8, rings=5)
    # bande de perles : arc du museau (devant, bas) a la nuque (derriere, haut)
    def arc(t, side=side):
        a = math.pi * (0.05 + 0.9 * t)  # devant -> derriere
        cx = eye_c[0] + math.cos(math.pi - a) * R * 1.05
        cz = eye_c[2] + math.sin(a) * R * 1.05 + R * 0.05
        return (cx, side * (HW * 0.5 + R * 0.02), cz)
    ring_of_beads(f"Beads{side}", arc, 9, R * 0.11, MAT_BONE)
    # deuxieme bande de perles le long de la machoire superieure
    def jawline(t, side=side):
        return (HX + skull_len * (0.15 + 0.85 * t), side * (HW * 0.5 + R * 0.02), HZ - HH * 0.32)
    ring_of_beads(f"JawBeads{side}", jawline, 6, R * 0.1, MAT_BONE)

# Museau : machoire superieure massive qui avance, puis la VOLUTE qui monte
# et s'enroule au-dessus de l'oeil (le centre de la spirale est au-dessus
# de l'oeil, comme sur la sculpture).
snout_len = HEAD_LEN * 0.5
mx0 = HX + skull_len
box("UpperJaw", (mx0 + snout_len * 0.22, 0, HZ - HH * 0.12), (snout_len * 0.46, HW * 0.86, HH * 0.42), MAT_SCALE, bevel=R * 0.12)
vol_pts, vol_rad = [], []
# Le museau part du bout de la machoire superieure, monte, et s'enroule en
# spirale OUVERTE dont le centre est au-dessus de l'oeil ; il s'effile
# jusqu'a une pointe qui redescend vers l'arcade (comme la sculpture).
cx_spiral = eye_c[0] + R * 0.15
cz_spiral = HZ + HH * 0.55
for i in range(15):
    u = i / 14
    if u < 0.25:
        k = u / 0.25
        c = (mx0 + snout_len * (0.44 + k * 0.28), 0, HZ - HH * 0.1 + k * HH * 0.3)
    else:
        k = (u - 0.25) / 0.75
        a = -math.pi * 0.42 + k * math.pi * 1.62        # de l'avant-bas vers le haut, puis l'arriere, puis redescend
        rad = R * 1.35 * (1 - 0.45 * k)                   # la spirale se resserre
        c = (cx_spiral + math.sin(a) * rad + R * 0.9 * (1 - k), 0, cz_spiral - math.cos(a) * rad)
    vol_pts.append(c); vol_rad.append(0.95 * (1 - u * 0.7))
tube("Volute", vol_pts, vol_rad, R * 0.66, MAT_SCALE, res_u=3, flat_y=0.72)
# Perles sur la volute (les etoiles du museau)
for i in (3, 6, 9, 12):
    c = vol_pts[i]; k = vol_rad[i]
    for side in (1, -1):
        ball(f"VolBead{i}{side}", (c[0], side * R * 0.66 * k * 0.72, c[2]), R * 0.12, R * 0.08, R * 0.12, MAT_BONE, seg=6, rings=4)
# Machoire inferieure : coin ouvert vers le bas, gueule sombre, langue de feu.
jaw_len = snout_len * 0.62
jaw = prism("LowerJaw", [(0, 0), (jaw_len, -R * 0.35), (jaw_len * 0.95, -R * 0.85), (0, -R * 0.75)], HW * 0.4, MAT_SCALE, loc=(mx0 - skull_len * 0.35, 0, HZ - HH * 0.35))
prism("Mouth", [(0, 0), (jaw_len * 0.9, -R * 0.3), (jaw_len * 0.9, -R * 0.42), (0, -R * 0.12)], HW * 0.34, MAT_MOUTH, loc=(mx0 - skull_len * 0.3, 0, HZ - HH * 0.34))
prism("Tongue", [(0, 0.06 * R), (jaw_len * 1.15, -R * 0.25), (0, -0.06 * R)], R * 0.14, MAT_FIRE, loc=(mx0 + snout_len * 0.05, 0, HZ - HH * 0.42))
# Crocs : quatre crochets recourbes sous la machoire superieure, deux de chaque cote.
for side in (1, -1):
    for k, fx in enumerate((0.12, 0.34)):
        b = (mx0 + snout_len * fx, side * HW * (0.32 - k * 0.1), HZ - HH * 0.3)
        tube(f"Fang{side}{k}", [b, (b[0] + R * 0.08, b[1], b[2] - R * 0.45), (b[0] - R * 0.2, b[1], b[2] - R * 0.8)], [0.22, 0.16, 0.05], R, MAT_BONE, res_u=3)

# ================================================================ PATTES
lx = HEAD_START - BODY_LEN * 0.1
for side in (1, -1):
    hip = (lx, side * R * 0.5, -R * 0.4)
    knee = (lx + R * 0.35, side * R * 1.25, -R * 1.05)
    foot = (lx + R * 1.0, side * R * 1.2, -R * 1.5)
    tube(f"Leg{side}", [hip, knee, foot], [0.42, 0.34, 0.26], R, MAT_SCALE, res_u=3)
    box(f"Paw{side}", (foot[0] + R * 0.15, foot[1], foot[2] + R * 0.05), (R * 0.55, R * 0.5, R * 0.3), MAT_SCALE, bevel=R * 0.05)
    for g in (-1, 0, 1):
        cone(f"Claw{side}{g}", (foot[0] + R * 0.35, foot[1] + g * R * 0.17, foot[2]), (foot[0] + R * 0.85, foot[1] + g * R * 0.24, foot[2] - R * 0.2), R * 0.09, MAT_BONE, sides=5)

# ================================================================ JONCTION
# Le skinning automatique (bone heat) echoue sur ce mesh fait de dizaines
# de coques disjointes (constate : 0 poids sur 2524 sommets). On marque donc
# chaque piece avant la jonction (groupes "hint_*", fusionnes par nom au join)
# et on calcule les poids nous-memes plus bas.
JAW_Z = HZ - HH * 0.35
def hint_of(ob):
    n = ob.name
    if n.startswith(("LowerJaw", "JawBeads", "Tongue")): return "hint_jaw"
    if n.startswith(("Leg", "Paw", "Claw")): return "hint_leg"
    if n.startswith("Fang"):
        cz = sum((ob.matrix_world @ v.co).z for v in ob.data.vertices) / len(ob.data.vertices)
        if cz < JAW_Z: return "hint_jaw"
    return None
for ob in parts:
    h = hint_of(ob)
    if h: ob.vertex_groups.new(name=h).add(list(range(len(ob.data.vertices))), 1.0, "REPLACE")
bpy.ops.object.select_all(action="DESELECT")
for ob in parts: ob.select_set(True)
bpy.context.view_layer.objects.active = skull
bpy.ops.object.join()
mesh_ob = bpy.context.view_layer.objects.active
mesh_ob.name = "Xiuhcoatl"
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
tris = sum(len(p.vertices) - 2 for p in mesh_ob.data.polygons)

# ================================================================ SQUELETTE
arm = bpy.data.armatures.new("XiuhcoatlRig"); rig = bpy.data.objects.new("XiuhcoatlRig", arm); col.objects.link(rig)
bpy.context.view_layer.objects.active = rig; rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
SPINE = 9
xs = [TAIL_START + (HEAD_START - TAIL_START) * i / SPINE for i in range(SPINE + 1)]
prev = None; spine_bones = []
for i in range(SPINE):
    b = arm.edit_bones.new(f"spine{i:02d}"); b.head = (xs[i], 0, 0); b.tail = (xs[i + 1], 0, 0)
    if prev: b.parent = prev; b.use_connect = True
    prev = b; spine_bones.append(b.name)
head = arm.edit_bones.new("head"); head.head = (HEAD_START, 0, 0); head.tail = (mx0, 0, HZ); head.parent = prev; head.use_connect = True
snoutb = arm.edit_bones.new("snout"); snoutb.head = tuple(head.tail); snoutb.tail = (mx0 + snout_len * 0.5, 0, HZ); snoutb.parent = head; snoutb.use_connect = True
jawb = arm.edit_bones.new("jaw"); jawb.head = (mx0 - skull_len * 0.35, 0, HZ - HH * 0.35); jawb.tail = (mx0 + jaw_len * 0.5, 0, HZ - HH * 0.35 - R * 0.6); jawb.parent = head
leg_bones = []
for side, sname in ((1, "L"), (-1, "R")):
    hipb = arm.edit_bones.new(f"leg_{sname}_hip"); hipb.head = (lx, side * R * 0.5, -R * 0.4); hipb.tail = (lx + R * 0.35, side * R * 1.25, -R * 1.05)
    hipb.parent = arm.edit_bones[spine_bones[-1]]
    footb = arm.edit_bones.new(f"leg_{sname}_foot"); footb.head = tuple(hipb.tail); footb.tail = (lx + R * 1.0, side * R * 1.2, -R * 1.5); footb.parent = hipb; footb.use_connect = True
    leg_bones.append((hipb.name, footb.name))
bpy.ops.object.mode_set(mode="OBJECT")
mesh_ob.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type="ARMATURE_NAME")

# --- Poids proceduraux -----------------------------------------------------
# Corps : melange lisse entre os voisins le long de X (50/50 a l'articulation),
# machoire inferieure : os "jaw", pattes : melange hanche/pied selon la
# position le long de la patte.
axial = [(n, arm.bones[n].head.x, arm.bones[n].tail.x) for n in spine_bones] + [("head", arm.bones["head"].head.x, arm.bones["head"].tail.x), ("snout", arm.bones["snout"].head.x, arm.bones["snout"].tail.x)]
def axial_weights(x):
    if x <= axial[0][1]: return {axial[0][0]: 1.0}
    if x >= axial[-1][2]: return {axial[-1][0]: 1.0}
    for k, (name, h, t) in enumerate(axial):
        if h <= x <= t:
            u = (x - h) / (t - h)
            if u < 0.5 and k > 0: w = 0.5 - u; return {name: 1 - w, axial[k - 1][0]: w}
            if u > 0.5 and k < len(axial) - 1: w = u - 0.5; return {name: 1 - w, axial[k + 1][0]: w}
            return {name: 1.0}
    return {axial[-1][0]: 1.0}
def leg_weights(co):
    hipn, footn = leg_bones[0] if co.y > 0 else leg_bones[1]
    hb = arm.bones[hipn]; a = hb.head; d = hb.tail - hb.head
    t = max(0.0, min(1.0, (co - a).dot(d) / d.length_squared))
    if t < 0.35: return {hipn: 1.0}
    if t > 0.75: return {footn: 1.0}
    w = (t - 0.35) / 0.4; return {hipn: 1 - w, footn: w}
vgs = mesh_ob.vertex_groups
hint_jaw = vgs.get("hint_jaw"); hint_leg = vgs.get("hint_leg")
def in_group(v, g):
    return g is not None and any(ge.group == g.index and ge.weight > 0 for ge in v.groups)
for v in mesh_ob.data.vertices:
    if in_group(v, hint_jaw): w = {"jaw": 1.0}
    elif in_group(v, hint_leg): w = leg_weights(v.co)
    else: w = axial_weights(v.co.x)
    for name, val in w.items(): vgs[name].add([v.index], val, "REPLACE")
for g in (hint_jaw, hint_leg):
    if g: vgs.remove(g)

# ================================================================ ANIMATIONS
scene.render.fps = 24
for pb in rig.pose.bones: pb.rotation_mode = "XYZ"

def action(name, frames, fn):
    act = bpy.data.actions.new(name)
    rig.animation_data_create(); rig.animation_data.action = act
    for f in range(0, frames + 1, 2):
        fn(f, frames)
        for pb in rig.pose.bones: pb.keyframe_insert("rotation_euler", frame=f + 1)
    return act

def slither(f, frames):
    t = f / frames * 2 * math.pi
    for i, name in enumerate(spine_bones):
        rig.pose.bones[name].rotation_euler = (0.04 * math.sin(t * 2 - i * 0.9), 0, 0.26 * math.sin(t - i * 0.85))
    rig.pose.bones["head"].rotation_euler = (0.05 * math.sin(t * 2), 0, 0.10 * math.sin(t - SPINE * 0.85))
    rig.pose.bones["snout"].rotation_euler = (0.06 * math.sin(t * 2 + 1), 0, 0)
    rig.pose.bones["jaw"].rotation_euler = (0.12 + 0.1 * math.sin(t * 3), 0, 0)
    for k, (hipn, footn) in enumerate(leg_bones):
        ph = t + k * math.pi
        rig.pose.bones[hipn].rotation_euler = (0.45 * math.sin(ph), 0, 0)
        rig.pose.bones[footn].rotation_euler = (0.35 * math.sin(ph + 1.2), 0, 0)

def idle(f, frames):
    t = f / frames * 2 * math.pi
    for i, name in enumerate(spine_bones):
        rig.pose.bones[name].rotation_euler = (0.012 * math.sin(t - i * 0.5), 0, 0.05 * math.sin(t * 0.5 - i * 0.6))
    rig.pose.bones["head"].rotation_euler = (0.04 * math.sin(t), 0, 0.03 * math.sin(t * 0.7))
    rig.pose.bones["snout"].rotation_euler = (0.04 * math.sin(t + 0.5), 0, 0)
    rig.pose.bones["jaw"].rotation_euler = (0.08 + 0.06 * math.sin(t * 1.5), 0, 0)
    for k, (hipn, footn) in enumerate(leg_bones):
        rig.pose.bones[hipn].rotation_euler = (0.08 * math.sin(t + k), 0, 0)
        rig.pose.bones[footn].rotation_euler = (0.06 * math.sin(t + k + 1), 0, 0)

a_sl = action("Slither", 48, slither)
a_idle = action("Idle", 72, idle)
rig.animation_data.action = None
for act in (a_sl, a_idle):
    track = rig.animation_data.nla_tracks.new(); track.name = act.name; track.strips.new(act.name, 1, act)
scene.frame_end = 72

# ================================================================ EXPORT
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
mesh_ob.select_set(True); rig.select_set(True)
# export_apply=False : appliquer les modificateurs cuirait le modificateur
# Armature et ferait disparaitre le skin (constate : "skins 0" dans le GLB).
# use_selection=False : avec la selection, l'exporteur perdait le skin (skins 0
# malgre JOINTS_0/WEIGHTS_0) ; la scene ne contient alors que le mesh et le rig.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(os.path.dirname(OUT_GLB), "xiuhcoatl.blend"))
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format="GLB", export_animations=True, export_apply=False, use_selection=False, export_skins=True, export_nla_strips=True, export_def_bones=False)

# ================================================================ RENDUS
os.makedirs(OUT_DIR, exist_ok=True)
try:
    scene.render.engine = "BLENDER_EEVEE"
except Exception:
    scene.render.engine = "BLENDER_WORKBENCH"
scene.render.resolution_x, scene.render.resolution_y = 1400, 900
# Transformation de vue Standard : AgX/Filmic delavent les oranges satures en peche.
try:
    scene.view_settings.view_transform = "Standard"
except Exception:
    pass
world = bpy.data.worlds.new("W"); scene.world = world; world.color = (0.10, 0.09, 0.12)
for name, loc, energy, colr in (("Key", (2, -3, 8), 1600, (1.0, 0.97, 0.9)), ("Rim", (-5, 4, 3), 800, (1.0, 0.55, 0.25)), ("Fill", (4, 5, 1), 350, (0.5, 0.75, 0.9))):
    ld = bpy.data.lights.new(name, "POINT"); ld.energy = energy; ld.color = colr
    lo = bpy.data.objects.new(name, ld); col.objects.link(lo); lo.location = loc
cam_data = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_data); col.objects.link(cam); scene.camera = cam
cam_data.lens = 50
target = Vector((0.3, 0, 0.1))
def look_at(obj, at):
    d = (Vector(at) - obj.location).normalized()
    obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
views = {"side": (0.3, -6.4, 1.1), "three-quarter": (4.4, -4.6, 2.2), "front": (6.6, -1.4, 1.0), "head": (3.2, -2.2, 0.9)}
rig.animation_data.action = a_sl
scene.frame_set(13)
for name, loc in views.items():
    cam.location = loc
    look_at(cam, target if name != "head" else (HX + skull_len * 0.6, 0, HZ))
    scene.render.filepath = os.path.join(OUT_DIR, f"xiuhcoatl-{name}.png")
    bpy.ops.render.render(write_still=True)
unweighted = sum(1 for v in mesh_ob.data.vertices if not v.groups)
print("OK unweighted", unweighted, "tris", tris, "bones", len(rig.pose.bones), "->", OUT_GLB)
